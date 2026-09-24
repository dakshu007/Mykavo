import { NextResponse } from "next/server";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { buildUpdateNote, updateEventSchema } from "@/lib/integrations/wp-updates";
import { rateLimit } from "@/lib/security/rate-limit";
import { triggerWebsiteScan } from "@/lib/scans/trigger";
import { logger } from "@/lib/logger";

/**
 * Safe Updates: the plugin reports that WordPress just updated plugins,
 * themes or core, and MyKavo runs a deploy check so the owner learns whether
 * the update broke anything - with the update named in the verdict.
 *
 * A refusal (Free plan, no baseline yet, daily quota) is a 200 with a reason,
 * not an error: the update happened either way and the plugin records it.
 */
export async function POST(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  // WordPress reports its own updates; Shopify theme changes arrive as webhooks.
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-updates:${ctx.connectionId}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many update reports." }, { status: 429 });
  }

  const parsed = updateEventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid update report." }, { status: 400 });
  }
  const note = buildUpdateNote(parsed.data.items, parsed.data.trigger);

  const result = await triggerWebsiteScan({
    workspaceId: ctx.workspaceId,
    websiteId: ctx.website.id,
    mode: "deploy",
    note,
  });

  logger.info("wordpress update reported", {
    workspaceId: ctx.workspaceId,
    websiteId: ctx.website.id,
    items: parsed.data.items.length,
    trigger: parsed.data.trigger,
    scanned: result.ok,
    ...(result.ok ? { scanId: result.scan.id } : { reason: result.reason }),
  });

  if (result.ok) {
    return NextResponse.json({ note, scan: { id: result.scan.id, status: result.scan.status } }, { status: 201 });
  }
  // Another scan is already running - usually the check for the previous
  // batch of updates. It will see this update's files too, so link to it.
  if (result.reason === "BUSY" && result.scanId) {
    return NextResponse.json({ note, scan: { id: result.scanId, status: "RUNNING" }, reason: "BUSY" });
  }
  return NextResponse.json({ note, scan: null, reason: result.reason, message: result.error });
}
