/**
 * Emails about the plan: "we added a Pro trial", "3 days left of your Pro trial", "your trial has
 * ended" and "we paused monitoring". The state changes behind them happen in
 * plan-sweep.ts regardless of email; these only tell people, once each, on
 * the ACTIVATION share of the email budget (they are about the person's own
 * account, so no unsubscribe link). Each switch lives in Admin > Automations.
 */

import { prisma, getWorkspaceEntitlement, trialDaysLeft, isMissingTableError } from "@mykavo/database";
import { renderAutomation } from "@mykavo/email";
import { PLAN_PRICES_USD, TRIAL_MAX_WEBSITES, TRIAL_REMINDER_DAYS_LEFT, displayPersonName } from "@mykavo/shared";
import { appBase } from "./automation-data";
import { sendAutomatedEmail } from "./automation-send";
import type { Automations } from "./automation-settings";
import { logger } from "./logger";
import { resolveEmailConfig } from "./notify";

const DAY_MS = 24 * 60 * 60 * 1000;
const GAP_MS = 700;
const pause = () => new Promise((resolve) => setTimeout(resolve, GAP_MS));

const dayFormat = new Intl.DateTimeFormat("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });

async function owner(workspaceId: string): Promise<{ name: string; email: string } | null> {
  const ws = await prisma.workspace.findUnique({
    where: { id: workspaceId },
    select: { owner: { select: { name: true, email: true } } },
  });
  if (!ws?.owner.email) return null;
  return { name: displayPersonName(ws.owner.name, ws.owner.email), email: ws.owner.email };
}

/** Still on the trial (or still Free after it): true when an email about it still makes sense. */
async function notPaying(workspaceId: string): Promise<boolean> {
  const ent = await getWorkspaceEntitlement(prisma, workspaceId);
  return !ent || ent.planId === "free" || ent.billedBy === "trial";
}

/** "We added a trial to your account": only for trials MyKavo granted (reactivation), once. */
async function sendTrialStarted(budget: number, a: Automations, now: Date): Promise<number> {
  if (budget <= 0) return 0;
  const due = await prisma.workspaceTrial.findMany({
    where: { source: "reactivation", startedEmailAt: null, endedAt: null, endsAt: { gt: now } },
    orderBy: { startedAt: "asc" },
    take: 50,
  });
  let sent = 0;
  for (const trial of due) {
    if (sent >= budget) break;
    const mark = () => prisma.workspaceTrial.update({ where: { workspaceId: trial.workspaceId }, data: { startedEmailAt: now } });
    const to = await owner(trial.workspaceId);
    if (!a.settings.trial_started.enabled || !to || !(await notPaying(trial.workspaceId)) || !(await resolveEmailConfig(trial.workspaceId))) {
      await mark();
      continue;
    }
    const result = await sendAutomatedEmail({
      workspaceId: trial.workspaceId,
      to: to.email,
      key: "trial_started",
      unsubscribable: false,
      a,
      render: () =>
        renderAutomation(
          {
            key: "trial_started",
            data: {
              name: to.name,
              endsOn: dayFormat.format(trial.endsAt),
              maxWebsites: TRIAL_MAX_WEBSITES,
              dashboardUrl: `${appBase}/dashboard?from=email:trial_started`,
            },
          },
          a.settings,
        ),
    });
    if (!result.ok) {
      logger.warn("trial started email failed, stopping this run", { workspaceId: trial.workspaceId, error: result.error });
      break;
    }
    await mark();
    sent++;
    await pause();
  }
  return sent;
}

async function sendTrialReminders(budget: number, a: Automations, now: Date): Promise<number> {
  if (budget <= 0 || !a.settings.trial_ending.enabled) return 0;
  const due = await prisma.workspaceTrial.findMany({
    where: {
      reminderSentAt: null,
      endedAt: null,
      endsAt: { gt: now, lte: new Date(now.getTime() + TRIAL_REMINDER_DAYS_LEFT * DAY_MS) },
    },
    take: 50,
  });
  let sent = 0;
  for (const trial of due) {
    if (sent >= budget) break;
    const mark = () => prisma.workspaceTrial.update({ where: { workspaceId: trial.workspaceId }, data: { reminderSentAt: now } });
    if (!(await notPaying(trial.workspaceId))) {
      await mark();
      continue;
    }
    const to = await owner(trial.workspaceId);
    if (!to || !(await resolveEmailConfig(trial.workspaceId))) {
      await mark();
      continue;
    }
    const since = { gte: trial.startedAt };
    const [websites, scans, changes] = await Promise.all([
      prisma.website.count({ where: { workspaceId: trial.workspaceId } }),
      prisma.scan.count({ where: { website: { workspaceId: trial.workspaceId }, status: { in: ["COMPLETED", "PARTIAL"] }, createdAt: since } }),
      prisma.changeEvent.count({ where: { website: { workspaceId: trial.workspaceId }, detectedAt: since } }),
    ]);
    const result = await sendAutomatedEmail({
      workspaceId: trial.workspaceId,
      to: to.email,
      key: "trial_ending",
      unsubscribable: false,
      a,
      render: () =>
        renderAutomation(
          {
            key: "trial_ending",
            data: {
              name: to.name,
              daysLeft: Math.max(1, trialDaysLeft(trial.endsAt, now)),
              endsOn: dayFormat.format(trial.endsAt),
              price: PLAN_PRICES_USD.pro,
              scans,
              changes,
              websites,
              upgradeUrl: `${appBase}/dashboard/billing?from=email:trial_ending`,
            },
          },
          a.settings,
        ),
    });
    if (!result.ok) {
      logger.warn("trial reminder failed, stopping this run", { workspaceId: trial.workspaceId, error: result.error });
      break;
    }
    await mark();
    sent++;
    await pause();
  }
  return sent;
}

async function sendTrialEnded(budget: number, a: Automations, now: Date): Promise<number> {
  if (budget <= 0 || !a.settings.trial_ended.enabled) return 0;
  const ended = await prisma.workspaceTrial.findMany({
    where: { endedAt: { not: null }, endedEmailAt: null },
    take: 50,
  });
  let sent = 0;
  for (const trial of ended) {
    if (sent >= budget) break;
    const mark = () => prisma.workspaceTrial.update({ where: { workspaceId: trial.workspaceId }, data: { endedEmailAt: now } });
    if (!(await notPaying(trial.workspaceId))) {
      await mark();
      continue;
    }
    const to = await owner(trial.workspaceId);
    if (!to || !(await resolveEmailConfig(trial.workspaceId))) {
      await mark();
      continue;
    }
    const pausedRows = await prisma.websiteAutoPause.findMany({
      where: { workspaceId: trial.workspaceId, reason: "OVER_LIMIT" },
      select: { websiteId: true },
    });
    const pausedWebsites = pausedRows.length
      ? (await prisma.website.findMany({ where: { id: { in: pausedRows.map((r) => r.websiteId) } }, select: { name: true } })).map((w) => w.name)
      : [];
    const result = await sendAutomatedEmail({
      workspaceId: trial.workspaceId,
      to: to.email,
      key: "trial_ended",
      unsubscribable: false,
      a,
      render: () =>
        renderAutomation(
          {
            key: "trial_ended",
            data: {
              name: to.name,
              pausedWebsites,
              trialWebsites: TRIAL_MAX_WEBSITES,
              upgradeUrl: `${appBase}/dashboard/billing?from=email:trial_ended`,
            },
          },
          a.settings,
        ),
    });
    if (!result.ok) {
      logger.warn("trial ended email failed, stopping this run", { workspaceId: trial.workspaceId, error: result.error });
      break;
    }
    await mark();
    sent++;
    await pause();
  }
  return sent;
}

async function sendPausedNotices(budget: number, a: Automations, now: Date): Promise<number> {
  if (budget <= 0) return 0;
  const rows = await prisma.websiteAutoPause.findMany({
    where: { reason: "DORMANT", notifiedAt: null },
    orderBy: { pausedAt: "asc" },
    take: 200,
  });
  const byWorkspace = new Map<string, string[]>();
  for (const r of rows) byWorkspace.set(r.workspaceId, [...(byWorkspace.get(r.workspaceId) ?? []), r.websiteId]);

  let sent = 0;
  for (const [workspaceId, websiteIds] of byWorkspace) {
    if (sent >= budget) break;
    const mark = () => prisma.websiteAutoPause.updateMany({ where: { websiteId: { in: websiteIds } }, data: { notifiedAt: now } });
    const to = await owner(workspaceId);
    if (!a.settings.monitoring_paused.enabled || !to || !(await resolveEmailConfig(workspaceId))) {
      await mark();
      continue;
    }
    const websites = (await prisma.website.findMany({ where: { id: { in: websiteIds } }, select: { name: true } })).map((w) => w.name);
    if (websites.length === 0) {
      await mark();
      continue;
    }
    const result = await sendAutomatedEmail({
      workspaceId,
      to: to.email,
      key: "monitoring_paused",
      unsubscribable: false,
      a,
      render: () =>
        renderAutomation({ key: "monitoring_paused", data: { name: to.name, websites, resumeUrl: `${appBase}/dashboard` } }, a.settings),
    });
    if (!result.ok) {
      logger.warn("paused notice failed, stopping this run", { workspaceId, error: result.error });
      break;
    }
    await mark();
    sent++;
    await pause();
  }
  return sent;
}

/** All four, sharing one budget. Returns emails sent. */
export async function sendPlanEmails(budget: number, a: Automations): Promise<number> {
  if (budget <= 0) return 0;
  const now = new Date();
  try {
    let sent = await sendTrialStarted(budget, a, now);
    sent += await sendTrialReminders(budget - sent, a, now);
    sent += await sendTrialEnded(budget - sent, a, now);
    sent += await sendPausedNotices(budget - sent, a, now);
    return sent;
  } catch (err) {
    if (isMissingTableError(err)) return 0; // trial/auto-pause migration not applied yet
    throw err;
  }
}
