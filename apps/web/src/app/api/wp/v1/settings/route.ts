import { NextResponse } from "next/server";
import { Prisma, prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { parseSiteSettings, putSettingsSchema, withUpdateWindow } from "@/lib/integrations/wp-settings";
import { getWorkspacePlan } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/** The settings column has not been migrated yet. */
function isMissingColumn(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2022";
}

function notReady(): NextResponse {
  return NextResponse.json({ error: "Not ready yet." }, { status: 503 });
}

/**
 * Settings MyKavo keeps for the connected WordPress site.
 *
 *   GET -> { updateWindow: {...} | null, allowed: { updateWindows } }
 *   PUT { updateWindow: {...} | null } (Agency) -> the same shape
 *
 * updateWindow is served only while the plan includes update windows, so a
 * downgraded site goes back to WordPress's own update timing on its own; the
 * saved window is kept and returns with the plan.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request, { automated: true });
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  try {
    const [connection, plan] = await Promise.all([
      prisma.siteConnection.findUnique({ where: { id: ctx.connectionId }, select: { settings: true } }),
      getWorkspacePlan(ctx.workspaceId),
    ]);
    const allowed = plan.limits.wpUpdateWindows;
    const settings = parseSiteSettings(connection?.settings);
    return NextResponse.json(
      { updateWindow: allowed ? settings.updateWindow : null, allowed: { updateWindows: allowed } },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (err) {
    if (isMissingColumn(err)) return notReady();
    throw err;
  }
}

export async function PUT(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  if (ctx.platform !== "wordpress") {
    return NextResponse.json({ error: "Not available for this connection." }, { status: 404 });
  }

  const rl = rateLimit(`wp-settings:${ctx.connectionId}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Wait a minute." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.limits.wpUpdateWindows) {
    return NextResponse.json(
      { error: "Update windows are included in the Agency plan.", reason: "PLAN" },
      { status: 403 },
    );
  }

  const parsed = putSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message;
    return NextResponse.json({ error: message ? `Invalid settings: ${message}` : "Invalid settings." }, { status: 400 });
  }

  try {
    const updateWindow = await prisma.$transaction(async (tx) => {
      const current = await tx.siteConnection.findUnique({ where: { id: ctx.connectionId }, select: { settings: true } });
      const next = withUpdateWindow(current?.settings, parsed.data.updateWindow);
      await tx.siteConnection.update({
        where: { id: ctx.connectionId },
        data: { settings: next as Prisma.InputJsonObject },
      });
      return parseSiteSettings(next).updateWindow;
    });
    logger.info("wordpress site settings saved", {
      workspaceId: ctx.workspaceId,
      websiteId: ctx.website.id,
      updateWindow: updateWindow ? (updateWindow.enabled ? "on" : "off") : "cleared",
    });
    return NextResponse.json({ updateWindow, allowed: { updateWindows: true } });
  } catch (err) {
    if (isMissingColumn(err)) return notReady();
    throw err;
  }
}
