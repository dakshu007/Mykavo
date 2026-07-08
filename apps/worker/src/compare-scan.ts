/**
 * Compare a completed scan against each page's approved baseline and persist
 * ChangeEvents (spec §24). Runs for SCHEDULED/MANUAL scans only — a BASELINE
 * scan establishes the baseline and must not create change events (spec §14).
 *
 * Idempotent: re-running deletes this scan's existing change events first, so
 * a retried job produces exactly one set.
 */

import { prisma, type ChangeSeverity } from "@fluxen/database";
import {
  compareSnapshots,
  compareScreenshots,
  highestSeverity,
  scoreChange,
  type ComparableSnapshot,
  type ScoredChange,
  type Severity,
} from "@fluxen/comparison-engine";
import { getDefaultStorage, type ArtifactStorage } from "@fluxen/scanner";
import { logger } from "./logger";

const CATEGORY_TO_ENUM = {
  AVAILABILITY: "AVAILABILITY",
  VISUAL: "VISUAL",
  SEO: "SEO",
  CONTENT: "CONTENT",
  LINKS: "LINKS",
  SCRIPT: "SCRIPT",
  PERFORMANCE: "PERFORMANCE",
  CONVERSION: "CONVERSION",
} as const;

interface SnapshotRow {
  id: string;
  monitoredPageId: string;
  httpStatus: number | null;
  finalUrl: string | null;
  domHash: string | null;
  textHash: string | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Values: unknown;
  pageWeightBytes: number | null;
  requestCount: number | null;
  responseTimeMs: number | null;
  screenshotStorageKey: string | null;
  errorCode: string | null;
}

async function toComparable(snapshot: SnapshotRow): Promise<ComparableSnapshot> {
  const [links, scripts] = await Promise.all([
    prisma.pageLink.findMany({
      where: { pageSnapshotId: snapshot.id },
      select: { normalizedUrl: true, linkType: true },
    }),
    prisma.pageScript.findMany({
      where: { pageSnapshotId: snapshot.id },
      select: { domain: true, isThirdParty: true, src: true },
    }),
  ]);

  return {
    httpStatus: snapshot.httpStatus,
    finalUrl: snapshot.finalUrl,
    redirectCount: 0, // redirect chain isn't persisted per-snapshot yet
    domHash: snapshot.domHash,
    textHash: snapshot.textHash,
    title: snapshot.title,
    metaDescription: snapshot.metaDescription,
    canonicalUrl: snapshot.canonicalUrl,
    robotsMeta: snapshot.robotsMeta,
    h1Values: Array.isArray(snapshot.h1Values) ? (snapshot.h1Values as string[]) : [],
    pageWeightBytes: snapshot.pageWeightBytes,
    requestCount: snapshot.requestCount,
    responseTimeMs: snapshot.responseTimeMs,
    links,
    scripts: scripts.map((s) => ({
      domain: s.domain,
      isThirdParty: s.isThirdParty,
      service: detectService(s.src),
    })),
  };
}

const KNOWN_SERVICES: Array<[RegExp, string]> = [
  [/googletagmanager\.com/i, "Google Tag Manager"],
  [/google-analytics\.com|googleanalytics/i, "Google Analytics"],
  [/connect\.facebook\.net/i, "Meta Pixel"],
  [/js\.stripe\.com/i, "Stripe"],
  [/hotjar\.com/i, "Hotjar"],
  [/intercom(?:cdn)?\.(io|com)/i, "Intercom"],
  [/hs-scripts\.com|hubspot/i, "HubSpot"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/plausible\.io/i, "Plausible"],
];

function detectService(src: string): string | null {
  return KNOWN_SERVICES.find(([re]) => re.test(src))?.[1] ?? null;
}

