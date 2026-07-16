import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { enqueueLighthouseAudit } from "@/lib/queue";
import { logger } from "@/lib/logger";
import { MAX_AUDIT_PATH_LENGTH, resolveAuditUrl } from "@/lib/audit-url";

type Params = { params: Promise<{ id: string }> };

/** Optional body: which page of the website to audit (default: homepage). */
const postSchema = z.object({
  path: z.string().max(MAX_AUDIT_PATH_LENGTH).optional(),
});

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
export async function POST(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Optional body selects which page to audit. An empty body (legacy callers)
  // means the homepage; a malformed body is a client error.
  let path: string | undefined;
  try {
    const raw = await request.text();
    if (raw.trim() !== "") ({ path } = postSchema.parse(JSON.parse(raw)));
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  // Same-origin enforcement: users may audit any page of THIS website, never
  // another domain (spec §11, §59). The worker re-runs the SSRF guard on the
  // stored URL before Chrome fetches it.
  const target = resolveAuditUrl(website.url, path);
  if (!target.ok) {
    return NextResponse.json({ error: target.error }, { status: 400 });
  }

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
      data: { websiteId: website.id, url: target.url, status: "QUEUED" },
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
    url: audit.url,
  });
  return NextResponse.json({ audit }, { status: 201 });
}
