/**
 * Server-side plan limit enforcement (spec §39). Frontend checks are UX
 * only — every mutating operation re-checks here. Reads limits exclusively
 * from src/config/plans.ts.
 */

import { prisma } from "@fluxen/database";
import { formatLimit, WEBSITE_ADDON, type Plan } from "@/config/plans";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/billing/subscription";

export { getWorkspacePlan, getEffectiveWebsiteLimit };

/** Max simultaneously QUEUED/RUNNING scans per workspace (abuse guard, spec §43). */
export const MAX_CONCURRENT_SCANS_PER_WORKSPACE = 10;

export class LimitError extends Error {
  constructor(
    public readonly code:
      | "WEBSITE_LIMIT"
      | "PAGE_LIMIT"
      | "SCAN_CONCURRENCY"
      | "MANUAL_SCAN_QUOTA",
    message: string,
  ) {
    super(message);
    this.name = "LimitError";
  }
}

function startOfUtcDay(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Guards a scan trigger (spec §43): the workspace must be under the concurrent-
 * scan cap, and — for MANUAL re-scans — under its plan's daily manual quota.
 * Throws LimitError (callers map to HTTP 429).
 */
export async function assertScanAllowed(
  workspaceId: string,
  plan: Plan,
  triggerType: "BASELINE" | "MANUAL",
): Promise<void> {
  const inFlight = await prisma.scan.count({
    where: { website: { workspaceId }, status: { in: ["QUEUED", "RUNNING"] } },
  });
  if (inFlight >= MAX_CONCURRENT_SCANS_PER_WORKSPACE) {
    throw new LimitError(
      "SCAN_CONCURRENCY",
      `Too many scans running at once (limit ${MAX_CONCURRENT_SCANS_PER_WORKSPACE}). Wait for some to finish, then try again.`,
    );
  }

  if (triggerType === "MANUAL" && plan.limits.manualScansPerDay !== Infinity) {
    const usedToday = await prisma.scan.count({
      where: {
        website: { workspaceId },
        triggerType: "MANUAL",
        createdAt: { gte: startOfUtcDay() },
      },
    });
    if (usedToday >= plan.limits.manualScansPerDay) {
      throw new LimitError(
        "MANUAL_SCAN_QUOTA",
        `You've used all ${plan.limits.manualScansPerDay} manual scans for today (resets at midnight UTC).`,
      );
    }
  }
}

/** Throws LimitError when the workspace cannot add another website. */
export async function assertCanAddWebsite(workspaceId: string): Promise<void> {
  const [plan, limit] = await Promise.all([
    getWorkspacePlan(workspaceId),
    getEffectiveWebsiteLimit(workspaceId),
  ]);
  if (limit === Infinity) return;
  const count = await prisma.website.count({ where: { workspaceId } });
  if (count >= limit) {
    const hint =
      plan.id === "pro"
        ? `Add ${WEBSITE_ADDON.websitesPerUnit} more for $${WEBSITE_ADDON.priceMonthlyUsd}/mo from Billing (up to ${WEBSITE_ADDON.maxUnits} add-ons).`
        : "Upgrade to Pro to monitor more websites.";
    throw new LimitError(
      "WEBSITE_LIMIT",
      `Your ${plan.name} plan monitors up to ${formatLimit(limit)} website${limit === 1 ? "" : "s"}. ${hint}`,
    );
  }
}

/**
 * Throws LimitError when setting `requestedCount` monitored pages on a
 * website would exceed the plan's per-website page limit. Only gates new
 * selections — websites that already exceed the limit keep their pages.
 */
export async function assertPageLimit(
  workspaceId: string,
  _websiteId: string,
  requestedCount: number,
): Promise<void> {
  const plan = await getWorkspacePlan(workspaceId);
  if (plan.limits.pagesPerWebsite === Infinity) return;
  if (requestedCount > plan.limits.pagesPerWebsite) {
    const upsell =
      plan.id === "pro" ? "" : " Upgrade to Pro to monitor more pages per website.";
    throw new LimitError(
      "PAGE_LIMIT",
      `Your ${plan.name} plan monitors up to ${formatLimit(plan.limits.pagesPerWebsite)} pages per website.${upsell}`,
    );
  }
}
