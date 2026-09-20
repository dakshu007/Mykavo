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
  findUnreferencedScreenshotKeys,
} from "@mykavo/database";
import { diffKey, historyDaysForPlan } from "@mykavo/shared";
import { getDefaultStorage, type ArtifactStorage } from "@mykavo/scanner";
import { drainArtifactPurge } from "./purge-artifacts";
import { runScreenshotShrink } from "./shrink-oversized";
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

      // A diff image belongs to exactly one page in one scan, so it goes with
      // the snapshot. Its key is derived from ids rather than by rewriting the
      // screenshot key - screenshots are content-addressed now, so the old
      // string replace would have matched nothing and orphaned every diff.
      for (const snap of expired) {
        await storage
          .delete(
            diffKey({
              workspaceId: website.workspaceId,
              scanId: snap.scanId,
              monitoredPageId: snap.monitoredPageId,
            }),
          )
          .catch(() => {});
      }

      const candidateKeys = expired
        .map((s) => s.screenshotStorageKey)
        .filter((key): key is string => key !== null);

      // ORDER MATTERS. Rows first, THEN ask what is unreferenced: screenshots
      // are content-addressed, so one object may serve many snapshots, and
      // asking while the expiring rows still exist would count them as
      // references and reclaim nothing. Asking BEFORE deleting rows and then
      // deleting the object would be worse - it could remove an image that
      // surviving snapshots, including approved baselines, still display.
      const deleted = await deleteSnapshots(
        prisma,
        expired.map((s) => s.id),
      );
      snapshotsDeleted += deleted;

      for (const key of await findUnreferencedScreenshotKeys(prisma, candidateKeys)) {
        await storage.delete(key).catch(() => {});
        artifactsDeleted++;
      }
      // Defensive: never spin if a batch failed to delete.
      if (deleted === 0 || expired.length < BATCH) break;
    }
  }

  // Safety net for the delete-time purge: if that job never ran (queue down,
  // worker restarted mid-batch), the keys are still parked in the table and
  // this is the run that clears them. Failures here must not fail the sweep -
  // expired snapshots have already been removed and that work should stand.
  try {
    const purged = await drainArtifactPurge(storage);
    artifactsDeleted += purged.deleted;
  } catch (err) {
    logger.warn("artifact purge drain failed during retention sweep", {
      error: err instanceof Error ? err.message : String(err),
    });
  }

  // Shrink a small batch of pre-cap screenshots each night. Bounded on
  // purpose: it rewrites content-addressed objects and repoints rows, which
  // is fine to do unattended two hundred at a time and is not fine to do to
  // the whole bucket at once. The backlog clears over weeks, which is the
  // right trade for storage that is already being paid for.
  try {
    await runScreenshotShrink(storage);
  } catch (err) {
    logger.warn("screenshot shrink failed during retention sweep", {
      error: err instanceof Error ? err.message : String(err),
    });
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
