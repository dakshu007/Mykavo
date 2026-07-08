/**
 * Plan entitlement mapping (Phase 8). Bridges the raw DB entitlement to the
 * feature/limit config in @/config/plans. Persistence mutations live in
 * @fluxen/database (the webhook applies them inside a transaction).
 */

import { prisma, getWorkspaceEntitlement } from "@fluxen/database";
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
