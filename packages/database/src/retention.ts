/**
 * Retention cleanup helpers (Phase 10, spec §60 / §91). Deletes expired scan
 * history so storage and DB growth stay bounded and plan-based.
 *
 * SAFETY — the single most important invariant: a `PageSnapshot` referenced by
 * ANY `Baseline` is NEVER deleted here. `Baseline.pageSnapshot` is
 * `onDelete: Cascade`, so deleting a baseline's snapshot would silently destroy
 * the baseline and break comparison. `findExpiredSnapshots` therefore excludes
 * every baseline-referenced snapshot for the website.
 *
 * Pure persistence: the worker orchestrates (resolves each workspace's window,
 * deletes artifacts) and calls these. Every function takes a Prisma client or
 * transaction client.
 */

import type { PrismaClient, Prisma } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

export interface ExpiredSnapshot {
  id: string;
  screenshotStorageKey: string | null;
  scanId: string;
  monitoredPageId: string;
}

/**
 * Expired snapshots for a website (createdAt < cutoff) that are safe to delete,
 * i.e. NOT referenced by any baseline. Returns up to `limit`, oldest first, so
 * the worker can page through a large backlog across sweeps.
 */
export async function findExpiredSnapshots(
  db: Db,
  params: { websiteId: string; cutoff: Date; limit: number },
): Promise<ExpiredSnapshot[]> {
  const baselines = await db.baseline.findMany({
    where: { websiteId: params.websiteId },
    select: { pageSnapshotId: true },
  });
  const protectedIds = baselines.map((b) => b.pageSnapshotId);

  return db.pageSnapshot.findMany({
    where: {
      websiteId: params.websiteId,
      createdAt: { lt: params.cutoff },
      ...(protectedIds.length ? { id: { notIn: protectedIds } } : {}),
    },
    select: { id: true, screenshotStorageKey: true, scanId: true, monitoredPageId: true },
    orderBy: { createdAt: "asc" },
    take: params.limit,
  });
}

/** Delete snapshots by id (cascades PageLink/PageScript/MonitoredElementResult;
 *  ChangeEvent snapshot refs become null). Returns the number deleted. */
export async function deleteSnapshots(db: Db, ids: string[]): Promise<number> {
  if (ids.length === 0) return 0;
  const res = await db.pageSnapshot.deleteMany({ where: { id: { in: ids } } });
  return res.count;
}

/** Delete a website's change events older than the cutoff. Returns the count. */
export async function deleteExpiredChangeEvents(
  db: Db,
  params: { websiteId: string; cutoff: Date },
): Promise<number> {
  const res = await db.changeEvent.deleteMany({
    where: { websiteId: params.websiteId, detectedAt: { lt: params.cutoff } },
  });
  return res.count;
}

/**
 * Of `keys`, the ones no PageSnapshot references any more - i.e. safe to
 * delete from object storage.
 *
 * Screenshots are content-addressed (see @mykavo/shared artifact-keys), so an
 * unchanged page resolves to ONE object referenced by every snapshot of it.
 * Deleting on the old assumption - that a snapshot owns its screenshot - would
 * remove an image that surviving snapshots, INCLUDING APPROVED BASELINES,
 * still display. A baseline that renders a missing image is silent damage:
 * nothing errors, the comparison just has nothing to show.
 *
 * MUST be called AFTER the expired snapshot rows are deleted. Called before,
 * the expiring rows count as references and nothing is ever reclaimed.
 *
 * Legacy per-scan keys pass through this unchanged: they are referenced by
 * exactly one snapshot, so once it is gone the count is zero and the object
 * is deleted, exactly as before.
 */
export async function findUnreferencedScreenshotKeys(
  db: Db,
  keys: string[],
): Promise<string[]> {
  const unique = [...new Set(keys)];
  if (unique.length === 0) return [];

  const stillReferenced = await db.pageSnapshot.findMany({
    where: { screenshotStorageKey: { in: unique } },
    select: { screenshotStorageKey: true },
    distinct: ["screenshotStorageKey"],
  });

  const referenced = new Set(
    stillReferenced
      .map((row) => row.screenshotStorageKey)
      .filter((key): key is string => key !== null),
  );
  return unique.filter((key) => !referenced.has(key));
}
