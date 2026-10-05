import { NextResponse } from "next/server";
import { prisma, getLatestHealthCheck, getUptimeStats, OPEN_STATUSES } from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/limits";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { buildWebsiteHealth, manualScanCapability } from "@/lib/mobile/health";
import { highestSeverity } from "@/lib/mobile/mapping";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * A one-glance status for the ONE website a token belongs to - what the
 * Chrome extension shows when it is opened on a protected site. Deliberately
 * lean (counts, not rows): it is fetched every time the popup opens, so it
 * reads a handful of small aggregates instead of the full /site payload.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  const websiteId = ctx.website.id;
  const now = new Date();

  const [website, pages, baselinedPages, bySeverityRows, activeScan, finishedScan, latestHealth, uptime24h, uptime7d, plan] =
    await Promise.all([
      prisma.website.findUnique({
        where: { id: websiteId },
        select: { id: true, name: true, url: true, status: true, scanFrequency: true, lastScanAt: true, nextScanAt: true },
      }),
      prisma.monitoredPage.count({ where: { websiteId, enabled: true } }),
      prisma.monitoredPage.count({ where: { websiteId, baselines: { some: { status: "ACTIVE" } } } }),
      prisma.changeEvent.groupBy({
        by: ["severity"],
        where: { websiteId, status: { in: OPEN_STATUSES } },
        _count: { _all: true },
      }),
      prisma.scan.findFirst({
        where: { websiteId, status: { in: ["QUEUED", "RUNNING"] } },
        select: { id: true, status: true, pagesRequested: true, pagesScanned: true },
      }),
      prisma.scan.findFirst({
        where: { websiteId, status: { in: ["COMPLETED", "PARTIAL"] } },
        select: { id: true },
      }),
      getLatestHealthCheck(prisma, websiteId),
      getUptimeStats(prisma, { websiteId, since: new Date(now.getTime() - DAY_MS) }),
      getUptimeStats(prisma, { websiteId, since: new Date(now.getTime() - 7 * DAY_MS) }),
      getWorkspacePlan(ctx.workspaceId),
    ]);
  if (!website) return unauthorizedSite();

  const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const row of bySeverityRows) bySeverity[row.severity] = row._count._all;
  const openChanges = Object.values(bySeverity).reduce((a, b) => a + b, 0);
  const base = appBaseUrl();

  return NextResponse.json(
    {
      website,
      workspace: { name: ctx.workspaceName, plan: { id: plan.id, name: plan.name } },
      setup: {
        monitoredPages: pages,
        baselinedPages,
        /** Pages chosen and at least one baseline finished. */
        complete: pages > 0 && baselinedPages > 0,
      },
      openChanges: {
        total: openChanges,
        bySeverity,
        highest: highestSeverity(bySeverityRows.map((r) => r.severity)),
      },
      health: buildWebsiteHealth(latestHealth, uptime24h, uptime7d, now),
      scanInProgress: activeScan
        ? {
            scanId: activeScan.id,
            status: activeScan.status,
            pagesRequested: activeScan.pagesRequested,
            pagesScanned: activeScan.pagesScanned,
          }
        : null,
      capabilities: manualScanCapability({
        scanInProgress: Boolean(activeScan),
        monitoredPageCount: pages,
        hasFinishedScan: Boolean(finishedScan),
        planAllowsManualScans: plan.limits.manualScans,
      }),
      links: {
        website: `${base}/dashboard/websites/${website.id}`,
        changes: `${base}/dashboard/changes?website=${website.id}`,
        setup: `${base}/dashboard/websites/new?website=${website.id}`,
        scan: activeScan ? `${base}/dashboard/scans/${activeScan.id}` : null,
        billing: `${base}/dashboard/billing`,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
