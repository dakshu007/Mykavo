import type { PrismaClient } from "@prisma/client";

/**
 * The AI kill switch. One row in app_setting, read before every AI call in
 * the web app and before every AI job in the worker, so pausing takes effect
 * on the very next call with no redeploy and no cache to wait out. AI calls
 * are rare, so one primary-key read each costs nothing worth saving.
 *
 * Monitoring never reads this: scans, comparisons and alerts keep running
 * while AI is paused.
 */

export const AI_PAUSED_KEY = "ai.paused";

export interface AiPauseState {
  paused: boolean;
  updatedAt: Date | null;
  updatedBy: string | null;
}

/**
 * Whether AI is paused. Fails closed: if the switch cannot be read, AI is
 * treated as paused, because an AI call that cannot be stopped is the thing
 * this switch exists to prevent.
 */
export async function getAiPauseState(db: Pick<PrismaClient, "appSetting">): Promise<AiPauseState> {
  try {
    const row = await db.appSetting.findUnique({ where: { key: AI_PAUSED_KEY } });
    if (!row) return { paused: false, updatedAt: null, updatedBy: null };
    const value = row.value as { paused?: unknown } | null;
    return { paused: value?.paused === true, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
  } catch {
    return { paused: true, updatedAt: null, updatedBy: null };
  }
}

export async function isAiPaused(db: Pick<PrismaClient, "appSetting">): Promise<boolean> {
  return (await getAiPauseState(db)).paused;
}

export async function setAiPaused(
  db: Pick<PrismaClient, "appSetting">,
  paused: boolean,
  updatedBy: string,
): Promise<AiPauseState> {
  const row = await db.appSetting.upsert({
    where: { key: AI_PAUSED_KEY },
    create: { key: AI_PAUSED_KEY, value: { paused }, updatedBy },
    update: { value: { paused }, updatedBy },
  });
  return { paused, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
}
