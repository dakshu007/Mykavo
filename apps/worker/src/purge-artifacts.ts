/**
 * Drains the pending-artifact-deletion table into actual DELETE calls against
 * object storage.
 *
 * Runs from two places on purpose: a job enqueued the instant a website is
 * deleted, so the bucket shrinks while the user is still looking at the
 * screen, and the nightly retention sweep, so a queue outage or a crashed
 * job costs hours of storage rather than losing the reclaim entirely. Both
 * call this same function, and it is idempotent, so running twice at once is
 * harmless - the second pass simply finds fewer rows.
 *
 * Bounded by design. A workspace deleting a year-old site can queue tens of
 * thousands of objects, and each delete is a billed Class A operation against
 * a remote bucket; doing them all in one unbounded burst would hold a worker
 * slot for minutes and hammer the rate limit. It takes a batch, finishes it,
 * and leaves the rest for the next run.
 */

import {
  prisma,
  takePendingArtifactDeletions,
  clearPendingArtifactDeletion,
  recordArtifactDeletionFailure,
} from "@mykavo/database";
import { getDefaultStorage, type ArtifactStorage } from "@mykavo/scanner";
import { logger } from "./logger";

/** Objects deleted per run. Keeps one sweep off a worker for minutes. */
export const PURGE_BATCH = 500;

/** Parallel deletes. High enough to be quick, low enough not to be abuse. */
const CONCURRENCY = 8;

export interface PurgeResult {
  deleted: number;
  failed: number;
  /** True when the batch filled up, i.e. there is more waiting. */
  more: boolean;
}

export async function runArtifactPurge(
  storage: ArtifactStorage = getDefaultStorage(),
  batch: number = PURGE_BATCH,
): Promise<PurgeResult> {
  const pending = await takePendingArtifactDeletions(prisma, batch);
  if (pending.length === 0) return { deleted: 0, failed: 0, more: false };

  let deleted = 0;
  let failed = 0;

  // A simple worker pool over the batch rather than Promise.all over all of
  // it: 500 simultaneous requests to R2 is the kind of burst that gets an
  // account rate-limited, and a rate-limited delete is a row that comes back
  // tomorrow having achieved nothing.
  const queue = [...pending];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const row = queue.shift();
      if (!row) return;
      try {
        await storage.delete(row.storageKey);
        await clearPendingArtifactDeletion(prisma, row.id);
        deleted += 1;
      } catch (err) {
        failed += 1;
        await recordArtifactDeletionFailure(
          prisma,
          row.id,
          err instanceof Error ? err.message : String(err),
        );
      }
    }
  });
  await Promise.all(workers);

  logger.info("artifact purge batch complete", {
    deleted,
    failed,
    requested: pending.length,
  });

  return { deleted, failed, more: pending.length === batch };
}

/**
 * Keep draining until the queue is empty or the budget runs out.
 *
 * The budget exists because "delete everything outstanding" is an unbounded
 * promise: one workspace deleting fifty sites at once would otherwise keep a
 * worker busy indefinitely while scans queue up behind it. Whatever is left
 * is picked up by the next run.
 */
export async function drainArtifactPurge(
  storage: ArtifactStorage = getDefaultStorage(),
  maxBatches = 20,
): Promise<PurgeResult> {
  let deleted = 0;
  let failed = 0;
  let more = false;

  for (let i = 0; i < maxBatches; i += 1) {
    const result = await runArtifactPurge(storage);
    deleted += result.deleted;
    failed += result.failed;
    more = result.more;
    if (!result.more) break;
  }

  if (deleted > 0 || failed > 0) {
    logger.info("artifact purge complete", { deleted, failed, more });
  }
  return { deleted, failed, more };
}
