import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";
import { AiError, aiConfigured, type AiErrorCode } from "@/lib/ai/client";
import { getOrCreateChangeExplanation } from "@/lib/ai/explain-change";

type Params = { params: Promise<{ id: string }> };

const STATUS: Record<AiErrorCode, number> = {
  not_configured: 503,
  budget_exhausted: 503,
  quota_exhausted: 402,
  refused: 422,
  failed: 502,
};

/**
 * POST: the AI explanation of one change, generated on first ask and stored.
 * Any member may ask, viewers included: it changes nothing on the website
 * and reads only what they can already see.
 */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!aiConfigured()) {
    return NextResponse.json({ error: "AI explanations are not available.", code: "not_configured" }, { status: 503 });
  }

  const rl = rateLimit(`ai-explain:${ctx.workspace.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Try again in a minute." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    select: { id: true },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  try {
    const explanation = await getOrCreateChangeExplanation({
      workspaceId: ctx.workspace.id,
      changeEventId: change.id,
    });
    return NextResponse.json({ explanation });
  } catch (err) {
    if (err instanceof AiError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: STATUS[err.code] });
    }
    logger.error("change explanation failed", {
      workspaceId: ctx.workspace.id,
      changeId: change.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Something went wrong. Try again later.", code: "failed" }, { status: 500 });
  }
}
