import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { canDownloadApp, normalizeAccessEmail } from "@mykavo/shared";
import { getSession } from "@/lib/session";
import { getAppAccessStatus } from "@/lib/app-access";
import { APK_URL, APP_DOWNLOAD_LOGIN_PATH } from "@/config/app-release";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Hand an approved, signed-in account the APK.
 *
 * WHAT THIS DOES AND DOES NOT PROTECT
 * -----------------------------------
 * The APK lives on a PUBLIC GitHub release, so the bytes are not secret and
 * this route is not access control in the cryptographic sense: anybody who
 * has seen the release URL can fetch it directly, forever. What the route
 * does is control who is ever SHOWN or EMAILED the link, and record who
 * followed it. A guest list, not a lock - and worth saying plainly rather
 * than implying a protection that is not there.
 *
 * It is a redirect rather than a proxy on purpose. Streaming ~60MB through a
 * Netlify function for every install would burn the bandwidth budget this
 * whole gated-release idea exists to protect, and would gain nothing, since
 * the destination is public either way.
 *
 * Checked against the SIGNED-IN address, never a query parameter: the caller
 * does not get to say who they are.
 */
export async function GET() {
  const session = await getSession();
  if (!session) {
    // No session: send them through login and back. The dashboard page is the
    // human entry point, so bounce there rather than to a bare API path.
    const base = (env.APP_URL ?? "https://mykavo.app").replace(/\/+$/, "");
    return NextResponse.redirect(new URL(APP_DOWNLOAD_LOGIN_PATH, base), { status: 302 });
  }

  const status = await getAppAccessStatus(session.user.email);
  if (!canDownloadApp(status)) {
    logger.info("app download refused - not approved", {
      userId: session.user.id,
      status: status ?? "none",
    });
    // 404, not 403: the same answer a customer gets for the dashboard page,
    // so neither reveals that an approval queue exists.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Record the download before redirecting. Best effort - a counter is never
  // worth failing the install the person is waiting for.
  const email = normalizeAccessEmail(session.user.email);
  try {
    await prisma.appAccessRequest.update({
      where: { email },
      data: { downloadCount: { increment: 1 } },
    });
    // firstDownloadAt only on the first one. A separate conditional write
    // rather than a read-then-branch, so two downloads racing cannot both
    // decide they were first.
    await prisma.appAccessRequest.updateMany({
      where: { email, firstDownloadAt: null },
      data: { firstDownloadAt: new Date() },
    });
  } catch (err) {
    logger.warn("could not record an app download", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
  }

  logger.info("app download served", { userId: session.user.id });
  return NextResponse.redirect(APK_URL, { status: 302 });
}
