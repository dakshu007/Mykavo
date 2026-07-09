/**
 * Plan entitlement mapping (Phase 8). Bridges the raw DB entitlement to the
 * feature/limit config in @/config/plans. Persistence mutations live in
 * @fluxen/database (the webhook applies them inside a transaction).
 */

import {
  prisma,
  getWorkspaceEntitlement,
  getWorkspaceAddonWebsites,
  listActiveWebsiteAddons,
  type ActiveWebsiteAddon,
} from "@fluxen/database";
import { getPlan, WEBSITE_ADDON, type Plan } from "@/config/plans";

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
 * A workspace's effective website limit: the plan base plus any active
 * self-serve add-ons. Add-ons only extend paid plans (Free stays at its base)
 * and their total contribution is capped defensively at the configured
 * maximum (maxUnits × websitesPerUnit), regardless of what the billing rows
 * say. Returns Infinity only if a plan ever declares unlimited websites.
 */
export async function getEffectiveWebsiteLimit(workspaceId: string): Promise<number> {
  const plan = await getWorkspacePlan(workspaceId);
  const base = plan.limits.websites;
  if (base === Infinity) return Infinity;
  const extra =
    plan.id === "pro" ? await getWorkspaceAddonWebsites(prisma, workspaceId) : 0;
  const maxExtra = WEBSITE_ADDON.maxUnits * WEBSITE_ADDON.websitesPerUnit;
  return base + Math.min(extra, maxExtra);
}

/** Active website add-ons for a workspace (billing display). */
export async function getWorkspaceAddons(
  workspaceId: string,
): Promise<ActiveWebsiteAddon[]> {
  return listActiveWebsiteAddons(prisma, workspaceId);
}
