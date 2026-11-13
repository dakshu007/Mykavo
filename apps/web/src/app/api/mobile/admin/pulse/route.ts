import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { loadAdminPulse } from "@/lib/mobile/admin-pulse";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * GET: the phone's Command Center - health, users, revenue, scans, AI,
 * WordPress, channels and a live feed in one call. The app polls it every
 * 20 seconds while the screen is open, so the limit allows that plus pulls.
 *
 * Operator-only; 404 for everyone else, like every other admin route.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(session.user)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const rl = rateLimit(`mobile-pulse:${session.user.id}`, { limit: 12, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refreshes. Wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const pulse = await loadAdminPulse();
    return NextResponse.json(pulse, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logger.error("admin pulse failed", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Could not load the Command Center." }, { status: 500 });
  }
}
