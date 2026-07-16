/**
 * Retention sweep (Phase 10, spec §60 / §91). A daily cron that deletes scan
 * history older than each workspace's plan window, reclaiming DB rows AND
 * object-storage artifacts (the real cost driver). Baseline-referenced
 * snapshots are protected inside `findExpiredSnapshots` - see its safety note.
 *
 * Idempotent and resumable: it pages through expired snapshots in batches, so a
 * crash mid-sweep just resumes on the next run.
 */

import {
  prisma,
  getWorkspaceEntitlement,
  findExpiredSnapshots,
  deleteSnapshots,
  deleteExpiredChangeEvents,
  deleteExpiredHealthChecks,
} from "@mykavo/database";
import { historyDaysForPlan } from "@mykavo/shared";
import { getDefaultStorage, type ArtifactStorage } from "@mykavo/scanner";
import { logger } from "./logger";

const BATCH = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

export interface RetentionResult {
  websites: number;
  snapshotsDeleted: number;
  changeEventsDeleted: number;
  artifactsDeleted: number;
  healthChecksDeleted: number;
}

export async function runRetentionSweep(
  storage: ArtifactStorage = getDefaultStorage(),
  now: number = Date.now(),
): Promise<RetentionResult> {
  const websites = await prisma.website.findMany({
    select: { id: true, workspaceId: true },
  });

  // Resolve each workspace's retention window once.
  const windowDaysByWorkspace = new Map<string, number>();
  let snapshotsDeleted = 0;
  let changeEventsDeleted = 0;
  let artifactsDeleted = 0;
  let healthChecksDeleted = 0;

  for (const website of websites) {
    let days = windowDaysByWorkspace.get(website.workspaceId);
    if (days === undefined) {
      const ent = await getWorkspaceEntitlement(prisma, website.workspaceId);
      days = historyDaysForPlan(ent?.planId ?? "free");
      windowDaysByWorkspace.set(website.workspaceId, days);
    }
    const cutoff = new Date(now - days * DAY_MS);

    changeEventsDeleted += await deleteExpiredChangeEvents(prisma, {
      websiteId: website.id,
      cutoff,
    });

    // Health checks accumulate ~288 rows/site/day - prune with the same
    // window. Incidents are kept forever (tiny, long-term value).
    healthChecksDeleted += await deleteExpiredHealthChecks(prisma, {
      websiteId: website.id,
      cutoff,
    });

    // Page through expired (non-baseline) snapshots, deleting artifacts first.
    for (;;) {
      const expired = await findExpiredSnapshots(prisma, {
        websiteId: website.id,
        cutoff,
        limit: BATCH,
      });
      if (expired.length === 0) break;

      for (const snap of expired) {
        if (!snap.screenshotStorageKey) continue;
        await storage.delete(snap.screenshotStorageKey).catch(() => {});
        artifactsDeleted++;
        const diffKey = snap.screenshotStorageKey.replace(/screenshot\.jpg$/, "diff.png");
        if (diffKey !== snap.screenshotStorageKey) {
          await storage.delete(diffKey).catch(() => {});
        }
      }

      const deleted = await deleteSnapshots(
        prisma,
        expired.map((s) => s.id),
      );
      snapshotsDeleted += deleted;
      // Defensive: never spin if a batch failed to delete.
      if (deleted === 0 || expired.length < BATCH) break;
    }
  }

  logger.info("retention sweep complete", {
    websites: websites.length,
    snapshotsDeleted,
    changeEventsDeleted,
    artifactsDeleted,
    healthChecksDeleted,
  });
  return {
    websites: websites.length,
    snapshotsDeleted,
    changeEventsDeleted,
    artifactsDeleted,
    healthChecksDeleted,
  };
}
