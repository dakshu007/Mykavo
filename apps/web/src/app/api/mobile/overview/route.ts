import { NextResponse } from "next/server";
import {
  prisma,
  getLatestHealthChecksForWorkspace,
  OPEN_STATUSES,
} from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { healthStateOf } from "@/lib/mobile/health";
import { mapChangeListItem, summarizeOpenChanges } from "@/lib/mobile/mapping";

/**
 * Mobile dashboard overview: workspace stats, per-website health/changes/scan
 * state, and the latest open changes. Mirrors the queries behind
 * dashboard/page.tsx; implements OverviewResponse in
 * apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const workspaceId = ctx.workspace.id;

  const [
    websites,
    pageCount,
    baselineCount,
    openChangeCount,
    healthChecks,
    openBySeverity,
    scansInFlight,
    recentChanges,
    plan,
  ] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId },
      include: { _count: { select: { monitoredPages: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.monitoredPage.count({ where: { website: { workspaceId } } }),
    prisma.baseline.count({
      where: { status: "ACTIVE", website: { workspaceId } },
    }),
    prisma.changeEvent.count({
      where: { website: { workspaceId }, status: { in: OPEN_STATUSES } },
    }),
    getLatestHealthChecksForWorkspace(prisma, workspaceId),
    // One grouped query for every website's open-change count + severities.
    prisma.changeEvent.groupBy({
      by: ["websiteId", "severity"],
      where: { website: { workspaceId }, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    // One query for which websites have a scan in flight (no N+1).
    prisma.scan.findMany({
      where: { website: { workspaceId }, status: { in: ["QUEUED", "RUNNING"] } },
      select: { websiteId: true },
      distinct: ["websiteId"],
    }),
    prisma.changeEvent.findMany({
      where: { website: { workspaceId }, status: { in: OPEN_STATUSES } },
      include: {
        website: { select: { name: true } },
        monitoredPage: { select: { url: true } },
      },
      orderBy: { detectedAt: "desc" },
      take: 10,
    }),
    getWorkspacePlan(workspaceId),
  ]);

  const healthByWebsite = new Map(healthChecks.map((h) => [h.websiteId, h.up]));
  const openByWebsite = summarizeOpenChanges(
    openBySeverity.map((row) => ({
      websiteId: row.websiteId,
      severity: row.severity,
      count: row._count._all,
    })),
  );
  const scanning = new Set(scansInFlight.map((s) => s.websiteId));

  return NextResponse.json({
    workspace: {
      id: workspaceId,
      name: ctx.workspace.name,
      role: ctx.role,
      plan: plan.id,
    },
    stats: {
      websites: websites.length,
      pages: pageCount,
      baselinedPages: baselineCount,
      openChanges: openChangeCount,
    },
    websites: websites.map((w) => ({
      id: w.id,
      name: w.name,
      url: w.url,
      status: w.status,
      health: healthStateOf(healthByWebsite.get(w.id)),
      monitoredPages: w._count.monitoredPages,
      openChanges: openByWebsite.get(w.id)?.openChanges ?? 0,
      highestOpenSeverity: openByWebsite.get(w.id)?.highestOpenSeverity ?? null,
      lastScanAt: w.lastScanAt,
      nextScanAt: w.nextScanAt,
      scanInProgress: scanning.has(w.id),
    })),
    recentChanges: recentChanges.map(mapChangeListItem),
  });
}
