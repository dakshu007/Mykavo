import { NextResponse } from "next/server";
import { z } from "zod";
import { recordExtensionEvent } from "@/lib/extension-tracking";
import { cleanVersion, isExtensionEvent, isValidInstallId } from "@/lib/integrations/extension-connect";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

const bodySchema = z.object({
  install: z.string().max(64),
  event: z.string().max(40),
  v: z.string().max(20).optional(),
});

/** The client IP for rate limits: Netlify's own header first, which a client cannot forge. */
function clientIp(request: Request): string {
  return clientKey(request);
}

/**
 * Anonymous usage counts from the Chrome extension (installs, popup opens,
 * page checks, Protect clicks), for the acquisition funnel. The body is an
 * install id, an event name from a fixed list and the extension version -
 * never a URL, a hostname or anything from the page. The extension lets
 * people switch this off. Always answers 204 so it reveals nothing.
 */
export async function POST(request: Request) {
  const rl = rateLimit(`ext-events:${clientIp(request)}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) return new NextResponse(null, { status: 204 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return new NextResponse(null, { status: 204 });
  }
  if (isValidInstallId(body.install) && isExtensionEvent(body.event)) {
    await recordExtensionEvent(body.install, body.event, cleanVersion(body.v));
  }
  return new NextResponse(null, { status: 204 });
}
