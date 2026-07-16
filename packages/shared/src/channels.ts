/**
 * Webhook-based alert channels (spec §27 future channels): Slack, Discord,
 * and generic webhooks. Shared by the worker (scan fan-out) and the web app
 * (channel CRUD + "send test").
 *
 * SECURITY: channel URLs are user-supplied fetch targets - a classic SSRF
 * vector. validateChannelUrl() enforces pure shape rules (https, no
 * credentials, per-type host prefixes); dispatchChannelMessage() additionally
 * runs the full SSRF guard (assertSafeUrl) before every fetch so DNS
 * rebinding after channel creation cannot reach internal addresses, and
 * never follows redirects.
 */

import { createHmac } from "node:crypto";
import { assertSafeUrl } from "./ssrf";

export const WEBHOOK_CHANNEL_TYPES = ["SLACK", "DISCORD", "WEBHOOK"] as const;

export type WebhookChannelType = (typeof WEBHOOK_CHANNEL_TYPES)[number];

export function isWebhookChannelType(value: string): value is WebhookChannelType {
  return (WEBHOOK_CHANNEL_TYPES as readonly string[]).includes(value);
}

export interface SlackChannelConfig {
  webhookUrl: string;
}

export interface DiscordChannelConfig {
  webhookUrl: string;
}

export interface WebhookChannelConfig {
  url: string;
  secret?: string;
}

export type ChannelConfiguration =
  | SlackChannelConfig
  | DiscordChannelConfig
  | WebhookChannelConfig;

/** Neutral message shape formatted per channel type at dispatch time. */
export interface ChannelMessage {
  title: string;
  lines: string[];
  url?: string;
  severity?: string;
}

export interface DispatchResult {
  ok: boolean;
  error?: string;
}

const SLACK_URL_PREFIX = "https://hooks.slack.com/";
const DISCORD_URL_PREFIXES = [
  "https://discord.com/api/webhooks/",
  "https://discordapp.com/api/webhooks/",
];

export type ChannelUrlValidation = { ok: true; url: URL } | { ok: false; error: string };

/**
 * Pure shape validation for a channel URL (no DNS): parseable, https-only,
 * no embedded credentials, and the provider-specific host prefix. Callers
 * creating channels must ALSO run assertSafeUrl() for the DNS/IP checks.
 */
export function validateChannelUrl(type: WebhookChannelType, rawUrl: string): ChannelUrlValidation {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return { ok: false, error: "That doesn't look like a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { ok: false, error: "Channel URLs must use https." };
  }

  if (url.username || url.password) {
    return { ok: false, error: "URLs containing credentials are not allowed." };
  }

  if (type === "SLACK" && !url.href.startsWith(SLACK_URL_PREFIX)) {
    return { ok: false, error: `Slack webhook URLs start with ${SLACK_URL_PREFIX}` };
  }

  if (type === "DISCORD" && !DISCORD_URL_PREFIXES.some((p) => url.href.startsWith(p))) {
    return { ok: false, error: `Discord webhook URLs start with ${DISCORD_URL_PREFIXES[0]}` };
  }

  return { ok: true, url };
}

/** Display form of a channel URL: scheme + host + "/…" (path stays secret). */
export function maskChannelUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    return `${url.protocol}//${url.host}/…`;
  } catch {
    return "…";
  }
}

/** Extract the target URL from a stored channel configuration. */
export function channelTargetUrl(type: WebhookChannelType, configuration: unknown): string | null {
  if (typeof configuration !== "object" || configuration === null) return null;
  const cfg = configuration as Record<string, unknown>;
  const value = type === "WEBHOOK" ? cfg.url : cfg.webhookUrl;
  return typeof value === "string" && value.length > 0 ? value : null;
}

/** Slack incoming-webhook payload: mrkdwn text. */
export function formatSlackPayload(message: ChannelMessage): { text: string } {
  const parts = [`*${message.title}*`];
  for (const line of message.lines) parts.push(`• ${line}`);
  if (message.url) parts.push(`<${message.url}|View in MyKavo>`);
  return { text: parts.join("\n") };
}

