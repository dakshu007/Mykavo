import { NextResponse } from "next/server";
import { isMissingTableError, prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { rowsFromReport, visitReportSchema } from "@/lib/ai-crawler-visits-core";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { getWorkspacePlan } from "@/lib/limits";
import { aiBotsQuerySchema, historySince } from "@/lib/integrations/wp-ai-insights";

/**
 * AI Insights (Starter, Pro, Agency): the site's AI crawler history kept on
 * MyKavo, up to a year (the plugin itself keeps 30 days), and the first day
 * each crawler was ever seen.
 *
 *   GET ?days=N (1-365, default 90) ->
 *   { days: [{ day, agent, hits, errors }], firstSeen: { [agent]: day } }
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-ai-bots-read:${ctx.connectionId}`, { limit: 30, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const query = aiBotsQuerySchema.safeParse({ days: new URL(request.url).searchParams.get("days") ?? undefined });
  if (!query.success) {
    return NextResponse.json({ error: "days must be a whole number from 1 to 365." }, { status: 400 });
  }

  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.limits.wpAiInsights) {
    return NextResponse.json(
      { error: "AI crawler history and alerts are included in Starter, Pro and Agency.", reason: "PLAN" },
      { status: 403 },
    );
  }

  const websiteId = ctx.website.id;
  try {
    const [rows, first] = await Promise.all([
      prisma.aiCrawlerVisit.findMany({
        where: { websiteId, day: { gte: historySince(query.data.days) } },
        orderBy: [{ day: "asc" }, { agent: "asc" }],
        select: { day: true, agent: true, hits: true, errors: true },
      }),
      prisma.aiCrawlerVisit.groupBy({ by: ["agent"], where: { websiteId }, _min: { day: true } }),
    ]);
    const firstSeen: Record<string, string> = {};
    for (const f of first) if (f._min.day) firstSeen[f.agent] = f._min.day.toISOString().slice(0, 10);
    return NextResponse.json(
      {
        days: rows.map((r) => ({ day: r.day.toISOString().slice(0, 10), agent: r.agent, hits: r.hits, errors: r.errors })),
        firstSeen,
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    if (isMissingTableError(err)) return NextResponse.json({ error: "Not ready yet." }, { status: 503 });
    logger.error("could not read AI crawler visits", { workspaceId: ctx.workspaceId, websiteId }, err);
    return NextResponse.json({ error: "Could not read the history." }, { status: 500 });
  }
}

/**
 * The WordPress plugin's daily AI crawler totals: per UTC day and crawler,
 * visits, error responses and the most-visited paths. No visitor data.
 *
 * Idempotent: each (website, day, crawler) row is replaced, never added to,
 * so the plugin re-sending recent days (today's partial count, a retry)
 * never double-counts.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request, { automated: true });
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-ai-bots:${ctx.connectionId}`, { limit: 10, windowMs: 60 * 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many reports." }, { status: 429 });
  }

  const text = await request.text().catch(() => "");
  if (text.length > 256 * 1024) {
    return NextResponse.json({ error: "Report too large." }, { status: 413 });
  }
  let body: unknown = null;
  try {
    body = JSON.parse(text);
  } catch {
    // handled below
  }
  const parsed = visitReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid report." }, { status: 400 });
  }

  const rows = rowsFromReport(parsed.data);
  const websiteId = ctx.website.id;
  try {
    await prisma.$transaction(
      rows.map((r) => {
        const day = new Date(`${r.day}T00:00:00Z`);
        const data = { hits: r.hits, errors: r.errors, topPaths: r.topPaths };
        return prisma.aiCrawlerVisit.upsert({
          where: { websiteId_day_agent: { websiteId, day, agent: r.agent } },
          create: { websiteId, day, agent: r.agent, ...data },
          update: data,
        });
      }),
    );
  } catch (err) {
    if (isMissingTableError(err)) {
      // The migration has not run yet; the plugin tries again tomorrow.
      return NextResponse.json({ error: "Not ready yet." }, { status: 503 });
    }
    logger.error("could not store AI crawler visits", { workspaceId: ctx.workspaceId, websiteId }, err);
    return NextResponse.json({ error: "Could not store the report." }, { status: 500 });
  }

  logger.info("ai crawler visits reported", {
    workspaceId: ctx.workspaceId,
    websiteId,
    days: parsed.data.days.length,
    rows: rows.length,
  });
  return NextResponse.json({ stored: rows.length });
}
