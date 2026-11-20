/**
 * Links and scripts per snapshot, stored as one gzipped JSON file in object
 * storage (R2) instead of PageLink/PageScript rows. Reading them from
 * Postgres on every comparison was most of the scan pipeline's database
 * egress; R2 reads cost no egress.
 *
 * Where a snapshot's lists live is recorded on the row: `linkCount` is set
 * only after the file was written. Rows with a null `linkCount` are older
 * snapshots (or ones whose upload failed) and still read from the tables, so
 * nothing written before this change is lost.
 */

import { gunzipSync, gzipSync } from "node:zlib";
import { prisma } from "@mykavo/database";
import {
  decodeScanHistory,
  encodeScanHistory,
  scanHistoryKey,
  type ScanHistory,
} from "@mykavo/shared";
import type { ArtifactStorage } from "@mykavo/scanner";

export interface HistorySnapshotRef {
  id: string;
  scanId: string;
  monitoredPageId: string;
  linkCount: number | null;
}

/** The file for a snapshot was expected but is not there. */
export class ScanHistoryMissingError extends Error {
  constructor(key: string) {
    super(`scan history file missing: ${key}`);
    this.name = "ScanHistoryMissingError";
  }
}

export async function writeScanHistory(
  storage: ArtifactStorage,
  key: string,
  history: ScanHistory,
): Promise<void> {
  await storage.put(key, gzipSync(Buffer.from(encodeScanHistory(history), "utf8")), "application/gzip");
}

export async function readScanHistory(storage: ArtifactStorage, key: string): Promise<ScanHistory | null> {
  const body = await storage.get(key);
  if (!body) return null;
  return decodeScanHistory(gunzipSync(body).toString("utf8"));
}

/**
 * A snapshot's links and scripts from wherever they live. Throws when the
 * file should exist but does not, so a comparison fails loudly instead of
 * reporting every link and script as removed.
 */
export async function loadSnapshotHistory(
  storage: ArtifactStorage,
  workspaceId: string,
  snapshot: HistorySnapshotRef,
): Promise<ScanHistory> {
  if (snapshot.linkCount !== null) {
    const key = scanHistoryKey({ workspaceId, scanId: snapshot.scanId, monitoredPageId: snapshot.monitoredPageId });
    const history = await readScanHistory(storage, key);
    if (!history) throw new ScanHistoryMissingError(key);
    return history;
  }
  const [links, scripts] = await Promise.all([
    prisma.pageLink.findMany({
      where: { pageSnapshotId: snapshot.id },
      select: { url: true, normalizedUrl: true, linkType: true, statusCode: true },
    }),
    prisma.pageScript.findMany({
      where: { pageSnapshotId: snapshot.id },
      select: { src: true, domain: true, isThirdParty: true },
    }),
  ]);
  return { links, scripts };
}

const BACKFILL_BATCH = 50;

/**
 * Copies the links and scripts of every ACTIVE baseline snapshot that still
 * keeps them as rows into a file, so comparisons - which always read the
 * baseline - stop reading those rows. Only baselines: older history is never
 * compared again and expires with retention.
 *
 * Idempotent and bounded: each snapshot is copied once (linkCount marks it),
 * and a run with nothing to do costs one small query.
 */
export async function backfillBaselineHistory(storage: ArtifactStorage): Promise<number> {
  let copied = 0;
  const failed = new Set<string>();
  for (;;) {
    const rows = await prisma.baseline.findMany({
      where: {
        status: "ACTIVE",
        pageSnapshot: { linkCount: null, errorCode: null },
        pageSnapshotId: { notIn: [...failed] },
      },
      select: {
        pageSnapshot: {
          select: { id: true, scanId: true, monitoredPageId: true, linkCount: true },
        },
        website: { select: { workspaceId: true } },
      },
      take: BACKFILL_BATCH,
    });
    if (rows.length === 0) break;
    for (const { pageSnapshot: snap, website } of rows) {
      try {
        const history = await loadSnapshotHistory(storage, website.workspaceId, snap);
        await writeScanHistory(
          storage,
          scanHistoryKey({ workspaceId: website.workspaceId, scanId: snap.scanId, monitoredPageId: snap.monitoredPageId }),
          history,
        );
        await prisma.pageSnapshot.update({
          where: { id: snap.id },
          data: { linkCount: history.links.length, scriptCount: history.scripts.length },
          select: { id: true },
        });
        copied++;
      } catch {
        // Left on its rows (still read correctly); retried on the next run.
        failed.add(snap.id);
      }
    }
  }
  return copied;
}
