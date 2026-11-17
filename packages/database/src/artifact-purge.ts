/**
 * Reclaiming object storage when a website is deleted.
 *
 * Deleting a website cascades away its scans, snapshots and change events in
 * one statement - and with them every record of which R2 objects those rows
 * owned. The bytes stay in the bucket, billed monthly, unreachable and
 * unattributable forever. A site monitored daily for a year holds thousands
 * of screenshots, so this is the single largest avoidable storage cost in the
 * product.
 *
 * The keys therefore have to be read BEFORE the cascade and parked somewhere
 * durable, because they cannot be re-derived afterwards. A worker drains that
 * table; the daily retention sweep drains it again as a safety net, so a
 * failed job delays the saving rather than losing it.
 *
 * The one thing that must never happen here is deleting an object another
 * snapshot still points at. Screenshots are content-addressed per workspace,
 * so two pages that render identically - a 404 page, a redirect stub, two
 * near-empty category pages - share a single object. Every screenshot key is
 * therefore reference-checked after the cascade, never before.
 */

import type { PrismaClient } from "@prisma/client";

type Db = Pick<PrismaClient, "pageSnapshot" | "changeEvent" | "pendingArtifactDeletion">;

/** Why a key was queued. Free text; it only ever reaches a log line. */
export type PurgeReason = "website_deleted" | "workspace_deleted";

export interface WebsiteArtifactKeys {
  /** Content-addressed and possibly shared - reference-check before deleting. */
  screenshotKeys: string[];
  /** Owned by exactly one snapshot, so safe to delete outright. */
  diffKeys: string[];
}

/**
 * Every storage key this website's rows point at, read while they still
 * exist.
 *
 * Diff keys come from the change events that recorded them rather than being
 * rebuilt from scan and page ids: the derived form is a cross product of
 * every scan against every page, which for a 500-page site with a year of
 * history is a hundred thousand mostly-imaginary keys to issue deletes for.
 * The stored metadata names only the diffs that were actually written.
 */
export async function collectWebsiteArtifactKeys(
  db: Db,
  websiteId: string,
): Promise<WebsiteArtifactKeys> {
  const snapshots = await db.pageSnapshot.findMany({
    where: { websiteId, screenshotStorageKey: { not: null } },
    select: { screenshotStorageKey: true },
    distinct: ["screenshotStorageKey"],
  });

  const changes = await db.changeEvent.findMany({
    where: { websiteId },
    select: { metadata: true },
  });

  const diffKeys = new Set<string>();
  for (const change of changes) {
    const metadata = change.metadata;
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) continue;
    const key = (metadata as Record<string, unknown>).diffStorageKey;
    if (typeof key === "string" && key.length > 0) diffKeys.add(key);
  }

  return {
    screenshotKeys: snapshots
      .map((row) => row.screenshotStorageKey)
      .filter((key): key is string => key !== null),
    diffKeys: [...diffKeys],
  };
}

/**
 * Park keys for a worker to delete.
 *
 * skipDuplicates because the same key can be queued twice - two websites in
 * one workspace whose pages render identically, or a retried delete. The
 * table is a set of outstanding work, not a log.
 */
export async function queueArtifactDeletions(
  db: Db,
  workspaceId: string,
  keys: string[],
  reason: PurgeReason,
): Promise<number> {
  const unique = [...new Set(keys)].filter((key) => key.length > 0);
  if (unique.length === 0) return 0;

  const result = await db.pendingArtifactDeletion.createMany({
    data: unique.map((storageKey) => ({ workspaceId, storageKey, reason })),
    skipDuplicates: true,
  });
  return result.count;
}

export interface PendingDeletion {
  id: string;
  workspaceId: string;
  storageKey: string;
  attempts: number;
}

/**
 * Oldest-first, so a large delete cannot starve a later small one.
 *
 * Rows that have failed repeatedly are left behind rather than retried
 * forever: a key that will not delete is usually a key that no longer exists,
 * and spending every sweep on it would stall the queue behind it.
 */
export async function takePendingArtifactDeletions(
  db: Db,
  limit: number,
  maxAttempts = 5,
): Promise<PendingDeletion[]> {
  return db.pendingArtifactDeletion.findMany({
    where: { attempts: { lt: maxAttempts } },
    orderBy: { createdAt: "asc" },
    take: limit,
    select: { id: true, workspaceId: true, storageKey: true, attempts: true },
  });
}

/** The object is gone (or was never there) - drop the row. */
export async function clearPendingArtifactDeletion(db: Db, id: string): Promise<void> {
  await db.pendingArtifactDeletion.delete({ where: { id } }).catch(() => {
    // Already drained by a concurrent sweep. Nothing to do.
  });
}

/** Record a failure so a permanently undeletable key stops blocking the queue. */
export async function recordArtifactDeletionFailure(
  db: Db,
  id: string,
  error: string,
): Promise<void> {
  await db.pendingArtifactDeletion
    .update({
      where: { id },
      data: { attempts: { increment: 1 }, lastError: error.slice(0, 500) },
    })
    .catch(() => {
      // Row vanished under us; the work is done either way.
    });
}

/** How much is still owed to the bucket. For the admin usage page. */
export async function countPendingArtifactDeletions(db: Db): Promise<number> {
  return db.pendingArtifactDeletion.count();
}
