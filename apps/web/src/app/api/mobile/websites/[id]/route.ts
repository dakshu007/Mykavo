import { NextResponse } from "next/server";
import {
  prisma,
  getLatestHealthCheck,
  getRecentHealthIncidents,
  getUptimeStats,
  OPEN_STATUSES,
} from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import {
  buildWebsiteHealth,
  manualScanCapability,
  mapIncident,
} from "@/lib/mobile/health";
import { highestSeverity, mapScanListItem } from "@/lib/mobile/mapping";

type Params = { params: Promise<{ id: string }> };

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Mobile website detail: the website row, monitored pages with baseline
 * versions, open-change stats, health/uptime/SSL, incident history, recent
 * scans, and manual-scan capability. Mirrors
 * dashboard/websites/[id]/page.tsx; implements WebsiteDetailResponse in
 * apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const now = new Date();
  // All queries scope to the workspace/route param, so they run in parallel;
  // the website null-check below 404s before any of their data is returned.
  const [website, openChanges, latestHealth, uptime24h, uptime7d, incidents, plan] =
    await Promise.all([
      prisma.website.findFirst({
        where: { id, workspaceId: ctx.workspace.id },
        include: {
          monitoredPages: {
            orderBy: { createdAt: "asc" },
            include: {
              baselines: { where: { status: "ACTIVE" }, select: { version: true } },
            },
          },
          scans: { orderBy: { createdAt: "desc" }, take: 5 },
        },
      }),
      prisma.changeEvent.findMany({
        where: {
          websiteId: id,
          website: { workspaceId: ctx.workspace.id },
          status: { in: OPEN_STATUSES },
        },
        select: { severity: true },
      }),
      getLatestHealthCheck(prisma, id),
      getUptimeStats(prisma, { websiteId: id, since: new Date(now.getTime() - DAY_MS) }),
      getUptimeStats(prisma, {
        websiteId: id,
        since: new Date(now.getTime() - 7 * DAY_MS),
      }),
      getRecentHealthIncidents(prisma, { websiteId: id, limit: 10 }),
      getWorkspacePlan(ctx.workspace.id),
    ]);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const activeScan = website.scans.find(
    (s) => s.status === "QUEUED" || s.status === "RUNNING",
  );
  const hasFinishedScan = website.scans.some(
    (s) => s.status === "COMPLETED" || s.status === "PARTIAL",
  );

  return NextResponse.json({
    website: {
      id: website.id,
      workspaceId: website.workspaceId,
      name: website.name,
      url: website.url,
      normalizedUrl: website.normalizedUrl,
      status: website.status,
      scanFrequency: website.scanFrequency,
      timezone: website.timezone,
      lastScanAt: website.lastScanAt,
      nextScanAt: website.nextScanAt,
      muteAlertsUntil: website.muteAlertsUntil,
      badgeEnabled: website.badgeEnabled,
      publicToken: website.publicToken,
      statusPageEnabled: website.statusPageEnabled,
      ignoredSelectors: website.ignoredSelectors,
      screenshotMasks: website.screenshotMasks,
      tags: website.tags,
      createdAt: website.createdAt,
      updatedAt: website.updatedAt,
    },
    pages: website.monitoredPages.map((page) => ({
      id: page.id,
      websiteId: page.websiteId,
      url: page.url,
      normalizedUrl: page.normalizedUrl,
      name: page.name,
      enabled: page.enabled,
      createdAt: page.createdAt,
      updatedAt: page.updatedAt,
      baselineVersion: page.baselines[0]?.version ?? null,
    })),
    stats: {
      monitoredPages: website.monitoredPages.length,
      baselinedPages: website.monitoredPages.filter((p) => p.baselines.length > 0)
        .length,
      openChanges: openChanges.length,
      highestOpenSeverity: highestSeverity(openChanges.map((c) => c.severity)),
    },
    health: buildWebsiteHealth(latestHealth, uptime24h, uptime7d, now),
    incidents: incidents.map(mapIncident),
    recentScans: website.scans.map((scan) =>
      mapScanListItem(scan, { name: website.name, url: website.url }),
    ),
    scanInProgress: activeScan ? { scanId: activeScan.id } : null,
    capabilities: manualScanCapability({
      scanInProgress: Boolean(activeScan),
      monitoredPageCount: website.monitoredPages.length,
      hasFinishedScan,
      planAllowsManualScans: plan.limits.manualScans,
    }),
  });
}
