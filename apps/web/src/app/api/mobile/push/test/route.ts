import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getSession } from "@/lib/session";
import { enqueuePushTest } from "@/lib/queue";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * "Send me a test alert" from the app's Settings screen.
 *
 * Exists because otherwise the only way to find out whether push works is to
 * wait for a real scan to find a HIGH or CRITICAL change - which could be
 * days. Setting up push involves an Expo project, Firebase credentials and a
 * device token, and any one of them can be wrong; a feedback loop measured in
 * days is not a feedback loop.
 *
 * The job goes through pg-boss to the worker rather than sending from this
 * request, deliberately: a notification that arrives proves the WHOLE path
 * (web -> queue -> worker -> Expo -> FCM -> phone), which is what a test is
 * supposed to establish. Sending straight from here would prove a shorter
 * path than the one real alerts take.
 *
 * The target is always the SESSION user's own devices - `userId` is never
 * read from the request, so this cannot be used to buzz somebody else's
 * phone.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // A test button is a free "make this phone buzz" primitive; keep it boring.
  const rl = rateLimit(`push-test:${session.user.id}`, { limit: 5, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many test alerts. Wait a moment and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  // Answer "you have no device registered" here rather than letting the job
  // run and quietly do nothing - the user is standing there waiting.
  const devices = await prisma.pushDevice.count({
    where: { userId: session.user.id, enabled: true },
  });
  if (devices === 0) {
    return NextResponse.json(
      {
        error:
          "No device is registered for alerts. Turn on “Alerts on this phone” first.",
        code: "NO_DEVICES",
      },
      { status: 409 },
    );
  }

  try {
    await enqueuePushTest({ userId: session.user.id });
  } catch (err) {
    // The worker being unreachable is the interesting failure here, and it is
    // worth distinguishing from "push is misconfigured" - same symptom on the
    // phone (nothing arrives), completely different fix.
    logger.error("push test enqueue failed", {
      userId: session.user.id,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Could not queue the test alert. Please try again." },
      { status: 503 },
    );
  }

  logger.info("push test queued", { userId: session.user.id, devices });
  return NextResponse.json({ queued: true, devices });
}
