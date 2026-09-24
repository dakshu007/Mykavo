/**
 * Start a scan of one website on behalf of a workspace - the single
 * implementation behind the dashboard's Run scan button and the WordPress
 * plugin's, so both enforce the same plan gate, quota and no-duplicate rule.
 * Callers own authentication, authorization and rate limiting.
 */

import type { Scan } from "@mykavo/database";
import { prisma } from "@mykavo/database";
import { getWorkspacePlan, assertScanAllowed, LimitError } from "@/lib/limits";
import { enqueueScanWebsite } from "@/lib/queue";
import { logger } from "@/lib/logger";

export type TriggerScanResult =
  | { ok: true; scan: Scan }
  | { ok: false; status: 400 | 403 | 409 | 429 | 500; error: string; scanId?: string };

export async function triggerWebsiteScan(params: {
  workspaceId: string;
  websiteId: string;
}): Promise<TriggerScanResult> {
  const { workspaceId, websiteId } = params;

  const pageCount = await prisma.monitoredPage.count({
    where: { websiteId, enabled: true },
  });
  if (pageCount === 0) {
    return { ok: false, status: 400, error: "Select at least one page to monitor before scanning." };
  }

  // One scan at a time per website (spec §40: no duplicate scans).
  const active = await prisma.scan.findFirst({
    where: { websiteId, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (active) {
    return {
      ok: false,
      status: 409,
      error: "A scan is already in progress for this website.",
      scanId: active.id,
    };
  }

  // First completed scan is the baseline; later manual scans are plan-gated.
  const hasFinishedScan = await prisma.scan.findFirst({
    where: { websiteId, status: { in: ["COMPLETED", "PARTIAL"] } },
    select: { id: true },
  });
  const triggerType = hasFinishedScan ? "MANUAL" : "BASELINE";
  const plan = await getWorkspacePlan(workspaceId);
  if (triggerType === "MANUAL" && !plan.limits.manualScans) {
    return {
      ok: false,
      status: 403,
      error: `Manual re-scans require a paid plan. Your ${plan.name} plan scans automatically on schedule.`,
    };
  }

  // Concurrency cap + daily manual-scan quota (spec §43).
  try {
    await assertScanAllowed(workspaceId, plan, triggerType);
  } catch (err) {
    if (err instanceof LimitError) return { ok: false, status: 429, error: err.message };
    throw err;
  }

  // Authoritative no-duplicate-scan guard (spec §40: use database locking).
  // A per-website advisory lock serializes concurrent triggers so the recheck +
  // create is atomic - the earlier findFirst is only a fast-path. Works across
  // processes too, unlike the in-memory rate limiter.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${websiteId})::int8)`;
    const conflict = await tx.scan.findFirst({
      where: { websiteId, status: { in: ["QUEUED", "RUNNING"] } },
      select: { id: true },
    });
    if (conflict) return { conflictScanId: conflict.id };
    const scan = await tx.scan.create({
      data: { websiteId, triggerType, status: "QUEUED" },
    });
    return { scan };
  });
  if ("conflictScanId" in created) {
    return {
      ok: false,
      status: 409,
      error: "A scan is already in progress for this website.",
      scanId: created.conflictScanId,
    };
  }
  const scan = created.scan;

  try {
    await enqueueScanWebsite({ scanId: scan.id });
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "FAILED", errorCode: "ENQUEUE_FAILED" },
    });
    logger.error("failed to enqueue scan", { scanId: scan.id, websiteId }, err);
    return { ok: false, status: 500, error: "Could not queue the scan. Please try again." };
  }

  logger.info("scan queued", { scanId: scan.id, websiteId, workspaceId, triggerType });
  return { ok: true, scan };
}
