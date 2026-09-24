import { NextResponse } from "next/server";
import {
  prisma,
  getLatestHealthCheck,
  getUptimeStats,
  OPEN_STATUSES,
} from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/limits";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { buildWebsiteHealth, manualScanCapability } from "@/lib/mobile/health";
import {
  SEVERITY_RANK,
  highestSeverity,
  mapChangeListItem,
  mapScanListItem,
  sortChangesBySeverity,
} from "@/lib/mobile/mapping";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything the plugin's Overview screen needs, in one request, for the ONE
 * website the token belongs to: status, health, open changes by severity,
 * the most important open changes, recent scans and whether a scan can run.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  const websiteId = ctx.website.id;
  const now = new Date();

  const [website, openChanges, latestHealth, uptime24h, uptime7d, plan] = await Promise.all([
    prisma.website.findUnique({
      where: { id: websiteId },
      include: {
        monitoredPages: {
          select: { id: true, baselines: { where: { status: "ACTIVE" }, select: { id: true } } },
        },
        scans: { orderBy: { createdAt: "desc" }, take: 5 },
      },
    }),
    prisma.changeEvent.findMany({
      where: { websiteId, status: { in: OPEN_STATUSES } },
      include: { website: { select: { name: true } }, monitoredPage: { select: { url: true } } },
      orderBy: { detectedAt: "desc" },
      take: 200,
    }),
    getLatestHealthCheck(prisma, websiteId),
    getUptimeStats(prisma, { websiteId, since: new Date(now.getTime() - DAY_MS) }),
    getUptimeStats(prisma, { websiteId, since: new Date(now.getTime() - 7 * DAY_MS) }),
    getWorkspacePlan(ctx.workspaceId),
  ]);
  if (!website) return unauthorizedSite();

  const bySeverity = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  for (const change of openChanges) bySeverity[change.severity] += 1;

  const activeScan = website.scans.find((s) => s.status === "QUEUED" || s.status === "RUNNING");
  const hasFinishedScan = website.scans.some(
    (s) => s.status === "COMPLETED" || s.status === "PARTIAL",
  );
  const base = appBaseUrl();

  return NextResponse.json(
    {
      website: {
        id: website.id,
        name: website.name,
        url: website.url,
        status: website.status,
        scanFrequency: website.scanFrequency,
        lastScanAt: website.lastScanAt,
        nextScanAt: website.nextScanAt,
      },
      workspace: { name: ctx.workspaceName, plan: { id: plan.id, name: plan.name } },
      stats: {
        monitoredPages: website.monitoredPages.length,
        baselinedPages: website.monitoredPages.filter((p) => p.baselines.length > 0).length,
        openChanges: openChanges.length,
        bySeverity,
        highestOpenSeverity: highestSeverity(openChanges.map((c) => c.severity)),
      },
      health: buildWebsiteHealth(latestHealth, uptime24h, uptime7d, now),
      topChanges: sortChangesBySeverity(openChanges)
        .filter((c) => SEVERITY_RANK[c.severity] >= SEVERITY_RANK.LOW)
        .slice(0, 5)
        .map(mapChangeListItem),
      recentScans: website.scans.map((scan) =>
        mapScanListItem(scan, { name: website.name, url: website.url }),
      ),
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
        monitoredPageCount: website.monitoredPages.length,
        hasFinishedScan,
        planAllowsManualScans: plan.limits.manualScans,
      }),
      links: {
        website: `${base}/dashboard/websites/${website.id}`,
        changes: `${base}/dashboard/changes?website=${website.id}`,
        pages: `${base}/dashboard/websites/${website.id}/pages`,
        notifications: `${base}/dashboard/notifications`,
        billing: `${base}/dashboard/billing`,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}
