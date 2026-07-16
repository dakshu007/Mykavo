/**
 * Internal link status check (spec §20). Runs once per scan after snapshots
 * are persisted: probes each unique internal link and records the HTTP status
 * on this scan's PageLink rows. Comparison then reports links that newly
 * became broken; the SEO report reads the same statuses.
 *
 * Cost controls (spec §43/§60): internal links only, one probe per unique
 * URL, statuses of monitored pages scanned in this scan are reused for free,
 * and probes are capped per scan. Only definite outcomes are recorded - see
 * @mykavo/shared link-check for the false-positive posture.
 */

import { prisma } from "@mykavo/database";
import {
  MAX_LINK_CHECKS_PER_SCAN,
  mapWithConcurrency,
  normalizeUrl,
  planLinkChecks,
  probeLinkStatus,
} from "@mykavo/shared";
import { isBrokenLinkStatus } from "@mykavo/comparison-engine";
import { logger } from "./logger";

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

export async function checkLinksForScan(scanId: string): Promise<void> {
  const snapshots = await prisma.pageSnapshot.findMany({
    where: { scanId, errorCode: null },
    select: { id: true, url: true, finalUrl: true, httpStatus: true },
  });
  if (snapshots.length === 0) return;
  const snapshotIds = snapshots.map((s) => s.id);

  const links = await prisma.pageLink.findMany({
    where: { pageSnapshotId: { in: snapshotIds }, linkType: "INTERNAL" },
    select: { normalizedUrl: true },
  });
  if (links.length === 0) return;

  // Monitored pages scanned in this scan already have an observed status -
  // links pointing at them never need a probe.
  const known = new Map<string, number>();
  for (const s of snapshots) {
    if (s.httpStatus === null) continue;
    for (const key of [safeNormalize(s.url), safeNormalize(s.finalUrl)]) {
      if (key && !known.has(key)) known.set(key, s.httpStatus);
    }
  }

  const plan = planLinkChecks(
    links.map((l) => l.normalizedUrl),
    known,
    MAX_LINK_CHECKS_PER_SCAN,
  );

  const probed = await mapWithConcurrency(plan.toCheck, PROBE_CONCURRENCY, async (url) => {
    const result = await probeLinkStatus(url);
    return { url, status: result.status };
  });

  // Persist every definite status onto this scan's PageLink rows (reused page
  // statuses included). Indeterminate probes stay null - never assumed broken.
  const statuses = new Map<string, number>(plan.reused);
  for (const { url, status } of probed) {
    if (status !== null) statuses.set(url, status);
  }
  await mapWithConcurrency([...statuses], WRITE_CONCURRENCY, ([url, status]) =>
    prisma.pageLink.updateMany({
      where: { pageSnapshotId: { in: snapshotIds }, normalizedUrl: url, linkType: "INTERNAL" },
      data: { statusCode: status },
    }),
  );

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