export async function runComparisonForScan(
  scanId: string,
  storage: ArtifactStorage = getDefaultStorage(),
): Promise<{ changes: number; highest: ChangeSeverity | null }> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    select: { id: true, websiteId: true, triggerType: true },
  });
  if (!scan || scan.triggerType === "BASELINE") return { changes: 0, highest: null };

  // Idempotency: clear any prior change events for this scan.
  await prisma.changeEvent.deleteMany({ where: { scanId } });

  const snapshots = (await prisma.pageSnapshot.findMany({
    where: { scanId, errorCode: null },
    select: {
      id: true,
      monitoredPageId: true,
      httpStatus: true,
      finalUrl: true,
      domHash: true,
      textHash: true,
      title: true,
      metaDescription: true,
      canonicalUrl: true,
      robotsMeta: true,
      h1Values: true,
      pageWeightBytes: true,
      requestCount: true,
      responseTimeMs: true,
      screenshotStorageKey: true,
      errorCode: true,
    },
  })) as SnapshotRow[];

  const severities: Severity[] = [];
  let totalChanges = 0;

  for (const snapshot of snapshots) {
    const baseline = await prisma.baseline.findFirst({
      where: { monitoredPageId: snapshot.monitoredPageId, status: "ACTIVE" },
      include: {
        pageSnapshot: {
          select: {
            id: true,
            monitoredPageId: true,
            httpStatus: true,
            finalUrl: true,
            domHash: true,
            textHash: true,
            title: true,
            metaDescription: true,
            canonicalUrl: true,
            robotsMeta: true,
            h1Values: true,
            pageWeightBytes: true,
            requestCount: true,
            responseTimeMs: true,
            screenshotStorageKey: true,
            errorCode: true,
          },
        },
      },
    });
    // No baseline yet (e.g. page added after the baseline scan) — nothing to
    // compare against. Establish one so the next scan can compare.
    if (!baseline) continue;

    const baselineSnap = baseline.pageSnapshot as SnapshotRow;
    const [baseComparable, currComparable] = await Promise.all([
      toComparable(baselineSnap),
      toComparable(snapshot),
    ]);

    const changes: Array<ScoredChange & { metadata?: Record<string, unknown> }> =
      compareSnapshots(baseComparable, currComparable);

    // Visual diff (skipped when the page is broken — screenshot is unreliable).
    const currentBroken = (snapshot.httpStatus ?? 0) >= 400;
    if (!currentBroken && baselineSnap.screenshotStorageKey && snapshot.screenshotStorageKey) {
      try {
        const [baseImg, currImg] = await Promise.all([
          storage.get(baselineSnap.screenshotStorageKey),
          storage.get(snapshot.screenshotStorageKey),
        ]);
        if (baseImg && currImg) {
          const visual = compareScreenshots(baseImg, currImg);
          if (visual) {
            await prisma.pageSnapshot.update({
              where: { id: snapshot.id },
              data: { visualDifferencePercentage: visual.differencePercentage },
            });
            const scored = scoreChange({
              kind: "visual_diff",
              percentage: visual.differencePercentage,
            });
            if (scored) {
              const diffKey = `${snapshot.screenshotStorageKey.replace(/screenshot\.jpg$/, "")}diff.png`;
              await storage.put(diffKey, visual.diffPng, "image/png");
              changes.push({ ...scored, metadata: { diffStorageKey: diffKey } });
            }
          }
        }
      } catch (err) {
        logger.warn("visual diff failed", {
          scanId,
          snapshotId: snapshot.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    for (const change of changes) {
      await prisma.changeEvent.create({
        data: {
          websiteId: scan.websiteId,
          monitoredPageId: snapshot.monitoredPageId,
          previousSnapshotId: baselineSnap.id,
          currentSnapshotId: snapshot.id,
          scanId,
          category: CATEGORY_TO_ENUM[change.category],
          changeType: change.changeType,
          severity: change.severity as ChangeSeverity,
          title: change.title,
          description: change.description,
          previousValue: change.previousValue,
          currentValue: change.currentValue,
          metadata: (change.metadata ?? undefined) as never,
          status: "NEW",
        },
      });
      severities.push(change.severity);
      totalChanges++;
    }
  }

  const highest = highestSeverity(severities) as ChangeSeverity | null;
  await prisma.scan.update({
    where: { id: scanId },
    data: { changesDetected: totalChanges, highestSeverity: highest },
  });

  logger.info("comparison completed", { scanId, changes: totalChanges, highest });
  return { changes: totalChanges, highest };
}
