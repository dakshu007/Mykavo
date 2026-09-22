import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getRecentSignups } from "@/lib/admin/recent-signups";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Who has signed up, for the phone - the same report the web Users page
 * renders, from the same reader, so the two can never disagree.
 *
 * A separate route from the page's own data access rather than the app
 * scraping /dashboard/users, following the /api/mobile/* convention: the web
 * page can change shape freely, while this is a contract with a SHIPPED APK
 * that cannot be updated in lockstep.
 *
 * 404 rather than 403 for a non-admin, matching /api/mobile/usage and the web
 * page: whether this installation has an operator view is not something a
 * customer needs to learn.
 *
 * Note that getRecentSignups() never throws - a read failure arrives as
 * `error` on a 200 body, and the screen says so rather than showing an empty
 * list. "Nobody has signed up" and "we could not find out" must not look the
 * same on a screen whose whole job is the first one.
 */
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isPlatformAdmin(session.user.email)) {
    logger.warn("non-admin hit the mobile users endpoint", { userId: session.user.id });
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Pull-to-refresh is one gesture away on a phone, and each read is three
  // queries including two counts over the whole user table.
  const rl = rateLimit(`mobile-users:${session.user.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many refreshes. Wait a moment." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const report = await getRecentSignups();
  if (report.error) {
    logger.error("mobile users read failed", {
      userId: session.user.id,
      error: report.error,
    });
  }
  return NextResponse.json(report, { headers: { "cache-control": "no-store" } });
}
