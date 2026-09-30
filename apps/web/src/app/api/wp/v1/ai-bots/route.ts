import { NextResponse } from "next/server";
import { isMissingTableError, prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { rowsFromReport, visitReportSchema } from "@/lib/ai-crawler-visits-core";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * The WordPress plugin's daily AI crawler totals: per UTC day and crawler,
 * visits, error responses and the most-visited paths. No visitor data.
 *
 * Idempotent: each (website, day, crawler) row is replaced, never added to,
 * so the plugin re-sending recent days (today's partial count, a retry)
 * never double-counts.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
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
