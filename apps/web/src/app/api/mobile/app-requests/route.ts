import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAppRequests } from "@/lib/app-access";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * The Android app approval queue, for the phone.
 *
 * The same reader the web page uses, so the two lists can never disagree. A
 * separate route rather than the app calling the page's data directly,
 * following the /api/mobile/* convention: the page can change shape freely,
 * while this is a contract with a shipped APK.
 *
 * 404 rather than 403 for a non-admin, matching every other admin route.
 *
 * Decisions go through the shared PATCH /api/app-access/[id] rather than a
 * mobile-specific twin - approving from a phone and approving from a desk
 * must do exactly the same thing, including the email.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin hit the mobile app-requests endpoint", {
      userId: session.user.id,
    });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const rl = rateLimit(`mobile-app-requests:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refreshes. Wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const report = await getAppRequests(50);
  if (report.error) {
    logger.error("mobile app-requests read failed", {
      userId: session.user.id,
      error: report.error,
    });
  }
  return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
}
