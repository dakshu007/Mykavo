import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite } from "@/lib/api-auth";
import { getWorkspacePlan, assertScanAllowed, LimitError } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { enqueueScanWebsite } from "@/lib/queue";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/** Trigger an asynchronous scan of the website's monitored pages. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Burst guard: cap scan triggers per workspace per minute (spec §43).
  const rl = rateLimit(`scan:${ctx.workspace.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many scan requests. Please wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const pageCount = await prisma.monitoredPage.count({
    where: { websiteId: website.id, enabled: true },
  });
  if (pageCount === 0) {
    return NextResponse.json(
      { error: "Select at least one page to monitor before scanning." },
      { status: 400 },
    );
  }

  // One scan at a time per website (spec §40: no duplicate scans).
  const active = await prisma.scan.findFirst({
    where: { websiteId: website.id, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (active) {
    return NextResponse.json(
      { error: "A scan is already in progress for this website.", scanId: active.id },
      { status: 409 },
    );
  }

  // First completed scan is the baseline; later manual scans are plan-gated.
  const hasFinishedScan = await prisma.scan.findFirst({
    where: { websiteId: website.id, status: { in: ["COMPLETED", "PARTIAL"] } },
    select: { id: true },
  });
  const triggerType = hasFinishedScan ? "MANUAL" : "BASELINE";
  const plan = await getWorkspacePlan(ctx.workspace.id);
  if (triggerType === "MANUAL" && !plan.limits.manualScans) {
    return NextResponse.json(
      {
        error: `Manual re-scans require a paid plan. Your ${plan.name} plan scans automatically on schedule.`,
      },
      { status: 403 },
    );
  }

  // Concurrency cap + daily manual-scan quota (spec §43).
  try {
    await assertScanAllowed(ctx.workspace.id, plan, triggerType);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message }, { status: 429 });
    }
    throw err;
  }

  // Authoritative no-duplicate-scan guard (spec §40: use database locking).
  // A per-website advisory lock serializes concurrent triggers so the recheck +
  // create is atomic — the earlier findFirst is only a fast-path. Works across
  // processes too, unlike the in-memory rate limiter.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${website.id})::int8)`;
    const conflict = await tx.scan.findFirst({
      where: { websiteId: website.id, status: { in: ["QUEUED", "RUNNING"] } },
      select: { id: true },
    });
    if (conflict) return { conflictScanId: conflict.id };
    const scan = await tx.scan.create({
      data: { websiteId: website.id, triggerType, status: "QUEUED" },
    });
    return { scan };
  });
  if ("conflictScanId" in created) {
    return NextResponse.json(
      { error: "A scan is already in progress for this website.", scanId: created.conflictScanId },
      { status: 409 },
    );
  }
  const scan = created.scan;

  try {
    await enqueueScanWebsite({ scanId: scan.id });
  } catch (err) {
    await prisma.scan.update({
      where: { id: scan.id },
      data: { status: "FAILED", errorCode: "ENQUEUE_FAILED" },
    });
    logger.error("failed to enqueue scan", { scanId: scan.id, websiteId: website.id }, err);
    return NextResponse.json(
      { error: "Could not queue the scan. Please try again." },
      { status: 500 },
    );
  }

  logger.info("scan queued", {
    scanId: scan.id,
    websiteId: website.id,
    workspaceId: ctx.workspace.id,
    triggerType,
  });
  return NextResponse.json({ scan }, { status: 201 });
}
