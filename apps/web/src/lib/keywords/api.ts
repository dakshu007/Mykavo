import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole, type ApiContext } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { canUseKeywordAgent } from "./access";

/**
 * The shared gate for every AI Keyword Agent route: signed in, allowed by the
 * rollout (404 otherwise, so the feature is invisible to everyone else),
 * rate limited per user, and - for anything that spends or edits - not a
 * read-only viewer. Website and post lookups are always scoped to the
 * caller's workspace, so changing an id in the URL finds nothing (IDOR).
 */
export async function agentContext(opts: {
  mutate: boolean;
  bucket: string;
  limit: number;
}): Promise<{ ok: true; ctx: ApiContext } | { ok: false; response: NextResponse }> {
  const ctx = await getApiContext();
  if (!ctx) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true, emailVerified: true } });
  if (!user || !(await canUseKeywordAgent(user))) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const rl = rateLimit(`kw-${opts.bucket}:${ctx.userId}`, { limit: opts.limit, windowMs: 60_000 });
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Slow down a moment." },
        { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
      ),
    };
  }
  if (opts.mutate) {
    const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
    if (denied) return { ok: false, response: denied };
  }
  return { ok: true, ctx };
}

export async function readBody(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
