/**
 * Page text, line by line, on the worker's own disk (the `mykavo-data`
 * volume - free Oracle block storage), for "exact text changes".
 *
 * The database keeps only a hash of each page's text, which says THAT the
 * words changed but not WHICH. Full text for every scan would grow Postgres
 * (and its egress) without bound, and only the worker ever needs it: it
 * diffs the current scan against the baseline and stores the small result on
 * the change event. So the text lives here, gzipped, one file per snapshot.
 *
 * Everything fails soft. Missing text (a laptop without /data, a file pruned
 * or lost with the server) means a text change is reported the old way,
 * without the lines - never a failed scan.
 */

import { mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { prisma } from "@mykavo/database";
import { logger } from "./logger";

const TEXT_DIR = join(process.env.WORKER_DATA_DIR ?? "/data", "text");
/** Text older than this is deleted unless a baseline or open change still needs it. */
const KEEP_DAYS = 14;
const SAFE_ID = /^[a-z0-9]+$/i;

let warned = false;

function pathFor(snapshotId: string): string | null {
  if (!SAFE_ID.test(snapshotId)) return null;
  // cuids share a prefix; the tail spreads files across subfolders.
  return join(TEXT_DIR, snapshotId.slice(-2), `${snapshotId}.txt.gz`);
}

export async function saveSnapshotText(snapshotId: string, lines: readonly string[]): Promise<void> {
  const path = pathFor(snapshotId);
  if (!path) return;
  try {
    await mkdir(join(path, ".."), { recursive: true });
    await writeFile(path, gzipSync(Buffer.from(lines.join("\n"), "utf8")));
  } catch (err) {
    if (!warned) {
      warned = true;
      logger.warn("page text not stored - exact text changes unavailable on this worker", {
        dir: TEXT_DIR,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
}

export async function loadSnapshotText(snapshotId: string): Promise<string[] | null> {
  const path = pathFor(snapshotId);
  if (!path) return null;
  try {
    const text = gunzipSync(await readFile(path)).toString("utf8");
    return text === "" ? [] : text.split("\n");
  } catch {
    return null;
  }
}

/**
 * Deletes text nobody will diff against again: files older than KEEP_DAYS
 * whose snapshot is neither an active baseline nor behind an open change.
 * Runs after the nightly retention sweep.
 */
export async function pruneSnapshotText(now = Date.now()): Promise<number> {
  let shards: string[];
  try {
    shards = await readdir(TEXT_DIR);
  } catch {
    return 0;
  }
  const cutoff = now - KEEP_DAYS * 24 * 60 * 60 * 1000;
  const old: Array<{ id: string; path: string }> = [];
  for (const shard of shards) {
    const dir = join(TEXT_DIR, shard);
    let files: string[];
    try {
      files = await readdir(dir);
    } catch {
      continue;
    }
    for (const file of files) {
      if (!file.endsWith(".txt.gz")) continue;
      const path = join(dir, file);
      const info = await stat(path).catch(() => null);
      if (info && info.mtimeMs < cutoff) old.push({ id: file.slice(0, -".txt.gz".length), path });
    }
  }

  let deleted = 0;
  for (let i = 0; i < old.length; i += 500) {
    const batch = old.slice(i, i + 500);
    const ids = batch.map((f) => f.id);
    // Kept: active baselines (diffed on every scan) and the snapshots behind
    // open changes (one of them may be approved as the next baseline).
    // Sequential: the session pooler has a hard connection cap.
    const baselines = await prisma.baseline.findMany({
      where: { pageSnapshotId: { in: ids }, status: "ACTIVE" },
      select: { pageSnapshotId: true },
    });
    const openChanges = await prisma.changeEvent.findMany({
      where: { currentSnapshotId: { in: ids }, status: { in: ["NEW", "REVIEWED"] } },
      select: { currentSnapshotId: true },
    });
    const keep = new Set<string | null>([
      ...baselines.map((b) => b.pageSnapshotId),
      ...openChanges.map((c) => c.currentSnapshotId),
    ]);
    for (const file of batch) {
      if (keep.has(file.id)) continue;
      await rm(file.path, { force: true });
      deleted++;
    }
  }
  return deleted;
}
