import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { enqueueSiteAudit } from "@/lib/queue";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

function startOfUtcDay(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Trigger a technical SEO site audit (plan-capped crawl). */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const rl = rateLimit(`site-audit:${ctx.workspace.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many audit requests. Please wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Server-side plan enforcement (spec §39): daily quota + crawl page cap.
  const plan = await getWorkspacePlan(ctx.workspace.id);
  const usedToday = await prisma.siteAudit.count({
    where: { website: { workspaceId: ctx.workspace.id }, createdAt: { gte: startOfUtcDay() } },
  });
  if (usedToday >= plan.limits.siteAuditsPerDay) {
    const upsell = plan.id === "free" ? " Upgrade to Pro for 10 audits a day and 1,500-page crawls." : "";
    return NextResponse.json(
      { error: `You've used all ${plan.limits.siteAuditsPerDay} site audit${plan.limits.siteAuditsPerDay === 1 ? "" : "s"} for today (resets at midnight UTC).${upsell}` },
      { status: 429 },
    );
  }

  // One audit at a time per website - same advisory-lock pattern as scans.
  const created = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${"site-audit:" + website.id})::int8)`;
    const active = await tx.siteAudit.findFirst({
      where: {
        websiteId: website.id,
        status: { in: ["QUEUED", "RUNNING"] },
        // Staleness escape hatch: a dead job never blocks new audits forever.
        createdAt: { gte: new Date(Date.now() - 20 * 60 * 1000) },
      },
      select: { id: true },
    });
    if (active) return { conflictId: active.id };
    const audit = await tx.siteAudit.create({ data: { websiteId: website.id } });
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
    await enqueueSiteAudit({ siteAuditId: audit.id, maxPages: plan.limits.siteAuditPages });
  } catch (err) {
    await prisma.siteAudit.update({
      where: { id: audit.id },
      data: { status: "FAILED", errorMessage: "Could not queue the audit." },
    });
    logger.error("failed to enqueue site audit", { auditId: audit.id, websiteId: website.id }, err);
    return NextResponse.json({ error: "Could not queue the audit. Please try again." }, { status: 500 });
  }

  logger.info("site audit queued", {
    auditId: audit.id,
    websiteId: website.id,
    workspaceId: ctx.workspace.id,
    maxPages: plan.limits.siteAuditPages,
  });
  return NextResponse.json({ audit }, { status: 201 });
}
