/**
 * "Add to Slack": Slack's OAuth v2 install flow with the single
 * `incoming-webhook` scope. The customer picks a channel on Slack's own
 * consent screen and Slack hands back a webhook URL for it - which becomes
 * an ordinary SLACK alert channel, so delivery reuses the existing,
 * SSRF-guarded dispatch path unchanged. No bot token is kept: MyKavo only
 * ever posts to the one channel the customer chose.
 *
 * CSRF / account-mixing protection: the `state` parameter is an HMAC-signed
 * envelope naming the workspace, the user and an expiry, AND carries a
 * random nonce that must match an httpOnly cookie set on this browser when
 * the flow started. A callback therefore can't be replayed, forged, or
 * completed in someone else's browser to attach their Slack to your
 * workspace (or yours to theirs).
 */

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { appBaseUrl } from "@/lib/app-url";

export const SLACK_STATE_COOKIE = "mykavo-slack-oauth";
/** Long enough to pick a channel, short enough that a leaked link dies fast. */
export const SLACK_STATE_TTL_MS = 10 * 60 * 1000;

const AUTHORIZE_URL = "https://slack.com/oauth/v2/authorize";
const ACCESS_URL = "https://slack.com/api/oauth.v2.access";

export function slackClientId(): string {
  return process.env.SLACK_CLIENT_ID ?? "";
}

function slackClientSecret(): string {
  return process.env.SLACK_CLIENT_SECRET ?? "";
}

/** "Add to Slack" is offered only when the Slack app's credentials exist. */
export function slackInstallConfigured(): boolean {
  return Boolean(slackClientId() && slackClientSecret());
}

/** Must match a Redirect URL registered on the Slack app, exactly. */
export function slackRedirectUri(): string {
  return `${appBaseUrl()}/api/integrations/slack/callback`;
}

export function buildSlackAuthorizeUrl(state: string): string {
  const url = new URL(AUTHORIZE_URL);
  url.searchParams.set("client_id", slackClientId());
  url.searchParams.set("scope", "incoming-webhook");
  url.searchParams.set("redirect_uri", slackRedirectUri());
  url.searchParams.set("state", state);
  return url.toString();
}

/* --------------------------------- state --------------------------------- */

export interface SlackStatePayload {
  workspaceId: string;
  userId: string;
  nonce: string;
  /** Epoch ms after which the state is refused. */
  exp: number;
}

function stateKey(secret: string): Buffer {
  // Domain-separated from every other use of the auth secret.
  return createHmac("sha256", secret).update("mykavo:slack-oauth-state:v1").digest();
}

function sign(body: string, secret: string): string {
  return createHmac("sha256", stateKey(secret)).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function newStateNonce(): string {
  return randomBytes(24).toString("base64url");
}

export function signSlackState(payload: SlackStatePayload, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body, secret)}`;
}

const statePayloadSchema = z.object({
  workspaceId: z.string().min(1),
  userId: z.string().min(1),
  nonce: z.string().min(16),
  exp: z.number(),
});

export type SlackStateCheck =
  | { ok: true; payload: SlackStatePayload }
  | { ok: false; reason: "malformed" | "bad_signature" | "expired" | "nonce_mismatch" };

/**
 * Verify a returned `state` against the signing secret, the clock and the
 * nonce cookie from this browser. Pure - unit-tested.
 */
export function verifySlackState(
  state: string,
  cookieNonce: string | undefined,
  secret: string,
  now: number = Date.now(),
): SlackStateCheck {
  const dot = state.indexOf(".");
  if (dot <= 0 || dot === state.length - 1) return { ok: false, reason: "malformed" };
  const body = state.slice(0, dot);
  const mac = state.slice(dot + 1);
  if (!safeEqual(mac, sign(body, secret))) return { ok: false, reason: "bad_signature" };

  let parsed: SlackStatePayload;
  try {
    parsed = statePayloadSchema.parse(JSON.parse(Buffer.from(body, "base64url").toString("utf8")));
  } catch {
    return { ok: false, reason: "malformed" };
  }
  if (now > parsed.exp) return { ok: false, reason: "expired" };
  if (!cookieNonce || !safeEqual(cookieNonce, parsed.nonce)) {
    return { ok: false, reason: "nonce_mismatch" };
  }
  return { ok: true, payload: parsed };
}

/* ----------------------------- code exchange ----------------------------- */

const accessResponseSchema = z.object({
  ok: z.literal(true),
  team: z.object({ id: z.string(), name: z.string().optional() }).optional(),
  incoming_webhook: z.object({
    url: z.string(),
    channel: z.string().optional(),
    channel_id: z.string().optional(),
  }),
});

export interface SlackInstall {
  webhookUrl: string;
  channelName: string | null;
  teamName: string | null;
}

export class SlackExchangeError extends Error {
  constructor(public readonly code: string) {
    super(`Slack OAuth exchange failed: ${code}`);
    this.name = "SlackExchangeError";
  }
}

/** Read the useful parts of an oauth.v2.access response. Pure - unit-tested. */
export function parseSlackAccessResponse(json: unknown): SlackInstall {
  if (typeof json === "object" && json !== null && (json as { ok?: unknown }).ok === false) {
    const error = (json as { error?: unknown }).error;
    throw new SlackExchangeError(typeof error === "string" ? error : "unknown_error");
  }
  const parsed = accessResponseSchema.safeParse(json);
  if (!parsed.success) throw new SlackExchangeError("unexpected_response");
  return {
    webhookUrl: parsed.data.incoming_webhook.url,
    channelName: parsed.data.incoming_webhook.channel ?? null,
    teamName: parsed.data.team?.name ?? null,
  };
}

/** Trade the one-time code for the channel's incoming webhook. */
export async function exchangeSlackCode(code: string): Promise<SlackInstall> {
  const res = await fetch(ACCESS_URL, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
      authorization: `Basic ${Buffer.from(`${slackClientId()}:${slackClientSecret()}`).toString("base64")}`,
    },
    body: new URLSearchParams({ code, redirect_uri: slackRedirectUri() }).toString(),
    redirect: "error",
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new SlackExchangeError(`http_${res.status}`);
  return parseSlackAccessResponse(await res.json());
}
