import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { mapScanListItem } from "@/lib/mobile/mapping";
import { rateLimit } from "@/lib/security/rate-limit";
import { triggerWebsiteScan } from "@/lib/scans/trigger";
import { logActivityEvent } from "@/lib/activity/record";
import { getWorkspacePlan } from "@/lib/limits";
import { isRollbackReport, rollbackAdvice, type RollbackAdvice } from "@/lib/integrations/wp-features";
import { logger } from "@/lib/logger";

/**
 * Rollback advice for the deploy checks WordPress update reports started:
 * scan id to { recommended, reason }. Scans not started by an update report
 * get none. Never fails the scan list: on error, no advice.
 */
async function rollbackByScan(
  ctx: { workspaceId: string; website: { id: string } },
  scans: Array<{ id: string; status: "QUEUED" | "RUNNING" | "COMPLETED" | "PARTIAL" | "FAILED"; triggerType: string }>,
): Promise<Map<string, RollbackAdvice>> {
  const advice = new Map<string, RollbackAdvice>();
  const deployIds = scans.filter((s) => s.triggerType === "DEPLOY").map((s) => s.id);
  if (deployIds.length === 0) return advice;
  try {
    const [events, critical, plan] = await Promise.all([
      prisma.siteUpdateEvent.findMany({
        where: { websiteId: ctx.website.id, scanId: { in: deployIds } },
        select: { scanId: true, items: true },
      }),
      prisma.changeEvent.groupBy({
        by: ["scanId"],
        where: { websiteId: ctx.website.id, scanId: { in: deployIds }, severity: "CRITICAL" },
        _count: { _all: true },
      }),
      getWorkspacePlan(ctx.workspaceId),
    ]);
    const reports = new Map<string, unknown[]>();
    for (const e of events) {
      if (!e.scanId) continue;
      reports.set(e.scanId, [...(reports.get(e.scanId) ?? []), e.items]);
    }
    const criticalByScan = new Map(critical.map((c) => [c.scanId, c._count._all]));
    for (const scan of scans) {
      const linked = reports.get(scan.id);
      if (!linked) continue;
      advice.set(
        scan.id,
        rollbackAdvice({
          planAllows: plan.limits.wpAutoRollback,
          status: scan.status,
          criticalChanges: criticalByScan.get(scan.id) ?? 0,
          followsRollback: linked.every(isRollbackReport),
        }),
      );
    }
  } catch (err) {
    logger.warn("rollback advice unavailable", {
      websiteId: ctx.website.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
  return advice;
}

/** The connected website's recent scans, newest first. */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const scans = await prisma.scan.findMany({
    where: { websiteId: ctx.website.id },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  const rollback = ctx.platform === "wordpress" ? await rollbackByScan(ctx, scans) : new Map<string, RollbackAdvice>();
  return NextResponse.json(
    {
      scans: scans.map((scan) => {
        const advice = rollback.get(scan.id);
        return { ...mapScanListItem(scan, ctx.website), note: scan.note, ...(advice ? { rollback: advice } : {}) };
      }),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Run a scan now - the same rules, quota and plan gate as the dashboard. */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const rl = rateLimit(`scan:${ctx.workspaceId}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const result = await triggerWebsiteScan({ workspaceId: ctx.workspaceId, websiteId: ctx.website.id });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, ...(result.scanId ? { scanId: result.scanId } : {}) },
      { status: result.status },
    );
  }
  if (ctx.platform === "chrome") {
    void logActivityEvent({
      userId: ctx.actingUserId ?? ctx.workspaceOwnerId,
      workspaceId: ctx.workspaceId,
      channel: "chrome",
      type: "extension_scan_triggered",
      label: ctx.website.name,
      meta: { websiteId: ctx.website.id, scanId: result.scan.id },
    });
  }
  return NextResponse.json({ scan: { id: result.scan.id, status: result.scan.status } }, { status: 201 });
}
