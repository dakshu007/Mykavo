/**
 * Free trials of Pro (14 days, no card). A workspace gets one trial, ever.
 * While it runs and nothing is paid, getWorkspaceEntitlement grants Pro with
 * a smaller website cap, so every existing limit and feature check works
 * unchanged. The worker's trial sweep handles the reminder, the end, and the
 * websites over the Free limit afterwards.
 */

import type { PrismaClient, Prisma } from "@prisma/client";
import { isMissingTableError } from "./automations";

type Db = PrismaClient | Prisma.TransactionClient;

/** Mirrors TRIAL_DAYS in @mykavo/shared (this package does not depend on it). */
export const TRIAL_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ActiveTrial {
  planId: "pro";
  startedAt: Date;
  endsAt: Date;
}

/** The workspace's running trial, or null. A missing table means no trials yet. */
export async function getActiveTrial(db: Db, workspaceId: string, now: Date = new Date()): Promise<ActiveTrial | null> {
  try {
    const trial = await db.workspaceTrial.findUnique({ where: { workspaceId } });
    if (!trial || trial.endsAt <= now) return null;
    return { planId: "pro", startedAt: trial.startedAt, endsAt: trial.endsAt };
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}

/**
 * Starts a trial unless the workspace already had one. Returns the trial
 * when it was started now, null when it already existed (or the table is
 * missing). Never extends or restarts an existing trial.
 */
export async function startTrial(
  db: Db,
  workspaceId: string,
  options: { source: "signup" | "reactivation"; now?: Date; days?: number } ,
): Promise<ActiveTrial | null> {
  const now = options.now ?? new Date();
  const endsAt = new Date(now.getTime() + (options.days ?? TRIAL_DAYS) * DAY_MS);
  try {
    const existing = await db.workspaceTrial.findUnique({ where: { workspaceId }, select: { workspaceId: true } });
    if (existing) return null;
    await db.workspaceTrial.create({
      data: { workspaceId, planId: "pro", startedAt: now, endsAt, source: options.source },
    });
    return { planId: "pro", startedAt: now, endsAt };
  } catch (err) {
    if (isMissingTableError(err)) return null;
    // Two first visits at once: the other request created it.
    if (typeof err === "object" && err !== null && (err as { code?: string }).code === "P2002") return null;
    throw err;
  }
}

/** Whole days left, rounded up (a trial ending in 5 hours has 1 day left). */
export function trialDaysLeft(endsAt: Date, now: Date = new Date()): number {
  return Math.max(0, Math.ceil((endsAt.getTime() - now.getTime()) / DAY_MS));
}
