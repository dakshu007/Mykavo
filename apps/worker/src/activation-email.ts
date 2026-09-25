/**
 * Hourly activation sweep - two emails that close the first-run loop:
 *
 *   1. "Baseline ready" - once per website, when its first baseline scan
 *      finishes. Baseline scans create no change events and so send no
 *      alert; without this, somebody adds a site, closes the tab, and never
 *      learns it worked. Only scans finished in the last 3 days qualify, so
 *      this never back-fills old websites.
 *
 *   2. "Add your first website" - ONE reminder, a day or more after signup,
 *      to an owner whose workspaces have no website. This one does reach
 *      existing accounts, newest first, a few a day.
 *
 * Both are budgeted (@mykavo/shared email-budget): the email plan has a hard
 * daily and monthly cap, and a reminder that uses up the day's quota would
 * make the next CRITICAL alert fail. Reminders only spend what alerts leave
 * over, and never more than ACTIVATION_REMINDERS_PER_DAY a day.
 *
 * Neither is sent to a workspace that switched email off. De-duplication
 * uses the Notification table (only a SENT row counts), like the welcome
 * email, so a crash between send and record costs at most one repeat.
 */

import { prisma } from "@mykavo/database";
import {
  BASELINE_READY_SUBJECT_PREFIX,
  FIRST_WEBSITE_NUDGE_SUBJECT,
  baselineReadyEmail,
  firstWebsiteNudgeEmail,
  sendEmail,
} from "@mykavo/email";
import {
  displayPersonName,
  emailAllowance,
  emailLimitsFromEnv,
  type EmailUsage,
} from "@mykavo/shared";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
const DAY_MS = 24 * 60 * 60 * 1000;
/** Spacing between sends - well under the provider's per-second limit. */
const GAP_MS = 700;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

/** Emails sent so far today and this month (UTC), read from the ledger. */
async function currentUsage(): Promise<EmailUsage> {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const sent = { channelType: "EMAIL" as const, status: "SENT" as const };
  const [sentToday, sentThisMonth, remindersToday] = await Promise.all([
    prisma.notification.count({ where: { ...sent, sentAt: { gte: dayStart } } }),
    prisma.notification.count({ where: { ...sent, sentAt: { gte: monthStart } } }),
    prisma.notification.count({
      where: { ...sent, subject: FIRST_WEBSITE_NUDGE_SUBJECT, sentAt: { gte: dayStart } },
    }),
  ]);
  return { sentToday, sentThisMonth, remindersToday };
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

async function sendBaselineReady(budget: number): Promise<number> {
  if (budget <= 0) return 0;
  const scans = await prisma.scan.findMany({
    where: {
      triggerType: "BASELINE",
      status: { in: ["COMPLETED", "PARTIAL"] },
      pagesScanned: { gt: 0 },
      completedAt: { gte: new Date(Date.now() - 3 * DAY_MS) },
      website: {
        notifications: {
          none: { subject: { startsWith: BASELINE_READY_SUBJECT_PREFIX }, status: "SENT" },
        },
      },
    },
    orderBy: { completedAt: "asc" },
    take: budget,
    select: {
      id: true,
      pagesScanned: true,
      website: {
        select: {
          id: true,
          name: true,
          url: true,
          workspaceId: true,
          scanFrequency: true,
          nextScanAt: true,
          workspace: { select: { owner: { select: { email: true } } } },
        },
      },
    },
  });

  let sent = 0;
  const seen = new Set<string>();
  for (const scan of scans) {
    const site = scan.website;
    // Two baseline scans of one site in the window: one email.
    if (seen.has(site.id)) continue;
    seen.add(site.id);

    const owner = site.workspace.owner.email;
    const config = await resolveEmailConfig(site.workspaceId);
    if (!owner || !config) continue; // email switched off

    const host = hostOf(site.url);
    const mail = baselineReadyEmail({
      websiteName: site.name,
      websiteHost: host,
      pagesScanned: scan.pagesScanned,
      websiteUrl: `${appBase}/dashboard/websites/${site.id}`,
      nextScan: site.nextScanAt
        ? site.nextScanAt.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            timeZone: "UTC",
          })
        : null,
      frequency: site.scanFrequency === "DAILY" ? "Daily" : "Weekly",
      alertRecipients: config.recipients,
      alertsUrl: `${appBase}/dashboard/notifications`,
    });
    const result = await sendEmail({ to: [owner], subject: mail.subject, html: mail.html, text: mail.text });
    await prisma.notification.create({
      data: {
        workspaceId: site.workspaceId,
        websiteId: site.id,
        scanId: scan.id,
        channelType: "EMAIL",
        recipient: owner,
        subject: mail.subject,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
    if (!result.ok) {
      // Most likely the provider's quota or rate limit - stop rather than
      // hammer it; the next hourly run picks up where this left off.
      logger.warn("baseline-ready email failed, stopping this run", { websiteId: site.id, error: result.error });
      break;
    }
    sent++;
    await pause();
  }
  return sent;
}

async function sendFirstWebsiteNudges(budget: number): Promise<number> {
  if (budget <= 0) return 0;
  const users = await prisma.user.findMany({
    where: {
      createdAt: { lte: new Date(Date.now() - DAY_MS) },
      ownedWorkspaces: {
        some: {},
        every: {
          websites: { none: {} },
          notifications: { none: { subject: FIRST_WEBSITE_NUDGE_SUBJECT, status: "SENT" } },
          notificationChannels: { none: { type: "EMAIL", enabled: false } },
        },
      },
    },
    // Newest first: the most recent signups are the likeliest to come back.
    orderBy: { createdAt: "desc" },
    take: budget,
    select: {
      id: true,
      name: true,
      email: true,
      ownedWorkspaces: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  let sent = 0;
  for (const user of users) {
    const workspaceId = user.ownedWorkspaces[0]?.id;
    if (!workspaceId || !user.email) continue;

    const mail = firstWebsiteNudgeEmail({
      name: displayPersonName(user.name, user.email),
      addWebsiteUrl: `${appBase}/dashboard/websites/new`,
      docsUrl: `${appBase}/docs`,
    });
    const result = await sendEmail({ to: [user.email], subject: mail.subject, html: mail.html, text: mail.text });
    await prisma.notification.create({
      data: {
        workspaceId,
        channelType: "EMAIL",
        recipient: user.email,
        subject: mail.subject,
        status: result.ok ? "SENT" : "FAILED",
        sentAt: result.ok ? new Date() : null,
        errorMessage: result.error ?? null,
      },
    });
    if (!result.ok) {
      logger.warn("first-website reminder failed, stopping this run", { userId: user.id, error: result.error });
      break;
    }
    sent++;
    await pause();
  }
  return sent;
}

export async function runActivationSweep(): Promise<void> {
  const limits = emailLimitsFromEnv(process.env);

  const before = await currentUsage();
  const baselineReady = await sendBaselineReady(emailAllowance("ACTIVATION", limits, before));

  // Re-read: the baseline emails just spent some of the same budget.
  const after = await currentUsage();
  const reminders = await sendFirstWebsiteNudges(emailAllowance("REMINDER", limits, after));

  logger.info("activation sweep finished", {
    baselineReady,
    reminders,
    sentToday: after.sentToday + reminders,
    dailyLimit: limits.daily,
    sentThisMonth: after.sentThisMonth + reminders,
    monthlyLimit: limits.monthly,
  });
}
