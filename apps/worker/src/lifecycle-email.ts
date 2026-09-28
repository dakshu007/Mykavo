/**
 * The lifecycle series: Day 3 / 6 / 10 retention emails for new accounts.
 *
 *   Day 3  - with a website: what MyKavo saw so far (real scan and change
 *            counts). Without one: the two-minute setup, with the videos.
 *   Day 6  - the Android app, for accounts with a website and no app yet.
 *   Day 10 - Pro at a discount (default 15% with code PRO17), for Free
 *            accounts with a website.
 *
 * Each step can be switched off, re-worded, and moved to another day in
 * Admin > Automations; the Day 10 code and percent live there too.
 *
 * Which step an account is due is decided by decideLifecycleStep in
 * @mykavo/shared (windows, stop rules, one email a day); this file gathers
 * the facts and sends. It runs inside the hourly activation sweep and spends
 * the REMINDER share of the email budget, so it can never use up the quota
 * a CRITICAL alert needs.
 *
 * Every email carries an unsubscribe link and one-click List-Unsubscribe
 * headers. The link points at the Notification row recorded for that
 * email, which is created (PENDING) before sending for exactly that reason.
 *
 * Fails closed: if the email_opt_out table is missing (the migration has not
 * been applied yet), nobody can be checked for an unsubscribe, so nothing is
 * sent.
 */

import { getWorkspaceEntitlement, prisma, recordAutomationSend } from "@mykavo/database";
import {
  LIFECYCLE_KEYS,
  LIFECYCLE_SUBJECT_PREFIXES,
  lifecycleHeaders,
  lifecycleSendDays,
  matchesLegacySubject,
  renderAutomation,
  sendEmail,
  type AutomationData,
  type AutomationKey,
} from "@mykavo/email";
import {
  PLAN_PRICES_USD,
  decideLifecycleStep,
  displayPersonName,
  lifecycleMaxAgeDays,
  lifecycleMinAgeDays,
  type LifecycleStep,
} from "@mykavo/shared";
import type { Automations } from "./automation-settings";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
const DAY_MS = 24 * 60 * 60 * 1000;
const GAP_MS = 700;
/** Candidates examined per sweep; signups in a ~11-day window, so small. */
const MAX_CANDIDATES = 500;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

const STEP_KEY: Record<LifecycleStep, AutomationKey> = {
  DAY3_STATS: "day3_stats",
  DAY3_SETUP: "day3_setup",
  DAY6_ANDROID: "day6_android",
  DAY10_OFFER: "day10_offer",
};

async function stepData(
  step: LifecycleStep,
  ctx: { name: string; email: string; workspaceId: string; unsubscribeUrl: string },
): Promise<AutomationData> {
  const { name, unsubscribeUrl } = ctx;
  switch (step) {
    case "DAY3_STATS": {
      const websiteFilter = { website: { workspaceId: ctx.workspaceId } };
      const [websitesCount, pagesMonitored, scansCompleted, changesFound, openChanges, urgentChanges] = await Promise.all([
        prisma.website.count({ where: { workspaceId: ctx.workspaceId } }),
        prisma.monitoredPage.count({ where: { ...websiteFilter, enabled: true } }),
        prisma.scan.count({ where: { ...websiteFilter, status: { in: ["COMPLETED", "PARTIAL"] } } }),
        prisma.changeEvent.count({ where: websiteFilter }),
        prisma.changeEvent.count({ where: { ...websiteFilter, status: "NEW" } }),
        prisma.changeEvent.count({ where: { ...websiteFilter, status: "NEW", severity: { in: ["HIGH", "CRITICAL"] } } }),
      ]);
      return {
        key: "day3_stats",
        data: {
          name,
          websitesCount,
          pagesMonitored,
          scansCompleted,
          changesFound,
          openChanges,
          urgentChanges,
          dashboardUrl: `${appBase}/dashboard`,
          changesUrl: `${appBase}/dashboard/changes`,
          unsubscribeUrl,
        },
      };
    }
    case "DAY3_SETUP":
      return {
        key: "day3_setup",
        data: { name, addWebsiteUrl: `${appBase}/dashboard/websites/new`, tutorialsUrl: `${appBase}/video-tutorials`, unsubscribeUrl },
      };
    case "DAY6_ANDROID": {
      const config = await resolveEmailConfig(ctx.workspaceId);
      return {
        key: "day6_android",
        data: {
          name,
          androidUrl: `${appBase}/android-app`,
          alertEmail: config?.recipients[0] ?? ctx.email,
          notificationsUrl: `${appBase}/dashboard/notifications`,
          unsubscribeUrl,
        },
      };
    }
    case "DAY10_OFFER":
      // Code, percent, price and day come from the saved settings.
      return {
        key: "day10_offer",
        data: { name, regularPrice: PLAN_PRICES_USD.pro, upgradeUrl: `${appBase}/dashboard/billing`, unsubscribeUrl },
      };
  }
}

