import { NextResponse } from "next/server";
import { isAutomationKey, type AutomationKey } from "@mykavo/email";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * The shared gate for /api/admin/automations/*: signed in, a platform admin
 * (404 otherwise, like every admin route), a known automation key, and a
 * rate limit. Returns either what the handler needs or the response to send.
 */
export type AdminRequest = { ok: true; userId: string; email: string; name: string } | { ok: false; response: NextResponse };

/** Signed in, a platform admin (404 otherwise, like every admin route), and within a rate limit. */
export async function adminRequest(bucket: string, limit: number): Promise<AdminRequest> {
  const session = await getSession();
  if (!session) return { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin tried an automations admin route", { userId: session.user.id });
    return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  }
  const rl = rateLimit(`automations-${bucket}:${session.user.id}`, { limit, windowMs: 60_000 });
  if (!rl.allowed) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Slow down a moment." },
        { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
      ),
    };
  }
  return { ok: true, userId: session.user.id, email: session.user.email, name: session.user.name ?? "" };
}

/** adminRequest, plus a known automation key from the route. */
export async function automationRequest(
  params: Promise<{ key: string }>,
  bucket: string,
  limit: number,
): Promise<
  | { ok: true; key: AutomationKey; userId: string; email: string; name: string }
  | { ok: false; response: NextResponse }
> {
  const { key } = await params;
  if (!isAutomationKey(key)) return { ok: false, response: NextResponse.json({ error: "Not found" }, { status: 404 }) };
  const req = await adminRequest(bucket, limit);
  return req.ok ? { ...req, key } : req;
}

export async function readJson(request: Request): Promise<Record<string, unknown> | null> {
  try {
    const body: unknown = await request.json();
    return body && typeof body === "object" && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

/** A fresh response each time: a Response body can only be read once. */
export function notMigrated(): NextResponse {
  return NextResponse.json(
    { error: "Run the email_automation migration in Supabase first - until then there is nowhere to save settings." },
    { status: 503 },
  );
}
