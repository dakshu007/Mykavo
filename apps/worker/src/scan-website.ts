/**
 * SCAN_WEBSITE job (spec §41): loads the scan's monitored pages, scans each
 * through the browser pool, persists snapshots, and rolls up the scan
 * status. Idempotent — pages that already have a snapshot for this scan
 * are skipped, so a retried job resumes where it stopped.
 */

import { prisma, createInitialBaselinesForScan, getWorkspaceEntitlement } from "@fluxen/database";
import {
  BrowserPool,
  ScanPageError,
  getDefaultStorage,
  scanPage,
  type ArtifactStorage,
} from "@fluxen/scanner";
import { computeNextScanAt, parseSelectorList } from "@fluxen/shared";
import { logger } from "./logger";
import { runComparisonForScan } from "./compare-scan";
import { captureSiteMeta } from "./site-meta";
import { notifyForScan } from "./notify";

const PAGE_CONCURRENCY = 3;

export async function runScanWebsiteJob(
  scanId: string,
  pool: BrowserPool,
  storage: ArtifactStorage = getDefaultStorage(),
): Promise<void> {
  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: {
      website: {
        include: {
          monitoredPages: {
            where: { enabled: true },
            orderBy: { createdAt: "asc" },
            // Conversion elements to observe on each page (Phase 9).
            include: { monitoredElements: { where: { enabled: true } } },
          },
        },
      },
    },
  });

  if (!scan) {
    logger.warn("scan not found — dropping job", { scanId });
    return;
  }
  if (scan.status === "COMPLETED" || scan.status === "PARTIAL" || scan.status === "FAILED") {
    logger.info("scan already finished — skipping", { scanId, status: scan.status });
    return;
  }

  const { website } = scan;
  const log = {
    scanId,
    websiteId: website.id,
    workspaceId: website.workspaceId,
  };
  const pages = website.monitoredPages;

  // Stabilization settings (spec §25/§36): website-level ignored selectors
  // and screenshot masks apply to every page scan. The Json? columns are
  // parsed defensively — anything that isn't a clean selector array degrades
  // to no selectors rather than failing the scan.
  const ignoredSelectors = parseSelectorList(website.ignoredSelectors);
  const screenshotMasks = parseSelectorList(website.screenshotMasks);

  // Conversion element monitoring is Pro-only (spec §37). Gate here so a
  // downgraded workspace's configured elements simply stop being checked.
  const entitlement = await getWorkspaceEntitlement(prisma, website.workspaceId);
  const conversionEnabled = entitlement?.planId === "pro";

  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status: "RUNNING",
      startedAt: scan.startedAt ?? new Date(),
      pagesRequested: pages.length,
    },
  });
  if (scan.triggerType === "BASELINE") {
    await prisma.website.update({
      where: { id: website.id },
      data: { status: "BASELINING" },
    });
  }
  logger.info("scan started", { ...log, pages: pages.length });

  // Skip pages already snapshotted by a previous attempt of this job.
  const existing = await prisma.pageSnapshot.findMany({
    where: { scanId },
    select: { monitoredPageId: true },
  });
  const done = new Set(existing.map((s) => s.monitoredPageId));
  const pending = pages.filter((p) => !done.has(p.id));

  let scanned = existing.length;
  let failed = 0;

  async function scanOne(page: (typeof pages)[number]): Promise<void> {
    const artifactPrefix = `ws/${website.workspaceId}/scan/${scanId}/${page.id}`;
    const elementInputs = conversionEnabled
      ? page.monitoredElements.map((e) => ({
          id: e.id,
          name: e.name,
          selector: e.selector,
          importance: e.importance,
          expectedExistence: e.expectedExistence,
          expectedVisibility: e.expectedVisibility,
          expectedText: e.expectedText,
          expectedHref: e.expectedHref,
        }))
      : [];
    try {
      const result = await pool.withBrowser((browser) =>
        scanPage(browser, page.url, storage, {
          artifactPrefix,
          elements: elementInputs,
          ignoredSelectors,
          screenshotMasks,
        }),
      );
      await prisma.pageSnapshot.create({
        data: {
          scanId,
          monitoredPageId: page.id,
          websiteId: website.id,
          url: result.url,
          finalUrl: result.finalUrl,
          httpStatus: result.httpStatus,
          responseTimeMs: result.responseTimeMs,
          htmlHash: result.htmlHash,
          domHash: result.domHash,
          textHash: result.textHash,
          screenshotStorageKey: result.screenshotStorageKey,
          screenshotHash: result.screenshotHash,
          title: result.title,
          metaDescription: result.metaDescription,
          canonicalUrl: result.canonicalUrl,
          robotsMeta: result.robotsMeta,
          h1Values: result.h1Values,
          structuredDataHash: result.structuredDataHash,
          pageWeightBytes: result.pageWeightBytes,
          requestCount: result.requestCount,
          links: {
            create: result.links.map((l) => ({
              url: l.url.slice(0, 2048),
              normalizedUrl: l.normalizedUrl.slice(0, 2048),
              linkType: l.linkType,
            })),
          },
          scripts: {
            create: result.scripts.map((s) => ({
              src: s.src.slice(0, 2048),
              domain: s.domain,
              isThirdParty: s.isThirdParty,
            })),
          },
          monitoredElementResults: {
            create: result.elements.map((e) => ({
              monitoredElementId: e.id,
              name: e.name,
              selector: e.selector.slice(0, 1000),
              importance: e.importance,
              expectedExistence: e.expectedExistence,
              expectedVisibility: e.expectedVisibility,
              expectedText: e.expectedText,
              expectedHref: e.expectedHref ? e.expectedHref.slice(0, 2048) : null,
              exists: e.exists,
              visible: e.visible,
              text: e.text ? e.text.slice(0, 1000) : null,
              href: e.href ? e.href.slice(0, 2048) : null,
            })),
          },
        },
      });
      scanned++;
      logger.info("page scanned", {
        ...log,
        monitoredPageId: page.id,
        httpStatus: result.httpStatus,
        weightKb: Math.round(result.pageWeightBytes / 1024),
      });
    } catch (err) {
      failed++;
      const code = err instanceof ScanPageError ? err.code : "SCAN_FAILED";
      const message =
        err instanceof Error ? err.message.slice(0, 500) : "Unknown scan failure";
      // Persist a failed snapshot so partial results stay visible (spec §35).
      await prisma.pageSnapshot
        .create({
          data: {
            scanId,
            monitoredPageId: page.id,
            websiteId: website.id,
            url: page.url,
            errorCode: code,
            errorMessage: message,
          },
        })
        .catch(() => {});
      logger.error("page scan failed", { ...log, monitoredPageId: page.id, code }, err);
    }
  }

  // Bounded page concurrency within the job (pool also caps globally).
  const queue = [...pending];
  const runners = Array.from({ length: Math.min(PAGE_CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const page = queue.shift();
      if (!page) return;
      await scanOne(page);
    }
  });
  await Promise.all(runners);

  const status = failed === 0 ? "COMPLETED" : scanned > failed ? "PARTIAL" : "FAILED";
  await prisma.scan.update({
    where: { id: scanId },
    data: {
      status,
      completedAt: new Date(),
      pagesScanned: scanned,
      pagesFailed: failed,
      errorCode: status === "FAILED" ? "ALL_PAGES_FAILED" : null,
    },
  });
  const finishedAt = new Date();
  const nowActive = status !== "FAILED";
  await prisma.website.update({
    where: { id: website.id },
    data: {
      lastScanAt: finishedAt,
      // A finished scan (even partial) puts the website into ACTIVE monitoring
      // and re-arms recurring scans (spec §40). Failures pause scheduling.
      status: nowActive ? "ACTIVE" : "ERROR",
      nextScanAt: nowActive
        ? computeNextScanAt(website.scanFrequency, finishedAt)
        : null,
    },
  });

  // Site-level SEO capture (robots.txt + sitemap) — once per scan, before
  // comparison reads it. Never fails the scan.
  if (scanned > 0) {
    await captureSiteMeta({ scanId, websiteId: website.id, websiteUrl: website.url });
  }

  if (scan.triggerType === "BASELINE" && scanned > 0) {
    // The first successful scan establishes baselines (spec §14): every
    // successfully-scanned page without an existing baseline gets version 1.
    try {
      const baselines = await createInitialBaselinesForScan(prisma, scanId);
      logger.info("baselines created", { ...log, baselines });
    } catch (err) {
      logger.error("baseline creation failed", log, err);
    }
  } else if (scanned > 0) {
    // SCHEDULED / MANUAL scans compare against the approved baseline and
    // create change events (spec §24).
    try {
      const { changes, highest } = await runComparisonForScan(scanId);
      logger.info("changes detected", { ...log, changes, highest });
    } catch (err) {
      logger.error("comparison failed", log, err);
    }
  }

  // Notify — grouped summary for change-bearing scans, alert for failures
  // (spec §27). Baseline scans never notify (they create no change events).
  if (scan.triggerType !== "BASELINE") {
    try {
      await notifyForScan(scanId);
    } catch (err) {
      logger.error("notification failed", log, err);
    }
  }

  logger.info("scan finished", { ...log, status, scanned, failed });
}
