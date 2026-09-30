import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { appClientFrom, normalizePagePath } from "@/lib/activity/core";
import { logActivityEvent } from "@/lib/activity/record";

/**
 * Admin tracking beacon. The web dashboard reports each page it shows; the
 * Android app (from 1.0.2) reports each screen. Signed-in users only, and
 * only dashboard paths / short screen names are accepted, so this cannot be
 * used to store arbitrary text. Always answers 204: a beacon has nobody to
 * show an error to.
 */
const bodySchema = z.object({
  path: z.string().max(300).optional(),
  screen: z
    .string()
    .max(60)
    .regex(/^[A-Za-z0-9 _\-/[\]()]+$/)
    .optional(),
});

const done = () => new NextResponse(null, { status: 204 });

export async function POST(request: Request) {
  const hdrs = await headers();
  const session = await auth.api.getSession({ headers: hdrs });
  if (!session) return done();
  if (!rateLimit(`activity:${session.user.id}`, { limit: 120, windowMs: 60_000 }).allowed) return done();

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return done();

  const app = appClientFrom(hdrs.get("user-agent"), hdrs.get("x-mykavo-client"));
  if (app && parsed.data.screen) {
    await logActivityEvent({
      userId: session.user.id,
      channel: "android",
      type: "screen_view",
      label: parsed.data.screen,
      meta: { version: app.version },
    });
    return done();
  }

  const path = normalizePagePath(parsed.data.path);
  if (!app && path) {
    await logActivityEvent({ userId: session.user.id, channel: "web", type: "page_view", path });
  }
  return done();
}
