import { isMissingTableError, prisma, type Prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";
import { appClientFrom, type Channel } from "./core";

/**
 * Admin tracking - recording. Everything here is fire-and-forget: tracking
 * must never slow down or fail the request it rides on, and until the
 * user_activity migration has run every write is skipped quietly.
 */

/** Per-instance throttle for the daily activity row. */
const TOUCH_EVERY_MS = 2 * 60_000;
/** A gap this long between app requests starts a new "app open". */
const APP_SESSION_GAP_MS = 30 * 60_000;
const lastTouch = new Map<string, number>();
const lastAppOpen = new Map<string, number>();
let warnedMissing = false;

function swallow(err: unknown, what: string) {
  if (isMissingTableError(err)) {
    if (!warnedMissing) {
      warnedMissing = true;
      logger.warn("activity tracking tables missing - run migration 20261001120000_user_activity");
    }
    return;
  }
  logger.warn(`activity tracking: ${what} failed`, { error: err instanceof Error ? err.message : String(err) });
}

function remember(map: Map<string, number>, key: string, now: number, every: number): boolean {
  const prev = map.get(key);
  if (prev !== undefined && now - prev < every) return false;
  map.set(key, now);
  if (map.size > 5000) map.clear(); // bounded memory on a long-lived instance
  return true;
}

/** Mark the user active on a channel today. Throttled per instance. */
export function touchActivity(userId: string, channel: Channel, now: Date = new Date()): void {
  if (!remember(lastTouch, `${userId}|${channel}`, now.getTime(), TOUCH_EVERY_MS)) return;
  const day = new Date(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  void prisma.userActivityDay
    .upsert({
      where: { userId_day_channel: { userId, day, channel } },
      create: { userId, day, channel, firstAt: now, lastAt: now },
      update: { pings: { increment: 1 }, lastAt: now },
    })
    .catch((err: unknown) => swallow(err, "touch"));
}

export interface ActivityEventInput {
  userId: string;
  workspaceId?: string | null;
  channel: Channel;
  type: string;
  path?: string | null;
  label?: string | null;
  meta?: Prisma.InputJsonValue;
}

/** Record one event (and mark the channel active). */
export async function logActivityEvent(input: ActivityEventInput): Promise<void> {
  touchActivity(input.userId, input.channel);
  await prisma.activityEvent
    .create({
      data: {
        userId: input.userId,
        workspaceId: input.workspaceId ?? null,
        channel: input.channel,
        type: input.type,
        path: input.path ?? null,
        label: input.label ? input.label.slice(0, 200) : null,
        ...(input.meta !== undefined ? { meta: input.meta } : {}),
      },
    })
    .catch((err: unknown) => swallow(err, "event"));
}

/**
 * Called for every authenticated API request: if it came from the mobile
 * app, the user is active on Android today, and a request after a 30-minute
 * gap counts as the app being opened.
 */
export function noteAppRequest(
  userId: string,
  workspaceId: string,
  userAgent: string | null,
  clientHeader: string | null,
): void {
  const client = appClientFrom(userAgent, clientHeader);
  if (!client || client.platform !== "android") return;
  const now = new Date();
  touchActivity(userId, "android", now);
  if (!remember(lastAppOpen, userId, now.getTime(), APP_SESSION_GAP_MS)) return;
  // Another instance may have seen this user recently: check before logging.
  void prisma.activityEvent
    .findFirst({
      where: { userId, channel: "android", createdAt: { gte: new Date(now.getTime() - APP_SESSION_GAP_MS) } },
      select: { id: true },
    })
    .then((recent) =>
      recent
        ? undefined
        : logActivityEvent({
            userId,
            workspaceId,
            channel: "android",
            type: "app_open",
            meta: { version: client.version },
          }),
    )
    .catch((err: unknown) => swallow(err, "app open"));
}
