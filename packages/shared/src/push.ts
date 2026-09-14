/**
 * Expo push notifications (spec §27 - alert channels).
 *
 * A change-monitoring product whose alerts only land in an inbox has a gap:
 * the person who needs to know a checkout button vanished is usually not at a
 * desk. This module is the pure half of closing it - payload building, token
 * validation and, most importantly, deciding which delivery failures mean
 * "stop sending to this device forever".
 *
 * The contract mirrors Expo's push service exactly (verified against
 * expo-server-sdk 7.2.0, which is deliberately NOT a dependency - the whole
 * client is one fetch call and an extra package buys nothing):
 *
 *   POST https://exp.host/--/api/v2/push/send      -> { data: ExpoPushTicket[] }
 *   POST https://exp.host/--/api/v2/push/getReceipts
 *
 * Everything here is pure and synchronous. The HTTP call lives in the worker
 * so this stays testable without a network.
 */

export const EXPO_PUSH_SEND_URL = "https://exp.host/--/api/v2/push/send";
export const EXPO_PUSH_RECEIPTS_URL = "https://exp.host/--/api/v2/push/getReceipts";

/** Expo rejects requests carrying more than 100 messages. */
export const PUSH_CHUNK_LIMIT = 100;

/**
 * Expo caps a single message at 4 KiB of JSON. We budget well under it: the
 * title and body are the only user-shaped fields and a truncated alert that
 * ARRIVES beats a precise one rejected as MessageTooBig.
 */
export const PUSH_TITLE_MAX = 100;
export const PUSH_BODY_MAX = 480;

/** Android channels, created client-side; severity picks the channel. */
export const PUSH_CHANNEL_CRITICAL = "critical-changes";
export const PUSH_CHANNEL_DEFAULT = "changes";

export type PushSeverity = "INFO" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

/**
 * Errors Expo returns per-ticket. `DeviceNotRegistered` is the one that
 * matters: the app was uninstalled or the token rotated, and Expo REQUIRES
 * senders to stop using it. Continuing to send is what gets a project
 * rate-limited.
 */
export type PushErrorCode =
  | "DeveloperError"
  | "DeviceNotRegistered"
  | "ExpoError"
  | "InvalidCredentials"
  | "MessageRateExceeded"
  | "MessageTooBig"
  | "ProviderError";

export interface ExpoPushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: "default" | null;
  priority?: "default" | "normal" | "high";
  channelId?: string;
  badge?: number;
}

export type ExpoPushTicket =
  | { status: "ok"; id: string }
  | {
      status: "error";
      message: string;
      details?: { error?: PushErrorCode; expoPushToken?: string };
    };

/**
 * Expo push token shape. Accepts both bracket forms and the bare UUID form,
 * matching expo-server-sdk's own check - a token we wrongly reject is an
 * alert the user silently never receives.
 */
const UUID_TOKEN = /^[a-z\d]{8}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{4}-[a-z\d]{12}$/i;

export function isExpoPushToken(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (
    (value.startsWith("ExponentPushToken[") || value.startsWith("ExpoPushToken[")) &&
    value.endsWith("]")
  ) {
    // Reject the empty bracket body - "ExponentPushToken[]" is not a token.
    return value.includes("[") && value.indexOf("]") > value.indexOf("[") + 1;
  }
  return UUID_TOKEN.test(value);
}

/** Split tokens into request-sized chunks (never more than PUSH_CHUNK_LIMIT). */
export function chunkTokens(
  tokens: readonly string[],
  limit: number = PUSH_CHUNK_LIMIT,
): string[][] {
  if (limit < 1) throw new RangeError("chunk limit must be at least 1");
  const chunks: string[][] = [];
  for (let i = 0; i < tokens.length; i += limit) {
    chunks.push(tokens.slice(i, i + limit));
  }
  return chunks;
}

/**
 * Trim to a maximum length on a word boundary where one is close by, adding an
 * ellipsis. Never returns more than `max` characters.
 */
export function truncate(value: string, max: number): string {
  const text = value.trim().replace(/\s+/g, " ");
  if (text.length <= max) return text;
  const hard = text.slice(0, max - 1);
  const lastSpace = hard.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? hard.slice(0, lastSpace) : hard;
  return `${cut.trimEnd()}…`;
}

/**
 * HIGH and CRITICAL ring through immediately; anything quieter is delivered at
 * normal priority so routine noise cannot wake somebody at 3am. This is the
 * same threshold the email channel uses by default.
 */
export function pushPriority(severity: PushSeverity | null): "default" | "high" {
  return severity === "CRITICAL" || severity === "HIGH" ? "high" : "default";
}

export function pushChannelId(severity: PushSeverity | null): string {
  return severity === "CRITICAL" || severity === "HIGH"
    ? PUSH_CHANNEL_CRITICAL
    : PUSH_CHANNEL_DEFAULT;
}

export interface PushAlert {
  title: string;
  body: string;
  severity?: PushSeverity | null;
  /** Deep-link target inside the app, e.g. "/website/abc" or "/change/xyz". */
  path?: string;
  websiteId?: string;
  scanId?: string;
}

