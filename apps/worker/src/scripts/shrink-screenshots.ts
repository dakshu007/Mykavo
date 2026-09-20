/**
 * Backfill: re-compress screenshots already in the bucket that exceed the
 * current 150KB budget.
 *
 * The budget only binds screenshots written after it shipped. Objects stored
 * under earlier, looser rules - some of them multiple megabytes - stay exactly
 * as they are, billed every month, until their snapshot ages out of the
 * retention window months later. This walks them and shrinks them now.
 *
 * WHY IT IS MORE THAN "download, re-encode, upload": screenshot keys are
 * CONTENT-ADDRESSED. The key is the hash of the bytes, so a re-encoded image
 * is by definition a different object under a different key. The old key is
 * still named by every snapshot row that stored it, so the order below is the
 * only safe one:
 *
 *   1. upload the smaller image under its new key
 *   2. repoint every snapshot row from the old key to the new one
 *   3. only then delete the old object
 *
 * Interrupted between 1 and 2 it wastes one object; interrupted between 2 and
 * 3 it leaves one orphan for the retention sweep. Done in any other order, an
 * interruption leaves rows pointing at an object that no longer exists, and
 * the change detail page shows a broken image forever.
 *
 * Dry run by default. Pass --apply to write.
 *
 * Usage:
 *   ARTIFACT_STORE=r2 R2_ACCOUNT_ID=… R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=… \
 *   DATABASE_URL=… pnpm --dir apps/worker exec tsx src/scripts/shrink-screenshots.ts [--apply] [--limit=500]
 */

import { createHash } from "node:crypto";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { compressScreenshot, MAX_SCREENSHOT_BYTES } from "@mykavo/scanner";

const apply = process.argv.includes("--apply");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : Number.POSITIVE_INFINITY;

function sha256(data: Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

async function main(): Promise<void> {
  const storage = getDefaultStorage();

  // Distinct keys, not snapshots: one oversized object can be referenced by
  // hundreds of rows, and downloading it once per row would turn a cleanup
  // into an egress bill of its own.
  const rows = await prisma.pageSnapshot.findMany({
    where: { screenshotStorageKey: { not: null } },
    select: { screenshotStorageKey: true },
    distinct: ["screenshotStorageKey"],
  });

  const keys = rows
    .map((r) => r.screenshotStorageKey)
    .filter((k): k is string => k !== null)
    .slice(0, LIMIT);

  console.log(
    `${keys.length} distinct screenshot objects to inspect ` +
      `(${apply ? "APPLYING" : "dry run - pass --apply to write"})`,
  );

  let inspected = 0;
  let shrunk = 0;
  let bytesBefore = 0;
  let bytesAfter = 0;
  let missing = 0;
  let failed = 0;

  for (const key of keys) {
    inspected += 1;
    let original: Buffer | null;
    try {
      original = await storage.get(key);
    } catch (err) {
      failed += 1;
      console.warn(`  ! read failed ${key}: ${err instanceof Error ? err.message : err}`);
      continue;
    }
    if (!original) {
      missing += 1;
      continue;
    }
    if (original.length <= MAX_SCREENSHOT_BYTES) continue;

    let compressed;
    try {
      compressed = await compressScreenshot(original);
    } catch (err) {
      failed += 1;
      console.warn(`  ! encode failed ${key}: ${err instanceof Error ? err.message : err}`);
      continue;
    }

    // No saving worth an object rewrite - leave it alone.
    if (compressed.buffer.length >= original.length) continue;

    const prefix = key.slice(0, key.lastIndexOf("/"));
    const newKey = `${prefix}/${sha256(compressed.buffer)}.jpg`;

    bytesBefore += original.length;
    bytesAfter += compressed.buffer.length;
    shrunk += 1;

    const saved = original.length - compressed.buffer.length;
    console.log(
      `  ${key} ${(original.length / 1024).toFixed(0)}KB -> ` +
        `${(compressed.buffer.length / 1024).toFixed(0)}KB (saves ${(saved / 1024).toFixed(0)}KB)` +
        (compressed.withinBudget ? "" : "  [STILL OVER BUDGET]"),
    );

    if (!apply) continue;
    if (newKey === key) continue; // identical bytes; nothing to move

    try {
      await storage.put(newKey, compressed.buffer, "image/jpeg");
      const updated = await prisma.pageSnapshot.updateMany({
        where: { screenshotStorageKey: key },
        data: { screenshotStorageKey: newKey },
      });
      // Only now is the old object unreferenced.
      await storage.delete(key).catch((err) => {
        console.warn(`  ! old object left behind ${key}: ${err}`);
      });
      console.log(`    repointed ${updated.count} snapshot(s)`);
    } catch (err) {
      failed += 1;
      console.warn(`  ! rewrite failed ${key}: ${err instanceof Error ? err.message : err}`);
    }
  }

  console.log("");
  console.log(`inspected:       ${inspected}`);
  console.log(`over budget:     ${shrunk}`);
  console.log(`missing objects: ${missing}`);
  console.log(`failures:        ${failed}`);
  console.log(
    `storage: ${(bytesBefore / 1024 / 1024).toFixed(1)}MB -> ` +
      `${(bytesAfter / 1024 / 1024).toFixed(1)}MB ` +
      `(saves ${((bytesBefore - bytesAfter) / 1024 / 1024).toFixed(1)}MB)`,
  );
  if (!apply && shrunk > 0) console.log("\nNothing was written. Re-run with --apply.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
