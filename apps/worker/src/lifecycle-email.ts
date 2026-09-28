/**
 * The lifecycle series: Day 3 / 6 / 10 retention emails for new accounts.
 *
 *   Day 3  - with a website: what MyKavo saw so far (real scan and change
 *            counts). Without one: the two-minute setup, with the videos.
 *   Day 6  - the Android app, for accounts with a website and no app yet.
 *   Day 10 - Pro at 15% off (code PRO17), for Free accounts with a website.
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

import { getWorkspaceEntitlement, prisma } from "@mykavo/database";
import {
  DAY10_OFFER_SUBJECT,
  DAY3_SETUP_SUBJECT,
  DAY3_STATS_SUBJECT_PREFIX,
  DAY6_ANDROID_SUBJECT,
  LIFECYCLE_SUBJECT_PREFIXES,
  day10OfferEmail,
  day3SetupEmail,
  day3StatsEmail,
  day6AndroidEmail,
  lifecycleHeaders,
  sendEmail,
} from "@mykavo/email";
import {
  LIFECYCLE_MAX_AGE_DAYS,
  LIFECYCLE_MIN_AGE_DAYS,
  PLAN_PRICES_USD,
  decideLifecycleStep,
  displayPersonName,
  type LifecycleStep,
} from "@mykavo/shared";
import { resolveEmailConfig } from "./notify";
import { logger } from "./logger";

const appBase = (process.env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
const DAY_MS = 24 * 60 * 60 * 1000;
const GAP_MS = 700;
/** The Dodo discount code for the Day 10 offer. Create it in Dodo first. */
const OFFER_CODE = process.env.LIFECYCLE_OFFER_CODE ?? "PRO17";
const OFFER_PRICE = Math.round(PLAN_PRICES_USD.pro * 0.85);
/** Candidates examined per sweep; signups in a 11-day window, so small. */
const MAX_CANDIDATES = 500;

const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));
const lifecycleWhere = { OR: LIFECYCLE_SUBJECT_PREFIXES.map((p) => ({ subject: { startsWith: p } })) };

type Mail = { subject: string; html: string; text: string };

async function renderStep(
  step: LifecycleStep,
  ctx: { name: string; email: string; workspaceId: string; unsubscribeUrl: string },
): Promise<Mail> {
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
      return day3StatsEmail({
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
      });
    }
    case "DAY3_SETUP":
      return day3SetupEmail({
        name,
        addWebsiteUrl: `${appBase}/dashboard/websites/new`,
        tutorialsUrl: `${appBase}/video-tutorials`,
        unsubscribeUrl,
      });
    case "DAY6_ANDROID": {
      const config = await resolveEmailConfig(ctx.workspaceId);
      return day6AndroidEmail({
        name,
        androidUrl: `${appBase}/android-app`,
        alertEmail: config?.recipients[0] ?? ctx.email,
        notificationsUrl: `${appBase}/dashboard/notifications`,
        unsubscribeUrl,
      });
    }
    case "DAY10_OFFER":
      return day10OfferEmail({
        name,
        code: OFFER_CODE,
        price: OFFER_PRICE,
        regularPrice: PLAN_PRICES_USD.pro,
        upgradeUrl: `${appBase}/dashboard/billing`,
        unsubscribeUrl,
      });
  }
}

export async function sendLifecycleEmails(budget: number): Promise<number> {
  if (budget <= 0) return 0;
  const now = new Date();

  const users = await prisma.user.findMany({
    where: {
      createdAt: {
        gte: new Date(now.getTime() - LIFECYCLE_MAX_AGE_DAYS * DAY_MS),
        lte: new Date(now.getTime() - LIFECYCLE_MIN_AGE_DAYS * DAY_MS),
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
      prisma.notification.findMany({
        where: { workspaceId, channelType: "EMAIL", status: "SENT", ...lifecycleWhere },
        select: { subject: true, sentAt: true },
      }),
    ]);

    const sentWith = (prefix: string) => history.some((h) => h.subject.startsWith(prefix));
    const lastSent = history.reduce<Date | null>((m, h) => (h.sentAt && (!m || h.sentAt > m) ? h.sentAt : m), null);

    const step = decideLifecycleStep({
      signedUpAt: user.createdAt,
      now,
      hasWebsite: websites > 0,
      isPaid: (entitlement?.planId ?? "free") !== "free",
      optedOut: Boolean(optOut),
      emailOff: !emailConfig,
      hasAndroidApp: Boolean(appRequest) || user._count.pushDevices > 0,
      sentDay3: sentWith(DAY3_STATS_SUBJECT_PREFIX) || sentWith(DAY3_SETUP_SUBJECT),
      sentDay6: sentWith(DAY6_ANDROID_SUBJECT),
      sentDay10: sentWith(DAY10_OFFER_SUBJECT),
      lastLifecycleSentAt: lastSent,
    });
    if (!step) continue;

    const ctx = { name: displayPersonName(user.name, user.email), email, workspaceId, unsubscribeUrl: "" };
    // The subject never depends on the unsubscribe link, so render once to
    // learn it, record the row, then render with the row's own link.
    const draft = await renderStep(step, ctx);
    const row = await prisma.notification.create({
      data: { workspaceId, channelType: "EMAIL", recipient: user.email, subject: draft.subject, status: "PENDING" },
      select: { id: true },
    });
    const mail = await renderStep(step, { ...ctx, unsubscribeUrl: `${appBase}/unsubscribe?n=${row.id}` });
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
