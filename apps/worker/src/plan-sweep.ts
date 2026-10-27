/**
 * Keeps every website in step with its workspace's plan, every 15 minutes:
 *
 * 1. Scan frequency. Free scans weekly, paid plans and trials daily. The plan
 *    decides; website.scanFrequency follows it (it is what the dashboard
 *    shows). A website moving to daily has its next scan pulled forward, so
 *    an upgrade is felt the same day rather than up to a week later.
 * 2. Trials that ended. The oldest monitored website (or, with none, the
 *    oldest one) stays; every other website not already paused is paused
 *    (OVER_LIMIT), including ones still being set up.
 * 3. Dormant Free workspaces. Nobody has opened MyKavo in 30 days: their
 *    websites pause (DORMANT) until someone comes back.
 *
 * Emails about 2 and 3 go out from the activation sweep (plan-emails.ts),
 * on the email budget; the state changes here never wait for email.
 */

import {
  prisma,
  getWorkspaceEntitlement,
  autoPauseWebsites,
  resumeAutoPaused,
  DORMANT_AFTER_DAYS,
  isMissingTableError,
  platformAdminEmails,
  type Entitlement,
} from "@mykavo/database";
import {
  pulledForwardNextScan,
  scanFrequencyForTier,
  toPlanTier,
  websiteLimitFor,
  type ScanFrequency,
} from "@mykavo/shared";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Free plan website limit (mirrors apps/web/src/config/plans.ts). */
export const FREE_WEBSITE_LIMIT = 1;
/** Plans a Dodo subscription or a Shopify store can pay for. */
const PAID_PLAN_IDS = ["starter", "pro", "agency"];
/** Workspace ids per website_auto_pause lookup, to keep each IN list small. */
const RESUME_LOOKUP_BATCH = 500;

/** The scan frequency a workspace's plan gives right now. */
export async function planScanFrequency(workspaceId: string): Promise<ScanFrequency> {
  const ent = await getWorkspaceEntitlement(prisma, workspaceId);
  return frequencyFor(ent);
}

export function frequencyFor(ent: Entitlement | null): ScanFrequency {
  return scanFrequencyForTier(toPlanTier(ent?.planId));
}

async function syncScanFrequencies(now: Date): Promise<number> {
  const websites = await prisma.website.findMany({
    where: { status: { in: ["ACTIVE", "ERROR"] } },
    select: { id: true, workspaceId: true, scanFrequency: true, nextScanAt: true, lastScanAt: true },
    take: 10_000,
  });
  const byWorkspace = new Map<string, typeof websites>();
  for (const w of websites) byWorkspace.set(w.workspaceId, [...(byWorkspace.get(w.workspaceId) ?? []), w]);

  let changed = 0;
  for (const [workspaceId, list] of byWorkspace) {
    const freq = await planScanFrequency(workspaceId);
    for (const w of list) {
      if (w.scanFrequency === freq) continue;
      const next = freq === "DAILY" ? pulledForwardNextScan(w, now) : null;
      await prisma.website.update({
        where: { id: w.id },
        data: { scanFrequency: freq, ...(next ? { nextScanAt: next } : {}) },
      });
      changed++;
    }
  }
  return changed;
}

/**
 * Workspaces that may be on more than Free right now, from the same sources
 * getWorkspaceEntitlement reads: an active Dodo Pro or Agency subscription,
 * a store paying through Shopify (app installed, link live), a running
 * trial, or a platform admin's own workspace. Sorted, so every run works
 * through them in the same order.
 */
async function possiblyPaidWorkspaceIds(now: Date): Promise<string[]> {
  const admins = platformAdminEmails();
  const [subscriptions, shops, trials, adminWorkspaces] = await Promise.all([
    prisma.subscription.findMany({
      // "active" is the only status that grants a paid plan (planIdFromSubscription).
      where: { status: "active", planId: { in: PAID_PLAN_IDS } },
      select: { workspaceId: true },
    }),
    prisma.shopifyShop.findMany({
      where: { billingPlan: { in: PAID_PLAN_IDS }, uninstalledAt: null, siteConnection: { is: { revokedAt: null } } },
      select: { siteConnection: { select: { workspaceId: true } } },
    }),
    prisma.workspaceTrial.findMany({ where: { endsAt: { gt: now } }, select: { workspaceId: true } }),
    admins.length > 0
      ? prisma.workspace.findMany({
          where: { owner: { email: { in: admins, mode: "insensitive" } } },
          select: { id: true },
        })
      : Promise.resolve<{ id: string }[]>([]),
  ]);
  const ids = new Set<string>([
    ...subscriptions.map((s) => s.workspaceId),
    ...shops.flatMap((s) => (s.siteConnection ? [s.siteConnection.workspaceId] : [])),
    ...trials.map((t) => t.workspaceId),
    ...adminWorkspaces.map((w) => w.id),
  ]);
  return [...ids].sort();
}

