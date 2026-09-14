import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { collectUsage, logUsageProblems } from "@/lib/usage/collect";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Infrastructure usage, for the operator of this installation only.
 *
 * Gated server-side on the ADMIN_EMAILS allowlist. The response describes
 * total platform load - every workspace's websites, the whole database, the
 * whole bucket - so it is deliberately NOT scoped to the caller's workspace
 * the way every other API here is. That makes the authorization check the
 * only thing standing between a customer and the shape of the business, so
 * it is done here rather than trusted from the page that renders it.
 *
 * A non-admin gets 404, not 403: whether this installation has an admin page
 * at all is not information a customer needs.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin hit the usage endpoint", { userId: session.user.id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // The bucket walk is the expensive part (one list request per 1,000
  // objects), so this is not a button worth holding down.
  const rl = rateLimit(`admin-usage:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refreshes. Wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const report = await collectUsage();
    logUsageProblems(report);
    return NextResponse.json(report, {
      // Always fresh: a cached usage page is a usage page that tells you
      // about yesterday's quota.
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    logger.error("usage collection failed", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not collect usage figures." },
      { status: 500 },
    );
  }
}
