/**
 * Dodo Payments webhook signature verification — Standard Webhooks spec
 * (Svix-compatible), implemented with Node crypto (no SDK). See research spec.
 *
 * Contract:
 *  - headers: webhook-id, webhook-timestamp (unix seconds), webhook-signature
 *    (space-delimited "<version>,<base64sig>" tokens)
 *  - signed content: `${id}.${timestamp}.${rawBody}` (EXACT raw bytes)
 *  - HMAC-SHA256, base64; key = base64-decode(secret without optional whsec_)
 *  - reject if |now - timestamp| > tolerance (replay protection)
 *  - accept if any v1 token matches (constant-time)
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const DEFAULT_TOLERANCE_SECONDS = Number(
  process.env.DODO_WEBHOOK_TOLERANCE_SECONDS ?? 300,
);

export type WebhookVerifyError =
  | "MISSING_HEADERS"
  | "BAD_TIMESTAMP"
  | "TIMESTAMP_OUT_OF_TOLERANCE"
  | "NO_MATCHING_SIGNATURE"
  | "INVALID_JSON";

export class DodoWebhookError extends Error {
  constructor(public readonly code: WebhookVerifyError, message: string) {
    super(message);
    this.name = "DodoWebhookError";
  }
}

export interface WebhookHeaders {
  webhookId: string | null;
  webhookTimestamp: string | null;
  webhookSignature: string | null;
}

function signingKey(secret: string): Buffer {
  // Secret may be shown with or without the whsec_ prefix; strip only if present.
  const raw = secret.startsWith("whsec_") ? secret.slice("whsec_".length) : secret;
  return Buffer.from(raw, "base64");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Verify and parse a Dodo webhook. Returns the parsed JSON body on success,
 * throws DodoWebhookError otherwise. `rawBody` must be the exact request text.
 */
export function verifyDodoWebhook(
  rawBody: string,
  headers: WebhookHeaders,
  secret: string,
  toleranceSeconds: number = DEFAULT_TOLERANCE_SECONDS,
): unknown {
  const { webhookId, webhookTimestamp, webhookSignature } = headers;
  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    throw new DodoWebhookError("MISSING_HEADERS", "Missing Standard Webhooks headers.");
  }

  const ts = Number(webhookTimestamp);
  if (!Number.isFinite(ts)) {
    throw new DodoWebhookError("BAD_TIMESTAMP", "webhook-timestamp is not a number.");
  }
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > toleranceSeconds) {
    throw new DodoWebhookError(
      "TIMESTAMP_OUT_OF_TOLERANCE",
      "webhook-timestamp is outside the allowed tolerance.",
    );
  }

  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expected = createHmac("sha256", signingKey(secret))
    .update(signedContent, "utf8")
    .digest("base64");

  // webhook-signature: space-delimited "<version>,<base64sig>" — accept any v1.
  const matched = webhookSignature.split(" ").some((token) => {
    const comma = token.indexOf(",");
    if (comma === -1) return false;
    const version = token.slice(0, comma);
    const sig = token.slice(comma + 1);
    return version === "v1" && sig.length > 0 && safeEqual(sig, expected);
  });

  if (!matched) {
    throw new DodoWebhookError("NO_MATCHING_SIGNATURE", "No matching v1 signature.");
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw new DodoWebhookError("INVALID_JSON", "Verified body is not valid JSON.");
  }
}

/* ------------------------- event classification -------------------------- */

/** Event types that grant Pro access (research §2). */
const GRANT_EVENTS = new Set([
  "subscription.active",
  "subscription.renewed",
  "payment.succeeded",
]);

/** Event types that revoke access. Both cancel spellings, per research §6.1. */
const REVOKE_EVENTS = new Set([
  "subscription.cancelled",
  "subscription.canceled",
  "subscription.expired",
  "subscription.failed",
  "subscription.on_hold",
]);

export type DodoEventAction = "ignored" | "noop" | "grant" | "revoke";

/**
 * Decide what a verified Dodo event means for entitlements. Pure and
 * unit-tested — this logic once had two production bugs:
 *
 *  - Only subscription.* / payment.* lifecycle events may touch entitlements.
 *    Dodo emits other families (license_key.*, entitlement_grant.*,
 *    dispute.*) whose `status` describes THAT object — a license key's
 *    "Delivered" status was read as a revoke and downgraded a paying
 *    workspace seconds after checkout.
 *  - payment.* events carry the PAYMENT's status ("succeeded"), not the
 *    subscription's — payment.succeeded must grant regardless of it, and the
 *    subscription-status revoke heuristic must never fire on payment events.
 *
 * "noop" events (e.g. subscription.updated while active) must return before
 * attribution: consuming the one-time checkout token on a noop strands the
 * grant event right behind it as unattributed.
 */
export function classifyDodoEvent(type: string, status: string): DodoEventAction {
  if (!type.startsWith("subscription.") && !type.startsWith("payment.")) {
    return "ignored";
  }
  const grants =
    GRANT_EVENTS.has(type) &&
    (type === "payment.succeeded" || status === "" || status === "active");
  if (grants) return "grant";
  const revokes =
    REVOKE_EVENTS.has(type) ||
    (type.startsWith("subscription.") &&
      status !== "" &&
      status !== "active" &&
      status !== "pending");
  return revokes ? "revoke" : "noop";
}
