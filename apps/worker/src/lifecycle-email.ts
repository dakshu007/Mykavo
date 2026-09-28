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

import { prisma } from "@mykavo/database";
import { LIFECYCLE_KEYS, lifecycleSendDays, matchesLegacySubject, renderAutomation, type AutomationKey } from "@mykavo/email";
import {
  decideLifecycleStep,
  displayPersonName,
  lifecycleMaxAgeDays,
  lifecycleMinAgeDays,
  type LifecycleStep,
} from "@mykavo/shared";
import { buildAutomationData, gatherFacts, withUnsubscribe, type AccountCtx } from "./automation-data";
import { lastSentAt, optionalHistory, sendAutomatedEmail } from "./automation-send";
import type { Automations } from "./automation-settings";
import { logger } from "./logger";

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
    const ctx: AccountCtx = {
      userId: user.id,
      name: displayPersonName(user.name, user.email),
      email: user.email.trim().toLowerCase(),
      workspaceId,
      pushDevices: user._count.pushDevices,
    };

    // gatherFacts throws when email_opt_out does not exist yet: caught by
    // the sweep, and then nothing is sent (fail closed).
    const [facts, history] = await Promise.all([gatherFacts(ctx), optionalHistory(workspaceId, a)]);
    const alreadySent = (key: AutomationKey) => history.some((h) => h.key === key || matchesLegacySubject(key, h.subject));

    const step = decideLifecycleStep({
      signedUpAt: user.createdAt,
      now,
      hasWebsite: facts.has_website,
      isPaid: facts.is_paid,
      optedOut: facts.optedOut,
      emailOff: facts.emailOff,
      hasAndroidApp: facts.has_android_app,
      sentDay3: alreadySent("day3_stats") || alreadySent("day3_setup"),
      sentDay6: alreadySent("day6_android"),
      sentDay10: alreadySent("day10_offer"),
      // Flow emails count too: one optional email a day, whoever sends it.
      lastLifecycleSentAt: lastSentAt(history),
      sendDays,
      enabled,
    });
    if (!step) continue;

    const key = STEP_KEY[step];
    const base = await buildAutomationData(key, ctx, "");
    if (!base) continue;
    const result = await sendAutomatedEmail({
      workspaceId,
      to: user.email,
      key,
      unsubscribable: true,
      a,
      render: (unsubscribeUrl) => renderAutomation(withUnsubscribe(base, unsubscribeUrl), a.settings),
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