/** Lifecycle emails already sent to a workspace, with the automation that sent each. */
async function lifecycleHistory(workspaceId: string, a: Automations): Promise<{ key: AutomationKey | null; subject: string; sentAt: Date | null }[]> {
  const legacy = LIFECYCLE_SUBJECT_PREFIXES.map((p) => ({ subject: { startsWith: p } }));
  const base = { workspaceId, channelType: "EMAIL" as const, status: "SENT" as const };
  if (!a.ready) {
    const rows = await prisma.notification.findMany({ where: { ...base, OR: legacy }, select: { subject: true, sentAt: true } });
    return rows.map((r) => ({ ...r, key: null }));
  }
  const rows = await prisma.notification.findMany({
    where: {
      ...base,
      OR: [...legacy, { automationSend: { is: { automationKey: { in: LIFECYCLE_KEYS }, isTest: false } } }],
    },
    select: { subject: true, sentAt: true, automationSend: { select: { automationKey: true, isTest: true } } },
  });
  return rows.map((r) => ({
    subject: r.subject,
    sentAt: r.sentAt,
    key: r.automationSend && !r.automationSend.isTest ? (r.automationSend.automationKey as AutomationKey) : null,
  }));
}

export async function sendLifecycleEmails(budget: number, a: Automations): Promise<number> {
  if (budget <= 0) return 0;
  if (!LIFECYCLE_KEYS.some((k) => a.settings[k].enabled)) return 0;
  const now = new Date();
  const sendDays = lifecycleSendDays(a.settings);
  const enabled = {
    DAY3_STATS: a.settings.day3_stats.enabled,
    DAY3_SETUP: a.settings.day3_setup.enabled,
    DAY6_ANDROID: a.settings.day6_android.enabled,
    DAY10_OFFER: a.settings.day10_offer.enabled,
  };

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - lifecycleMaxAgeDays(sendDays) * DAY_MS),
        lte: new Date(now.getTime() - lifecycleMinAgeDays(sendDays) * DAY_MS),
      },
      ownedWorkspaces: { some: {} },
    },
    orderBy: { createdAt: "asc" },
    take: MAX_CANDIDATES,
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      _count: { select: { pushDevices: true } },
      ownedWorkspaces: { select: { id: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  let sent = 0;
  for (const user of users) {
    if (sent >= budget) break;
    const workspaceId = user.ownedWorkspaces[0]?.id;
    if (!workspaceId || !user.email) continue;
    const email = user.email.trim().toLowerCase();

    const [optOut, websites, entitlement, emailConfig, appRequest, history] = await Promise.all([
      // Throws when the table does not exist yet: caught by the sweep, and
      // then nothing is sent (fail closed).
      prisma.emailOptOut.findUnique({ where: { email }, select: { id: true } }),
      prisma.website.count({ where: { workspaceId } }),
      getWorkspaceEntitlement(prisma, workspaceId),
      resolveEmailConfig(workspaceId),
      prisma.appAccessRequest.findUnique({ where: { email }, select: { id: true } }),
      lifecycleHistory(workspaceId, a),
    ]);

    const alreadySent = (key: AutomationKey) => history.some((h) => h.key === key || matchesLegacySubject(key, h.subject));
    const lastSent = history.reduce<Date | null>((m, h) => (h.sentAt && (!m || h.sentAt > m) ? h.sentAt : m), null);

    const step = decideLifecycleStep({
      signedUpAt: user.createdAt,
      now,
      hasWebsite: websites > 0,
      isPaid: (entitlement?.planId ?? "free") !== "free",
      optedOut: Boolean(optOut),
      emailOff: !emailConfig,
      hasAndroidApp: Boolean(appRequest) || user._count.pushDevices > 0,
      sentDay3: alreadySent("day3_stats") || alreadySent("day3_setup"),
      sentDay6: alreadySent("day6_android"),
      sentDay10: alreadySent("day10_offer"),
      lastLifecycleSentAt: lastSent,
      sendDays,
      enabled,
    });
    if (!step) continue;

    const ctx = { name: displayPersonName(user.name, user.email), email, workspaceId, unsubscribeUrl: "" };
    // The subject never depends on the unsubscribe link, so render once to
    // learn it, record the row, then render with the row's own link.
    // The row and its send-log entry are written together: a row the log
    // does not know about could not be recognised as sent next hour.
    const data = await stepData(step, ctx);
    const draft = renderAutomation(data, a.settings);
    const recipient = user.email;
    const row = await prisma.$transaction(async (tx) => {
      const created = await tx.notification.create({
        data: { workspaceId, channelType: "EMAIL", recipient, subject: draft.subject, status: "PENDING" },
        select: { id: true },
      });
      await recordAutomationSend(tx, { notificationId: created.id, automationKey: STEP_KEY[step] }, a.ready);
      return created;
    });
    const unsubscribeUrl = `${appBase}/unsubscribe?n=${row.id}`;
    const mail = renderAutomation({ ...data, data: { ...data.data, unsubscribeUrl } } as AutomationData, a.settings);
    const result = await sendEmail({
      to: [user.email],
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      headers: lifecycleHeaders(`${appBase}/api/email/unsubscribe?n=${row.id}`),
    });
    await prisma.notification.update({
      where: { id: row.id },
      data: { status: result.ok ? "SENT" : "FAILED", sentAt: result.ok ? new Date() : null, errorMessage: result.error ?? null },
    });
    if (!result.ok) {
      logger.warn("lifecycle email failed, stopping this run", { userId: user.id, step, error: result.error });
      break;
    }
    logger.info("lifecycle email sent", { userId: user.id, step });
    sent++;
    await pause();
  }
  return sent;
}
