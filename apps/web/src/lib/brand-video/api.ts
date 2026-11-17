import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole, type ApiContext } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { canUseBrandVideo } from "./access";

/**
 * The shared gate for every Brand Video route: signed in, allowed by the
 * rollout (404 otherwise, so the feature is invisible to everyone else),
 * rate limited per user, and - for anything that spends or edits - not a
 * read-only viewer. Lookups are always scoped to the caller's workspace.
 */
export async function videoContext(opts: {
  mutate: boolean;
  bucket: string;
  limit: number;
}): Promise<{ ok: true; ctx: ApiContext } | { ok: false; response: NextResponse }> {
  const ctx = await getApiContext();
  if (!ctx) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  const user = await prisma.user.findUnique({ where: { id: ctx.userId }, select: { email: true, emailVerified: true } });
  if (!user || !(await canUseBrandVideo(user))) {
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const rl = rateLimit(`bv-${opts.bucket}:${ctx.userId}`, { limit: opts.limit, windowMs: 60_000 });
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Slow down a moment." }, { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } }),
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

export const noStore = { "cache-control": "no-store" } as const;
