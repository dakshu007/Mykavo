import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { assertPageLimit, LimitError } from "@/lib/limits";
import { planPageAdditions } from "@/lib/integrations/wp-pages";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const addSchema = z.object({
  pages: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(2048),
        name: z.string().trim().max(120).optional(),
      }),
    )
    .min(1)
    .max(20),
});

/** The connected website's monitored pages, with baseline version and open changes. */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const pages = await prisma.monitoredPage.findMany({
    where: { websiteId: ctx.website.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      url: true,
      name: true,
      enabled: true,
      baselines: { where: { status: "ACTIVE" }, select: { version: true, approvedAt: true } },
      _count: { select: { changeEvents: { where: { status: { in: ["NEW", "REVIEWED"] } } } } },
    },
  });

  return NextResponse.json(
    {
      pages: pages.map((p) => ({
        id: p.id,
        url: p.url,
        name: p.name,
        enabled: p.enabled,
        baselineVersion: p.baselines[0]?.version ?? null,
        baselineApprovedAt: p.baselines[0]?.approvedAt ?? null,
        openChanges: p._count.changeEvents,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * Start monitoring pages picked inside WordPress ("Monitor with MyKavo" on the
 * Pages screen, the WooCommerce checkout guard). ADDS to the set - never
 * replaces it - with the dashboard's own rules: same origin as the website,
 * normalised and de-duplicated, and the plan's page limit counted across the
 * existing pages plus the new ones. New pages get their baseline on the next
 * scan, exactly like pages added in the dashboard.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const rl = rateLimit(`wp-pages:${ctx.connectionId}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) return NextResponse.json({ error: "Too many requests. Wait a minute." }, { status: 429 });

  const parsedBody = addSchema.safeParse(await request.json().catch(() => null));
  if (!parsedBody.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const existing = await prisma.monitoredPage.findMany({
    where: { websiteId: ctx.website.id },
    select: { normalizedUrl: true },
  });
  const plan = planPageAdditions(
    parsedBody.data.pages,
    ctx.website.url,
    existing.map((p) => p.normalizedUrl),
  );
  if (!plan.ok) return NextResponse.json({ error: plan.error }, { status: 400 });
  const { fresh, alreadyMonitored } = plan;

  if (fresh.length === 0) {
    return NextResponse.json({ added: 0, alreadyMonitored });
  }

  try {
    await assertPageLimit(ctx.workspaceId, ctx.website.id, existing.length + fresh.length);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  await prisma.monitoredPage.createMany({
    data: fresh.map((p) => ({ websiteId: ctx.website.id, ...p })),
    skipDuplicates: true,
  });

  logger.info("pages added from a connected site", {
    platform: ctx.platform,
    workspaceId: ctx.workspaceId,
    websiteId: ctx.website.id,
    added: fresh.length,
    connectionId: ctx.connectionId,
  });
  return NextResponse.json({ added: fresh.length, alreadyMonitored }, { status: 201 });
}
