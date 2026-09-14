/**
 * Push delivery (spec §27). The HTTP half of packages/shared/src/push.ts,
 * which holds all the payload/classification logic so it stays testable.
 *
 * Alerts go to every enabled device belonging to every member of the
 * workspace - the point of push is that the person is away from their desk,
 * so "only the owner" would miss the on-call case.
 */

import { prisma } from "@mykavo/database";
import {
  buildPushMessages,
  chunkTokens,
  classifyTickets,
  EXPO_PUSH_SEND_URL,
  isExpoPushToken,
  testAlert,
  type ExpoPushTicket,
  type PushAlert,
  type TicketOutcome,
} from "@mykavo/shared";
import { logger } from "./logger";

/** Consecutive transient failures after which a device is parked. */
const MAX_FAILURES = 10;

const SEND_TIMEOUT_MS = 15_000;

interface SendSummary {
  attempted: number;
  delivered: number;
  pruned: number;
}

/**
 * POST one chunk to Expo. Network and non-200 responses are reported as an
 * error for every token in the chunk rather than thrown: one unreachable
 * chunk must not abandon the rest of the fan-out, and a failed push must
 * never fail the scan that triggered it.
 */
async function sendChunk(
  tokens: readonly string[],
  alert: PushAlert,
  accessToken: string | undefined,
): Promise<TicketOutcome[]> {
  const messages = buildPushMessages(tokens, alert);
  if (messages.length === 0) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const response = await fetch(EXPO_PUSH_SEND_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      body: JSON.stringify(messages),
      signal: controller.signal,
      redirect: "error",
    });

    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 300);
      return messages.map((m) => ({
        token: m.to,
        ok: false,
        error: "UnknownError" as const,
        message: `Expo responded ${response.status}${detail ? `: ${detail}` : ""}`,
        prune: false,
      }));
    }

    const body = (await response.json()) as { data?: ExpoPushTicket[] };
    const tickets = Array.isArray(body.data) ? body.data : [];
    return classifyTickets(
      messages.map((m) => m.to),
      tickets,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Push request failed";
    return messages.map((m) => ({
      token: m.to,
      ok: false,
      error: "UnknownError" as const,
      message,
      prune: false,
    }));
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Apply what Expo told us about each device.
 *
 * DeviceNotRegistered means the app is gone and Expo REQUIRES us to stop -
 * those rows are disabled with a reason so they stay distinguishable from a
 * user who turned alerts off. Transient failures only increment a counter;
 * a device is parked after MAX_FAILURES so a permanently broken token cannot
 * be retried forever, and any success resets the streak.
 */
async function applyOutcomes(outcomes: readonly TicketOutcome[]): Promise<number> {
  const delivered = outcomes.filter((o) => o.ok).map((o) => o.token);
  const prune = outcomes.filter((o) => o.prune).map((o) => o.token);
  const transient = outcomes.filter((o) => !o.ok && !o.prune).map((o) => o.token);

  if (delivered.length > 0) {
    await prisma.pushDevice.updateMany({
      where: { token: { in: delivered } },
      data: { failureCount: 0, lastNotifiedAt: new Date() },
    });
  }

  if (prune.length > 0) {
    await prisma.pushDevice.updateMany({
      where: { token: { in: prune } },
      data: { enabled: false, disabledReason: "DeviceNotRegistered" },
    });
  }

  if (transient.length > 0) {
    await prisma.pushDevice.updateMany({
      where: { token: { in: transient } },
      data: { failureCount: { increment: 1 } },
    });
    await prisma.pushDevice.updateMany({
      where: { token: { in: transient }, failureCount: { gte: MAX_FAILURES } },
      data: { enabled: false, disabledReason: "TooManyFailures" },
    });
  }

  return delivered.length;
}

/**
 * "Send me a test alert" from the app's Settings screen.
 *
 * Scoped to ONE user's own devices - a test must never buzz a colleague's
 * phone. Returns the same summary as a real send, and null when the user has
 * no registered device, so the caller can tell "nothing to send to" from
 * "sent and it failed".
 */
export async function sendTestPush(userId: string): Promise<SendSummary | null> {
  const devices = await prisma.pushDevice.findMany({
    where: { userId, enabled: true },
    select: { token: true },
  });
  const tokens = devices.map((d) => d.token).filter(isExpoPushToken);
  if (tokens.length === 0) return null;

  const outcomes: TicketOutcome[] = [];
  for (const chunk of chunkTokens(tokens)) {
    outcomes.push(
      ...(await sendChunk(
        chunk,
        testAlert(),
        process.env.EXPO_ACCESS_TOKEN,
      )),
    );
  }

  const delivered = await applyOutcomes(outcomes);
  const pruned = outcomes.filter((o) => o.prune).length;
  logger.info("push test dispatched", {
    userId,
    attempted: tokens.length,
    delivered,
    pruned,
    ...(delivered === 0 && outcomes[0]?.message ? { error: outcomes[0].message } : {}),
  });
  return { attempted: tokens.length, delivered, pruned };
}

/**
 * Send `alert` to every enabled device of every member of the workspace.
 *
 * Records ONE Notification row summarizing the fan-out, matching how the email
 * and chat channels are recorded. Returns null when there is nothing to send
 * to, so the caller can tell "no devices" from "sent".
 */
export async function fanOutToPush(
  workspaceId: string,
  websiteId: string | null,
  scanId: string | null,
  alert: PushAlert,
): Promise<SendSummary | null> {
  const devices = await prisma.pushDevice.findMany({
    where: {
      enabled: true,
      user: { memberships: { some: { workspaceId } } },
    },
    select: { token: true },
  });

  const tokens = devices.map((d) => d.token).filter(isExpoPushToken);
  if (tokens.length === 0) return null;

  const accessToken = process.env.EXPO_ACCESS_TOKEN;
  const outcomes: TicketOutcome[] = [];
  for (const chunk of chunkTokens(tokens)) {
    outcomes.push(...(await sendChunk(chunk, alert, accessToken)));
  }

  const delivered = await applyOutcomes(outcomes);
  const pruned = outcomes.filter((o) => o.prune).length;
  const failed = outcomes.filter((o) => !o.ok);

  await prisma.notification.create({
    data: {
      workspaceId,
      websiteId,
      scanId,
      channelType: "PUSH",
      recipient: `${tokens.length} device${tokens.length === 1 ? "" : "s"}`,
      subject: alert.title,
      status: delivered > 0 ? "SENT" : "FAILED",
      sentAt: delivered > 0 ? new Date() : null,
      errorMessage:
        delivered === 0 && failed.length > 0 ? (failed[0].message ?? null) : null,
    },
  });

  logger.info("push alert dispatched", {
    workspaceId,
    ...(websiteId ? { websiteId } : {}),
    ...(scanId ? { scanId } : {}),
    attempted: tokens.length,
    delivered,
    pruned,
  });

  return { attempted: tokens.length, delivered, pruned };
}
