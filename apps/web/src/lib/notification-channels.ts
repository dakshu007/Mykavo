import { prisma } from "@mykavo/database";
import {
  WEBHOOK_CHANNEL_TYPES,
  channelTargetUrl,
  isWebhookChannelType,
  maskChannelUrl,
  type WebhookChannelType,
} from "@mykavo/shared";

/**
 * Alert channels (Slack / Discord / generic webhook) for a workspace.
 * The schema enforces one channel per type (@@unique([workspaceId, type]));
 * MAX_CHANNELS is a defense-in-depth cap on total channels per workspace.
 */

export const MAX_CHANNELS_PER_WORKSPACE = 5;

/** Client-safe view of a channel - never exposes the full URL or secret. */
export interface AlertChannelView {
  id: string;
  type: WebhookChannelType;
  enabled: boolean;
  maskedUrl: string;
  /**
   * Where it posts, when known - "#alerts in Acme" for a channel added with
   * Add to Slack. Pasted webhooks don't say, so they show the masked URL.
   */
  destination: string | null;
}

/** "#alerts in Acme" from an Add to Slack configuration, else null. */
export function slackDestination(configuration: unknown): string | null {
  if (typeof configuration !== "object" || configuration === null) return null;
  const cfg = configuration as Record<string, unknown>;
  const channel = typeof cfg.channelName === "string" ? cfg.channelName : null;
  const team = typeof cfg.teamName === "string" ? cfg.teamName : null;
  if (!channel) return null;
  const name = channel.startsWith("#") ? channel : `#${channel}`;
  return team ? `${name} in ${team}` : name;
}

export async function getAlertChannels(workspaceId: string): Promise<AlertChannelView[]> {
  const channels = await prisma.notificationChannel.findMany({
    where: { workspaceId, type: { in: [...WEBHOOK_CHANNEL_TYPES] } },
    orderBy: { createdAt: "asc" },
  });

  const views: AlertChannelView[] = [];
  for (const channel of channels) {
    if (!isWebhookChannelType(channel.type)) continue;
    const target = channelTargetUrl(channel.type, channel.configuration);
    views.push({
      id: channel.id,
      type: channel.type,
      enabled: channel.enabled,
      maskedUrl: target ? maskChannelUrl(target) : "…",
      destination: channel.type === "SLACK" ? slackDestination(channel.configuration) : null,
    });
  }
  return views;
}

/** Loads an alert channel only if it belongs to the given workspace. */
export async function getOwnedAlertChannel(workspaceId: string, channelId: string) {
  return prisma.notificationChannel.findFirst({
    where: { id: channelId, workspaceId, type: { in: [...WEBHOOK_CHANNEL_TYPES] } },
  });
}

/** Build the stored configuration JSON for a channel type. */
export function buildChannelConfiguration(
  type: WebhookChannelType,
  url: string,
  secret?: string,
): { webhookUrl: string } | { url: string; secret?: string } {
  if (type === "WEBHOOK") {
    return secret ? { url, secret } : { url };
  }
  return { webhookUrl: url };
}
