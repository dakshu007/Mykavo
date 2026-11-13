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

/**
 * Who can use the AI Keyword Agent: platform admins always; then a beta list
 * of verified emails; then everyone. Changed from the All Usage page.
 */
export const AGENT_ROLLOUT_KEY = "ai.agent.rollout";

export type AgentRolloutMode = "admins" | "beta" | "everyone";

export interface AgentRollout {
  mode: AgentRolloutMode;
  /** Lower-case emails allowed in "beta" mode. */
  betaEmails: string[];
  updatedAt: Date | null;
  updatedBy: string | null;
}

const MODES: AgentRolloutMode[] = ["admins", "beta", "everyone"];

/** Fails closed to admins only. */
export async function getAgentRollout(db: Pick<PrismaClient, "appSetting">): Promise<AgentRollout> {
  try {
    const row = await db.appSetting.findUnique({ where: { key: AGENT_ROLLOUT_KEY } });
    const value = (row?.value ?? {}) as { mode?: unknown; betaEmails?: unknown };
    const mode = MODES.includes(value.mode as AgentRolloutMode) ? (value.mode as AgentRolloutMode) : "admins";
    const betaEmails = Array.isArray(value.betaEmails)
      ? value.betaEmails.filter((e): e is string => typeof e === "string").map((e) => e.trim().toLowerCase())
      : [];
    return { mode, betaEmails, updatedAt: row?.updatedAt ?? null, updatedBy: row?.updatedBy ?? null };
  } catch {
    return { mode: "admins", betaEmails: [], updatedAt: null, updatedBy: null };
  }
}

export async function setAgentRollout(
  db: Pick<PrismaClient, "appSetting">,
  value: { mode: AgentRolloutMode; betaEmails: string[] },
  updatedBy: string,
): Promise<AgentRollout> {
  const clean = {
    mode: value.mode,
    betaEmails: [...new Set(value.betaEmails.map((e) => e.trim().toLowerCase()).filter((e) => e.includes("@")))].slice(0, 200),
  };
  const row = await db.appSetting.upsert({
    where: { key: AGENT_ROLLOUT_KEY },
    create: { key: AGENT_ROLLOUT_KEY, value: clean, updatedBy },
    update: { value: clean, updatedBy },
  });
  return { ...clean, updatedAt: row.updatedAt, updatedBy: row.updatedBy };
}

/** Pure: may this (verified) email use the agent under this rollout? */
export function rolloutAllows(rollout: Pick<AgentRollout, "mode" | "betaEmails">, email: string | null, verified: boolean): boolean {
  if (rollout.mode === "everyone") return true;
  if (rollout.mode === "beta" && verified && email) return rollout.betaEmails.includes(email.trim().toLowerCase());
  return false;
}
