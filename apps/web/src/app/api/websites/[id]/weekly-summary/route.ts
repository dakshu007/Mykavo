import { NextResponse } from "next/server";
import { getApiContext, getOwnedWebsite } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { AiError, aiConfigured, type AiErrorCode } from "@/lib/ai/client";
import { getOrCreateWeeklySummary } from "@/lib/ai/weekly-summary";

type Params = { params: Promise<{ id: string }> };

const STATUS: Record<AiErrorCode, number> = {
  not_configured: 503,
  budget_exhausted: 503,
  quota_exhausted: 402,
  refused: 422,
  failed: 502,
};

/**
 * POST: the website's "this week" note, written once per finished scan and
 * stored. It does not count against the plan's explanation allowance: it is
 * bounded by the number of websites and scans already.
 */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI summaries are not available.", code: "not_configured" }, { status: 503 });
  }

  const rl = rateLimit(`ai-weekly:${ctx.workspace.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const stored = await getOrCreateWeeklySummary({ workspaceId: ctx.workspace.id, websiteId: website.id });
    return NextResponse.json({ summary: stored.summary, createdAt: stored.createdAt.toISOString() });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS[err.code] });
    }
    logger.error("weekly summary failed", {
      workspaceId: ctx.workspace.id,
      websiteId: website.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Something went wrong. Try again later.", code: "failed" }, { status: 500 });
  }
}
