/**
 * Internal link status check (spec §20). Runs once per scan after snapshots
 * are persisted: probes each unique internal link and records the HTTP status
 * in this scan's link lists (the history files, or PageLink rows for older
 * snapshots), and each page's broken links on its snapshot row. Comparison
 * then reports links that newly became broken; the SEO report reads the
 * broken links.
 *
 * Cost controls (spec §43/§60): internal links only, one probe per unique
 * URL, statuses of monitored pages scanned in this scan are reused for free,
 * and probes are capped per scan. Only definite outcomes are recorded - see
 * @mykavo/shared link-check for the false-positive posture.
 */

import { prisma, type Prisma } from "@mykavo/database";
import {
  MAX_LINK_CHECKS_PER_SCAN,
  mapWithConcurrency,
  normalizeUrl,
  planLinkChecks,
  probeLinkStatus,
  scanHistoryKey,
  type BrokenLinkEntry,
  type ScanHistory,
} from "@mykavo/shared";
import { getDefaultStorage, type ArtifactStorage } from "@mykavo/scanner";
import { isBrokenLinkStatus } from "@mykavo/comparison-engine";
import { logger } from "./logger";
import { loadSnapshotHistory, writeScanHistory } from "./scan-history-store";

const PROBE_CONCURRENCY = 4;
const WRITE_CONCURRENCY = 5;

function safeNormalize(url: string | null): string | null {
  if (!url) return null;
  try {
    return normalizeUrl(url);
  } catch {
    return null;
  }
}

export async function checkLinksForScan(
  scanId: string,
  storage: ArtifactStorage = getDefaultStorage(),
): Promise<void> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { website: { select: { workspaceId: true } } },
  });
  if (!scan) return;
  const workspaceId = scan.website.workspaceId;
  const snapshots = await prisma.pageSnapshot.findMany({
    where: { scanId, errorCode: null },
    select: {
      id: true,
      scanId: true,
      monitoredPageId: true,
      linkCount: true,
      url: true,
      finalUrl: true,
      httpStatus: true,
    },
  });
  if (snapshots.length === 0) return;

  // Each page's links, from its history file (or legacy rows). A page whose
  // file can't be read is left out of this check rather than failing it.
  const histories = new Map<string, ScanHistory>();
  for (const snap of snapshots) {
    try {
      histories.set(snap.id, await loadSnapshotHistory(storage, workspaceId, snap));
    } catch (err) {
      logger.warn("link check skipped a page - links unreadable", {
        scanId,
        pageSnapshotId: snap.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const internalUrls: string[] = [];
  for (const history of histories.values()) {
    for (const link of history.links) {
      if (link.linkType === "INTERNAL") internalUrls.push(link.normalizedUrl);
    }
  }
  if (internalUrls.length === 0) return;

  // Monitored pages scanned in this scan already have an observed status -
  // links pointing at them never need a probe.
  const known = new Map<string, number>();
  for (const s of snapshots) {
    if (s.httpStatus === null) continue;
    for (const key of [safeNormalize(s.url), safeNormalize(s.finalUrl)]) {
      if (key && !known.has(key)) known.set(key, s.httpStatus);
    }
  }

  const plan = planLinkChecks(internalUrls, known, MAX_LINK_CHECKS_PER_SCAN);

  const probed = await mapWithConcurrency(plan.toCheck, PROBE_CONCURRENCY, async (url) => {
    const result = await probeLinkStatus(url);
    return { url, status: result.status };
  });

  // Every definite status (reused page statuses included). Indeterminate
  // probes stay null - never assumed broken.
  const statuses = new Map<string, number>(plan.reused);
  for (const { url, status } of probed) {
    if (status !== null) statuses.set(url, status);
  }

  // Record the statuses where the links live, plus each page's broken
  // internal links on its snapshot row for the dashboard.
  const legacyIds = snapshots.filter((s) => s.linkCount === null).map((s) => s.id);
  await mapWithConcurrency(snapshots, WRITE_CONCURRENCY, async (snap) => {
    const history = histories.get(snap.id);
    if (!history) return;
    const brokenLinks: BrokenLinkEntry[] = [];
    const seenBroken = new Set<string>();
    for (const link of history.links) {
      if (link.linkType !== "INTERNAL") continue;
      const status = statuses.get(link.normalizedUrl);
      if (status === undefined) continue;
      link.statusCode = status;
      if (isBrokenLinkStatus(status) && !seenBroken.has(link.normalizedUrl)) {
        seenBroken.add(link.normalizedUrl);
        brokenLinks.push({ normalizedUrl: link.normalizedUrl, statusCode: status });
      }
    }
    if (snap.linkCount !== null) {
      await writeScanHistory(
        storage,
        scanHistoryKey({ workspaceId, scanId: snap.scanId, monitoredPageId: snap.monitoredPageId }),
        history,
      );
    }
    await prisma.pageSnapshot.update({
      where: { id: snap.id },
      data: { brokenLinks: brokenLinks as unknown as Prisma.InputJsonValue },
      select: { id: true },
    });
  });
  if (legacyIds.length > 0) {
    await mapWithConcurrency([...statuses], WRITE_CONCURRENCY, ([url, status]) =>
      prisma.pageLink.updateMany({
        where: { pageSnapshotId: { in: legacyIds }, normalizedUrl: url, linkType: "INTERNAL" },
        data: { statusCode: status },
      }),
    );
  }

  let broken = 0;
  for (const status of statuses.values()) {
    if (isBrokenLinkStatus(status)) broken++;
  }
  logger.info("link check completed", {
    scanId,
    uniqueLinks: plan.toCheck.length + plan.reused.size + plan.dropped,
    probed: plan.toCheck.length,
    reused: plan.reused.size,
    dropped: plan.dropped,
    broken,
  });
}