/**
 * Upgraded (or started a trial) after MyKavo paused their websites: resume
 * them. The candidates are the workspaces that may be paying, which stay
 * few, and only those of them with auto-paused websites are looked at.
 * Starting from website_auto_pause instead would not scale: every abandoned
 * Free workspace and every trial that ends unpaid leaves rows there that
 * never resume. getWorkspaceEntitlement still decides for each one.
 */
async function resumeForPaidWorkspaces(now: Date): Promise<number> {
  const candidates = await possiblyPaidWorkspaceIds(now);
  let resumed = 0;
  for (let i = 0; i < candidates.length; i += RESUME_LOOKUP_BATCH) {
    const rows = await prisma.websiteAutoPause.findMany({
      where: { workspaceId: { in: candidates.slice(i, i + RESUME_LOOKUP_BATCH) } },
      select: { workspaceId: true },
      distinct: ["workspaceId"],
      orderBy: { workspaceId: "asc" },
    });
    for (const { workspaceId } of rows) {
      const ent = await getWorkspaceEntitlement(prisma, workspaceId);
      if (!ent || ent.planId === "free") continue;
      // Only as many as the plan has room for: a Starter workspace that
      // came down from Pro must not get all its websites back.
      const room = websiteLimitFor(ent) - (await prisma.website.count({ where: { workspaceId, status: { not: "PAUSED" } } }));
      if (room <= 0) continue;
      const limit = Number.isFinite(room) ? room : undefined;
      resumed += (await resumeAutoPaused(prisma, workspaceId, ["OVER_LIMIT", "DORMANT"], { now, limit })).length;
    }
  }
  return resumed;
}

/**
 * Which websites a trial's end pauses: all but the FREE_WEBSITE_LIMIT kept
 * ones. Websites already monitored (ACTIVE or ERROR) are kept first, oldest
 * first; only when there are none is the oldest one still being set up
 * kept. Takes the workspace's websites that are not paused, oldest first.
 */
function websitesOverFreeLimit<T extends { status: string; baselines: unknown[] }>(websites: T[]): T[] {
  return websitesOverLimit(websites, FREE_WEBSITE_LIMIT);
}

/** The same rule for any limit: monitored websites are kept first, oldest first. */
function websitesOverLimit<T extends { status: string; baselines: unknown[] }>(websites: T[], limit: number): T[] {
  // ERROR is also where a site lands when its FIRST discovery or baseline
  // fails, so only a site with an approved baseline counts as monitored.
  const monitored = (w: T) => (w.status === "ACTIVE" || w.status === "ERROR") && w.baselines.length > 0;
  const keepFirst = [...websites.filter(monitored), ...websites.filter((w) => !monitored(w))];
  return keepFirst.slice(limit);
}

/**
 * Paid workspaces over their plan's website limit - after a move to a
 * smaller plan (Pro -> Starter, Agency -> Pro), or buying Starter at the end
 * of a 3-website trial. The websites over the limit are paused (OVER_LIMIT),
 * never deleted, and come back by themselves on an upgrade.
 */
async function enforcePaidWebsiteLimits(now: Date): Promise<number> {
  let paused = 0;
  for (const workspaceId of await possiblyPaidWorkspaceIds(now)) {
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    if (!ent || ent.planId === "free") continue;
    const limit = websiteLimitFor(ent);
    if (!Number.isFinite(limit)) continue;
    const websites = await prisma.website.findMany({
      where: { workspaceId, status: { not: "PAUSED" } },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        workspaceId: true,
        status: true,
        baselines: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
      },
    });
    if (websites.length <= limit) continue;
    const done = await autoPauseWebsites(prisma, websitesOverLimit(websites, limit), "OVER_LIMIT", now);
    if (done.length) logger.info("websites over the plan limit paused", { workspaceId, plan: ent.planId, websites: done.length });
    paused += done.length;
  }
  return paused;
}

