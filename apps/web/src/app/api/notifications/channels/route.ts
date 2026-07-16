import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { WEBHOOK_CHANNEL_TYPES, validateChannelUrl } from "@mykavo/shared";
import { getApiContext, requireRole } from "@/lib/api-auth";
import {
  MAX_CHANNELS_PER_WORKSPACE,
  buildChannelConfiguration,
  getAlertChannels,
} from "@/lib/notification-channels";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";
import { logger } from "@/lib/logger";

const CHANNEL_LABELS: Record<(typeof WEBHOOK_CHANNEL_TYPES)[number], string> = {
  SLACK: "Slack",
  DISCORD: "Discord",
  WEBHOOK: "webhook",
};

const createSchema = z.object({
  type: z.enum(WEBHOOK_CHANNEL_TYPES),
  url: z.string().trim().min(1).max(2048),
  secret: z.string().trim().max(256).optional(),
});

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const channels = await getAlertChannels(ctx.workspace.id);
  return NextResponse.json({ channels });
}

/** Add a Slack / Discord / webhook alert channel (spec §27 future channels). */
export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Channel creation resolves DNS on a user-supplied URL — cap it.
  const rl = rateLimit(`channel-create:${ctx.workspace.id}`, { limit: 10, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Choose a channel type and enter its URL." }, { status: 400 });
  }

  // SSRF vector: user-supplied fetch target. Shape rules first (https-only,
  // no credentials, per-provider host prefixes), then the full SSRF guard.
  const shape = validateChannelUrl(input.type, input.url);
  if (!shape.ok) {
    return NextResponse.json({ error: shape.error }, { status: 400 });
  }

  try {
    await assertSafeUrl(input.url);
  } catch (err) {
    const message =
      err instanceof UnsafeUrlError && err.code === "DNS_FAILURE"
        ? "We couldn't resolve that hostname. Check the URL and try again."
        : "This URL can't be used as an alert channel.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const count = await prisma.notificationChannel.count({
    where: { workspaceId: ctx.workspace.id },
  });
  if (count >= MAX_CHANNELS_PER_WORKSPACE) {
    return NextResponse.json(
      { error: `You can configure up to ${MAX_CHANNELS_PER_WORKSPACE} notification channels.` },
      { status: 403 },
    );
  }

  const existing = await prisma.notificationChannel.findUnique({
    where: { workspaceId_type: { workspaceId: ctx.workspace.id, type: input.type } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `A ${CHANNEL_LABELS[input.type]} channel is already configured. Delete it first to change the URL.` },
      { status: 409 },
    );
  }

  const channel = await prisma.notificationChannel.create({
    data: {
      workspaceId: ctx.workspace.id,
      type: input.type,
      enabled: true,
      configuration: buildChannelConfiguration(input.type, input.url, input.secret),
    },
  });

  logger.info("alert channel added", {
    workspaceId: ctx.workspace.id,
    channelId: channel.id,
    channelType: channel.type,
  });
  return NextResponse.json({ ok: true }, { status: 201 });
}
