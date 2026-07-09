import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { enqueueLighthouseAudit } from "@/lib/queue";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/** Lighthouse audits are expensive — a tight per-workspace cap (spec §43/§60). */
const AUDITS_PER_HOUR = 5;

/** Recent performance audits for a website (for the dashboard + polling). */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const audits = await prisma.performanceAudit.findMany({
    where: { websiteId: website.id },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ audits });
}

/** Trigger an on-demand Lighthouse audit. Available on all plans, rate-limited. */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rl = rateLimit(`audit:${ctx.workspace.id}`, {
    limit: AUDITS_PER_HOUR,
    windowMs: 60 * 60 * 1000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: `Performance audits are limited to ${AUDITS_PER_HOUR} per hour. Try again shortly.` },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  // One in-flight audit per website, enforced atomically. A per-website advisory
  // lock (distinct "audit:" namespace so it doesn't block scans) serializes the
  // recheck + create across concurrent requests/instances. An audit stuck
  // QUEUED/RUNNING past STALE_AFTER (dead worker) no longer blocks new ones.
  const STALE_AFTER_MS = 5 * 60 * 1000;
  const freshSince = new Date(Date.now() - STALE_AFTER_MS);
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`audit:${website.id}`})::int8)`;
    const inflight = await tx.performanceAudit.findFirst({
      where: {
        websiteId: website.id,
        status: { in: ["QUEUED", "RUNNING"] },
        createdAt: { gte: freshSince },
      },
      select: { id: true },
    });
    if (inflight) return { conflictId: inflight.id };
    const audit = await tx.performanceAudit.create({
      data: { websiteId: website.id, url: website.url, status: "QUEUED" },
    });
    return { audit };
  });
  if ("conflictId" in created) {
    return NextResponse.json(
      { error: "An audit is already running for this website.", auditId: created.conflictId },
      { status: 409 },
    );
  }
  const audit = created.audit;

  try {
    await enqueueLighthouseAudit({ auditId: audit.id });
  } catch (err) {
    await prisma.performanceAudit.update({
      where: { id: audit.id },
      data: { status: "FAILED", errorCode: "ENQUEUE_FAILED", completedAt: new Date() },
    });
    logger.error("failed to enqueue audit", { auditId: audit.id, websiteId: website.id }, err);
    return NextResponse.json(
      { error: "Could not queue the audit. Please try again." },
      { status: 500 },
    );
  }

  logger.info("audit queued", {
    auditId: audit.id,
    websiteId: website.id,
    workspaceId: ctx.workspace.id,
  });
  return NextResponse.json({ audit }, { status: 201 });
}
