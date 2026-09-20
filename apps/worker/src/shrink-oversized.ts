/**
 * Nightly shrink of screenshots stored before the 150KB cap existed.
 *
 * The cap only binds images written after it shipped. Everything stored under
 * the older, looser rules - some of it several megabytes - keeps costing
 * money every month until its snapshot ages out of the retention window,
 * which on a Pro workspace is a year away.
 *
 * WHY A SMALL NIGHTLY BATCH rather than one sweep through the bucket:
 *
 *  - Every object costs a GET, a PUT and a DELETE against a remote bucket.
 *    Rewriting tens of thousands in one run is a large, slow, billable burst
 *    that holds a worker slot while scans queue behind it.
 *  - It rewrites content-addressed objects and repoints database rows. Doing
 *    that unattended is defensible in a batch of two hundred, where a problem
 *    shows up in one night's logs and stops there. Doing it to the entire
 *    bucket in one go, unattended, is not.
 *
 * At this rate the backlog clears over weeks rather than minutes, which is
 * the right trade for storage that is already being paid for. The one-off
 * script at scripts/shrink-screenshots.ts does the same work on demand, with
 * a dry run, when somebody wants it finished sooner and is watching.
 *
 * SAFETY. The ordering is upload-new, repoint-rows, delete-old, and it is the
 * only ordering that degrades safely: interrupted between the first two steps
 * it wastes one object, and between the last two it leaves one orphan for the
 * retention sweep. Any other order can leave rows pointing at an image that
 * no longer exists, which shows up as a permanently broken screenshot on a
 * change detail page.
 */

import { createHash } from "node:crypto";
import { prisma } from "@mykavo/database";
import { compressScreenshot, getDefaultStorage, MAX_SCREENSHOT_BYTES } from "@mykavo/scanner";
import type { ArtifactStorage } from "@mykavo/scanner";
import { logger } from "./logger";

/** Objects inspected per night. Deliberately modest - see the note above. */
export const SHRINK_BATCH = Number(process.env.SHRINK_SCREENSHOTS_BATCH ?? 200);

/** Set to "0" to turn the nightly shrink off without a deploy. */
const ENABLED = process.env.SHRINK_SCREENSHOTS !== "0";

export interface ShrinkResult {
  inspected: number;
  shrunk: number;
  bytesSaved: number;
  failed: number;
  skipped: boolean;
}

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

export async function runScreenshotShrink(
  storage: ArtifactStorage = getDefaultStorage(),
  batch: number = SHRINK_BATCH,
): Promise<ShrinkResult> {
  const empty: ShrinkResult = {
    inspected: 0,
    shrunk: 0,
    bytesSaved: 0,
    failed: 0,
    skipped: true,
  };
  if (!ENABLED || batch <= 0) return empty;

  // Distinct keys, not snapshots: one oversized object can be referenced by
  // hundreds of rows, and fetching it once per row would turn a cleanup into
  // an egress bill of its own.
  const rows = await prisma.pageSnapshot.findMany({
    where: { screenshotStorageKey: { not: null } },
    select: { screenshotStorageKey: true },
    distinct: ["screenshotStorageKey"],
    take: batch,
    // Oldest first: the oldest objects are the ones stored under the loosest
    // rules, and the ones closest to ageing out unshrunk.
    orderBy: { createdAt: "asc" },
  });

  let inspected = 0;
  let shrunk = 0;
  let bytesSaved = 0;
  let failed = 0;

  for (const row of rows) {
    const key = row.screenshotStorageKey;
    if (!key) continue;
    inspected += 1;

    try {
      const original = await storage.get(key);
      // Already gone, or already small enough. Nothing owed.
      if (!original || original.length <= MAX_SCREENSHOT_BYTES) continue;

      const compressed = await compressScreenshot(original);
      if (compressed.buffer.length >= original.length) continue;

      const prefix = key.slice(0, key.lastIndexOf("/"));
      const newKey = `${prefix}/${sha256(compressed.buffer)}.jpg`;
      // Identical bytes would mean an identical key; nothing to move.
      if (newKey === key) continue;

      await storage.put(newKey, compressed.buffer, "image/jpeg");
      await prisma.pageSnapshot.updateMany({
        where: { screenshotStorageKey: key },
        data: { screenshotStorageKey: newKey },
      });
      // Only now is the old object unreferenced.
      await storage.delete(key).catch(() => {
        // Left behind rather than lost; harmless and rare.
      });

      shrunk += 1;
      bytesSaved += original.length - compressed.buffer.length;
    } catch (err) {
      failed += 1;
      logger.warn("screenshot shrink failed", {
        key,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  if (shrunk > 0 || failed > 0) {
    logger.info("screenshot shrink complete", {
      inspected,
      shrunk,
      failed,
      megabytesSaved: Number((bytesSaved / 1024 / 1024).toFixed(1)),
    });
  }

  return { inspected, shrunk, bytesSaved, failed, skipped: false };
}