/**
 * Build one message per token. Expo accepts an array in `to`, but one message
 * per token keeps ticket-to-token mapping exact - which is what makes
 * DeviceNotRegistered pruning reliable rather than a guess.
 */
export function buildPushMessages(
  tokens: readonly string[],
  alert: PushAlert,
): ExpoPushMessage[] {
  const severity = alert.severity ?? null;
  const title = truncate(alert.title, PUSH_TITLE_MAX);
  const body = truncate(alert.body, PUSH_BODY_MAX);
  const data: Record<string, unknown> = {};
  if (alert.path) data.path = alert.path;
  if (alert.websiteId) data.websiteId = alert.websiteId;
  if (alert.scanId) data.scanId = alert.scanId;
  if (severity) data.severity = severity;

  return tokens.filter(isExpoPushToken).map((to) => ({
    to,
    title,
    body,
    sound: "default" as const,
    priority: pushPriority(severity),
    channelId: pushChannelId(severity),
    ...(Object.keys(data).length > 0 ? { data } : {}),
  }));
}

export interface TicketOutcome {
  token: string;
  ok: boolean;
  /** Receipt id, for later delivery confirmation. */
  receiptId?: string;
  error?: PushErrorCode | "UnknownError";
  message?: string;
  /**
   * True when this token must never be used again (the app is gone). Expo
   * requires senders to stop; a transient failure must NOT set this or we
   * would silently unsubscribe a working device.
   */
  prune: boolean;
}

/**
 * Pair each ticket with the token it was sent for, and classify the failures.
 *
 * Expo returns tickets positionally, so a length mismatch means we cannot
 * trust the pairing - in that case nothing is pruned. Dropping a device
 * because a response came back the wrong shape would be the worst possible
 * failure mode: alerts stop and nobody finds out.
 */
export function classifyTickets(
  tokens: readonly string[],
  tickets: readonly ExpoPushTicket[],
): TicketOutcome[] {
  const aligned = tokens.length === tickets.length;

  return tokens.map((token, index) => {
    const ticket = aligned ? tickets[index] : undefined;
    if (!ticket) {
      return {
        token,
        ok: false,
        error: "UnknownError" as const,
        message: aligned
          ? "No ticket returned for this token."
          : `Expo returned ${tickets.length} tickets for ${tokens.length} messages.`,
        prune: false,
      };
    }
    if (ticket.status === "ok") {
      return { token, ok: true, receiptId: ticket.id, prune: false };
    }
    const code = ticket.details?.error;
    return {
      token,
      ok: false,
      error: code ?? ("UnknownError" as const),
      message: ticket.message,
      prune: code === "DeviceNotRegistered",
    };
  });
}

/** Tokens the caller must stop sending to (Expo's requirement). */
export function tokensToPrune(outcomes: readonly TicketOutcome[]): string[] {
  return outcomes.filter((o) => o.prune).map((o) => o.token);
}

/**
 * Turn a scan's change summary into an alert. Kept here so the wording is
 * tested rather than assembled inline in the worker.
 */
export function scanAlert(input: {
  host: string;
  changeCount: number;
  highestSeverity: PushSeverity | null;
  websiteId: string;
  scanId?: string;
  topChange?: string;
}): PushAlert {
  const plural = input.changeCount === 1 ? "change" : "changes";
  const severity = input.highestSeverity;
  const title = severity
    ? `${severity === "CRITICAL" ? "Critical" : severity === "HIGH" ? "Important" : "New"} ${plural} on ${input.host}`
    : `${input.changeCount} ${plural} on ${input.host}`;
  const body = input.topChange
    ? input.changeCount > 1
      ? `${input.topChange} · and ${input.changeCount - 1} more`
      : input.topChange
    : `${input.changeCount} ${plural} detected.`;
  return {
    title,
    body,
    severity,
    path: `/website/${input.websiteId}`,
    websiteId: input.websiteId,
    ...(input.scanId ? { scanId: input.scanId } : {}),
  };
}

/**
 * The "send me a test alert" notification.
 *
 * Deliberately says it is a test AND what a real one looks like, so somebody
 * who taps the button months later is not left wondering whether a site just
 * broke.
 */
export function testAlert(): PushAlert {
  return {
    title: "MyKavo alerts are working",
    body: "This is a test. Real alerts name the site and what changed.",
    severity: "INFO",
    path: "/(tabs)/settings",
  };
}

/** Alert for a scan that could not produce a verdict. */
export function failureAlert(input: {
  host: string;
  websiteId: string;
  reason: string;
  kind: "failed" | "incomplete";
}): PushAlert {
  return {
    title:
      input.kind === "incomplete"
        ? `Scan incomplete on ${input.host}`
        : `Scan failed on ${input.host}`,
    body: input.reason,
    severity: input.kind === "incomplete" ? "HIGH" : "CRITICAL",
    path: `/website/${input.websiteId}`,
    websiteId: input.websiteId,
  };
}