async function endExpiredTrials(now: Date): Promise<number> {
  const ended = await prisma.workspaceTrial.findMany({
    where: { endsAt: { lte: now }, endedAt: null },
    select: { workspaceId: true },
    take: 200,
  });
  let pausedTotal = 0;
  for (const { workspaceId } of ended) {
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    if (!ent || ent.planId === "free") {
      // Keep the oldest monitored website (Free's limit); pause the rest,
      // including any still being set up, which would otherwise start
      // monitoring once its baseline lands. The trial is not looked at again
      // after this, so nothing may be left for later.
      const websites = await prisma.website.findMany({
        where: { workspaceId, status: { not: "PAUSED" } },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          workspaceId: true,
          status: true,
          baselines: { where: { status: "ACTIVE" }, select: { id: true }, take: 1 },
        },
      });
      const paused = await autoPauseWebsites(prisma, websitesOverFreeLimit(websites), "OVER_LIMIT", now);
      pausedTotal += paused.length;
    }
    await prisma.workspaceTrial.update({ where: { workspaceId }, data: { endedAt: now } });
    logger.info("trial ended", { workspaceId, plan: ent?.planId ?? "free" });
  }
  return pausedTotal;
}

/** Latest sign of life from any member: app or plugin activity, or a session in use. */
async function lastActiveAt(workspaceId: string): Promise<Date | null> {
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId }, select: { userId: true } });
  const userIds = members.map((m) => m.userId);
  if (userIds.length === 0) return null;
  const [activity, session] = await Promise.all([
    prisma.userActivityDay
      .aggregate({ where: { userId: { in: userIds } }, _max: { lastAt: true } })
      .catch((err: unknown) => {
        if (isMissingTableError(err)) return { _max: { lastAt: null } };
        throw err;
      }),
    prisma.session.aggregate({ where: { userId: { in: userIds } }, _max: { updatedAt: true } }),
  ]);
  const times = [activity._max.lastAt, session._max.updatedAt].filter((t): t is Date => t instanceof Date);
  return times.length ? new Date(Math.max(...times.map((t) => t.getTime()))) : null;
}

async function pauseDormantWorkspaces(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - DORMANT_AFTER_DAYS * DAY_MS);
  const candidates = await prisma.website.findMany({
    where: { status: { in: ["ACTIVE", "ERROR"] }, workspace: { createdAt: { lt: cutoff } } },
    select: { workspaceId: true },
    distinct: ["workspaceId"],
    take: 500,
  });
  let paused = 0;
  for (const { workspaceId } of candidates) {
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    if (ent && ent.planId !== "free") continue; // paying and trial workspaces are never paused
    const last = await lastActiveAt(workspaceId);
    if (last && last > cutoff) continue;
    const websites = await prisma.website.findMany({
      where: { workspaceId, status: { in: ["ACTIVE", "ERROR"] } },
      select: { id: true, workspaceId: true },
    });
    const done = await autoPauseWebsites(prisma, websites, "DORMANT", now);
    if (done.length) logger.info("dormant workspace paused", { workspaceId, websites: done.length });
    paused += done.length;
  }
  return paused;
}

export async function runPlanSweep(now: Date = new Date()): Promise<void> {
  const synced = await syncScanFrequencies(now);
  let trialPaused = 0;
  let dormantPaused = 0;
  let resumed = 0;
  let overLimitPaused = 0;
  try {
    resumed = await resumeForPaidWorkspaces(now);
    overLimitPaused = await enforcePaidWebsiteLimits(now);
    trialPaused = await endExpiredTrials(now);
    dormantPaused = await pauseDormantWorkspaces(now);
  } catch (err) {
    // Before the trial/auto-pause migration runs, only the frequency sync works.
    if (!isMissingTableError(err)) throw err;
  }
  if (synced || trialPaused || dormantPaused || resumed || overLimitPaused) {
    logger.info("plan sweep", { synced, trialPaused, dormantPaused, resumed, overLimitPaused });
  }
}
