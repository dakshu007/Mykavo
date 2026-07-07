/**
 * Server-side plan limit enforcement (spec §39). Frontend checks are UX
 * only — every mutating operation re-checks here. Reads limits exclusively
 * from src/config/plans.ts.
 */

import { prisma } from "@fluxen/database";
import { getPlan, type Plan } from "@/config/plans";

export class LimitError extends Error {
  constructor(
    public readonly code: "WEBSITE_LIMIT" | "PAGE_LIMIT",
    message: string,
  ) {
    super(message);
    this.name = "LimitError";
  }
}

/**
 * Resolve the workspace's plan. Until Stripe billing lands (Phase 8),
 * every workspace is on the Free plan.
 */
export async function getWorkspacePlan(workspaceId: string): Promise<Plan> {
  void workspaceId; // used once Subscription lookup lands in Phase 8
  return getPlan("free");
}

/** Throws LimitError when the workspace cannot add another website. */
export async function assertCanAddWebsite(workspaceId: string): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId);
  const count = await prisma.website.count({ where: { workspaceId } });
  if (count >= plan.limits.websites) {
    throw new LimitError(
      "WEBSITE_LIMIT",
      `Your ${plan.name} plan monitors up to ${plan.limits.websites} website${plan.limits.websites === 1 ? "" : "s"}. Upgrade to add more.`,
    );
  }
}

/**
 * Throws LimitError when setting `requestedCount` monitored pages on
 * `websiteId` would exceed the workspace-wide page limit.
 */
export async function assertPageLimit(
  workspaceId: string,
  websiteId: string,
  requestedCount: number,
): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId);
  const otherPages = await prisma.monitoredPage.count({
    where: { website: { workspaceId }, websiteId: { not: websiteId } },
  });
  if (otherPages + requestedCount > plan.limits.monitoredPages) {
    const available = Math.max(0, plan.limits.monitoredPages - otherPages);
    throw new LimitError(
      "PAGE_LIMIT",
      `Your ${plan.name} plan monitors up to ${plan.limits.monitoredPages} pages across all websites (${available} still available). Upgrade for more.`,
    );
  }
}