/** Discord webhook payload: markdown content. */
export function formatDiscordPayload(message: ChannelMessage): { content: string } {
  const parts = [`**${message.title}**`];
  for (const line of message.lines) parts.push(`- ${line}`);
  if (message.url) parts.push(message.url);
  return { content: parts.join("\n") };
}

export interface WebhookAlertPayload {
  event: "mykavo.alert";
  title: string;
  lines: string[];
  url?: string;
  severity?: string;
  sentAt: string;
}

/** Generic webhook payload: the raw structured alert. */
export function formatWebhookPayload(message: ChannelMessage, sentAt: Date): WebhookAlertPayload {
  return {
    event: "mykavo.alert",
    title: message.title,
    lines: message.lines,
    ...(message.url !== undefined ? { url: message.url } : {}),
    ...(message.severity !== undefined ? { severity: message.severity } : {}),
    sentAt: sentAt.toISOString(),
  };
}

/** HMAC-SHA256 signature header value for a webhook body. */
export function signWebhookBody(body: string, secret: string): string {
  return `sha256=${createHmac("sha256", secret).update(body, "utf8").digest("hex")}`;
}

const DISPATCH_TIMEOUT_MS = 10_000;

interface PreparedRequest {
  url: string;
  body: string;
  headers: Record<string, string>;
}

function prepareRequest(
  type: WebhookChannelType,
  configuration: unknown,
  message: ChannelMessage,
): PreparedRequest | { error: string } {
  const target = channelTargetUrl(type, configuration);
  if (!target) return { error: "Channel has no URL configured." };

  const shape = validateChannelUrl(type, target);
  if (!shape.ok) return { error: shape.error };

  const headers: Record<string, string> = { "content-type": "application/json" };

  if (type === "SLACK") {
    return { url: target, body: JSON.stringify(formatSlackPayload(message)), headers };
  }
  if (type === "DISCORD") {
    return { url: target, body: JSON.stringify(formatDiscordPayload(message)), headers };
  }

  const body = JSON.stringify(formatWebhookPayload(message, new Date()));
  const secret = (configuration as WebhookChannelConfig).secret;
  if (typeof secret === "string" && secret.length > 0) {
    headers["x-mykavo-signature"] = signWebhookBody(body, secret);
  }
  return { url: target, body, headers };
}

/**
 * Deliver a message to a Slack/Discord/generic-webhook channel. Never throws:
 * every failure (bad config, SSRF-blocked target, timeout, non-2xx) is
 * returned as { ok: false, error }.
 */
export async function dispatchChannelMessage(
  channel: { type: string; configuration: unknown },
  message: ChannelMessage,
): Promise<DispatchResult> {
  if (!isWebhookChannelType(channel.type)) {
    return { ok: false, error: `Unsupported channel type: ${channel.type}` };
  }

  const prepared = prepareRequest(channel.type, channel.configuration, message);
  if ("error" in prepared) return { ok: false, error: prepared.error };

  // Re-validate at send time - DNS may have changed since the channel was
  // created (rebinding), and dispatch runs unattended in the worker.
  try {
    await assertSafeUrl(prepared.url);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "The channel URL failed safety checks.",
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISPATCH_TIMEOUT_MS);
  try {
    const response = await fetch(prepared.url, {
      method: "POST",
      // Webhook endpoints must answer directly; following redirects would
      // re-open the SSRF window after validation.
      redirect: "manual",
      signal: controller.signal,
      headers: prepared.headers,
      body: prepared.body,
    });
    response.body?.cancel().catch(() => undefined);
    if (response.status < 200 || response.status >= 300) {
      return { ok: false, error: `The endpoint responded with HTTP ${response.status}.` };
    }
    return { ok: true };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, error: "The request timed out after 10 seconds." };
    }
    return { ok: false, error: "The request failed. Check the URL and try again." };
  } finally {
    clearTimeout(timer);
  }
}
