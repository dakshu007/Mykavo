/**
 * Keeps every website in step with its workspace's plan, every 15 minutes:
 *
 * 1. Scan frequency. Free scans weekly, paid plans and trials daily. The plan
 *    decides; website.scanFrequency follows it (it is what the dashboard
 *    shows). A website moving to daily has its next scan pulled forward, so
 *    an upgrade is felt the same day rather than up to a week later.
 * 2. Trials that ended. Websites over the Free limit are paused (OVER_LIMIT),
 *    newest first, so the site they started with keeps being monitored.
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
  type Entitlement,
} from "@mykavo/database";
import { pulledForwardNextScan, scanFrequencyForTier, toPlanTier, type ScanFrequency } from "@mykavo/shared";
import { logger } from "./logger";

const DAY_MS = 24 * 60 * 60 * 1000;
/** Free plan website limit (mirrors apps/web/src/config/plans.ts). */
export const FREE_WEBSITE_LIMIT = 1;

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

/** Upgraded (or started a trial) after MyKavo paused their websites: resume them. */
async function resumeForPaidWorkspaces(now: Date): Promise<number> {
  const rows = await prisma.websiteAutoPause.findMany({ select: { workspaceId: true }, distinct: ["workspaceId"], take: 500 });
  let resumed = 0;
  for (const { workspaceId } of rows) {
    const ent = await getWorkspaceEntitlement(prisma, workspaceId);
    if (!ent || ent.planId === "free") continue;
    resumed += (await resumeAutoPaused(prisma, workspaceId, ["OVER_LIMIT", "DORMANT"], { now })).length;
  }
  return resumed;
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
      // Keep the oldest websites up to the Free limit; pause the rest.
      const websites = await prisma.website.findMany({
        where: { workspaceId, status: { in: ["ACTIVE", "ERROR"] } },
        orderBy: { createdAt: "asc" },
        select: { id: true, workspaceId: true },
      });
      const paused = await autoPauseWebsites(prisma, websites.slice(FREE_WEBSITE_LIMIT), "OVER_LIMIT", now);
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
  try {
    resumed = await resumeForPaidWorkspaces(now);
    trialPaused = await endExpiredTrials(now);
    dormantPaused = await pauseDormantWorkspaces(now);
  } catch (err) {
    // Before the trial/auto-pause migration runs, only the frequency sync works.
    if (!isMissingTableError(err)) throw err;
  }
  if (synced || trialPaused || dormantPaused || resumed) {
    logger.info("plan sweep", { synced, trialPaused, dormantPaused, resumed });
  }
}
