import { NextResponse } from "next/server";
import { dispatchChannelMessage } from "@mykavo/shared";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { getOwnedAlertChannel } from "@/lib/notification-channels";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Send a test message through an alert channel so the user can confirm the
 * webhook works before relying on it for real alerts.
 */
export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Tests hit a user-supplied URL — cap the rate.
  const rl = rateLimit(`channel-test:${ctx.workspace.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many test messages. Try again in a minute." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const channel = await getOwnedAlertChannel(ctx.workspace.id, id);
  if (!channel) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const result = await dispatchChannelMessage(channel, {
    title: "Test alert from MyKavo",
    lines: [
      `Alert channel for "${ctx.workspace.name}" is working.`,
      "You'll receive change summaries and failure alerts here.",
    ],
    url: `${appUrl}/dashboard/notifications`,
    severity: "INFO",
  });

  logger.info("alert channel test", {
    workspaceId: ctx.workspace.id,
    channelId: channel.id,
    channelType: channel.type,
    ok: result.ok,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "Delivery failed." }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
