/**
 * Plan entitlement mapping (Phase 8). Bridges the raw DB entitlement to the
 * feature/limit config in @/config/plans. Persistence mutations live in
 * @mykavo/database (the webhook applies them inside a transaction).
 */

import { prisma, getWorkspaceEntitlement } from "@mykavo/database";
import { getPlan, type Plan } from "@/config/plans";

export interface WorkspaceSubscription {
  planId: "free" | "pro";
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd: Date | null;
  dodoCustomerId: string | null;
  dodoSubscriptionId: string | null;
}

/** Resolve a workspace's effective plan (features + limits). */
export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  const ent = await getWorkspaceEntitlement(prisma, workspaceId);
  return getPlan(ent?.planId === "pro" ? "pro" : "free");
}

export async function getWorkspaceSubscription(
  workspaceId: string,
): Promise<WorkspaceSubscription | null> {
  const ent = await getWorkspaceEntitlement(prisma, workspaceId);
  return ent ?? null;
}

/**
 * A workspace's effective website limit. This is simply the plan's base limit
 * since the self-serve website add-on was retired (2026-07-17); the helper
 * stays so enforcement keeps one entry point if capacity math ever returns.
 */
export async function getEffectiveWebsiteLimit(workspaceId: string): Promise<number> {
  const plan = await getWorkspacePlan(workspaceId);
  return plan.limits.websites;
}
