import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { collectUsage, logUsageProblems } from "@/lib/usage/collect";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Infrastructure usage for the phone - the same report the web All Usage page
 * renders, so there is exactly one definition of "how full is everything".
 *
 * A separate route from /api/admin/usage rather than the app calling that one
 * directly, following the /api/mobile/* convention the rest of the app uses:
 * the web route serves a page that can change shape freely, while this one is
 * a contract with a SHIPPED APK that cannot be updated in lockstep. They share
 * collectUsage(), so the numbers can never disagree.
 *
 * 404 rather than 403 for a non-admin, matching the web route: whether this
 * installation has an operator view is not information a customer needs.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin hit the mobile usage endpoint", { userId: session.user.id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pull-to-refresh is one gesture away on a phone, and the storage figure
  // costs a list request per 1,000 objects. Keep it boring.
  const rl = rateLimit(`mobile-usage:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refreshes. Wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  try {
    const report = await collectUsage();
    logUsageProblems(report);
    return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
  } catch (err) {
    logger.error("mobile usage collection failed", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not collect usage figures." },
      { status: 500 },
    );
  }
}
