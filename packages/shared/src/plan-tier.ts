/**
 * Plan tiers and prices shared by the web app and the worker. The web plan
 * config (apps/web/src/config/plans.ts) owns limits and features; this module
 * holds only what the worker also needs - which tiers exist, what they cost,
 * and which tier-gated features the worker enforces itself - because the
 * worker cannot import web modules.
 */

export type PlanTier = "free" | "pro" | "agency";

/** Monthly price per tier, in USD. The one place a price is written down. */
export const PLAN_PRICES_USD: Record<PlanTier, number> = {
  free: 0,
  pro: 20,
  agency: 49,
};

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  pro: "Pro",
  agency: "Agency",
};

/** Narrow an untrusted plan string (a DB column) to a tier, defaulting to Free. */
export function toPlanTier(value: string | null | undefined): PlanTier {
  return value === "pro" || value === "agency" ? value : "free";
}

export function isPaidTier(tier: PlanTier): boolean {
  return tier !== "free";
}

/**
 * White-label client reports and their automatic email delivery. An Agency
 * feature - plus Pro subscriptions that started before Agency existed, which
 * keep what they bought (see isGrandfatheredPro in @mykavo/database).
 */
export function includesClientReports(tier: PlanTier, grandfathered: boolean): boolean {
  return tier === "agency" || (tier === "pro" && grandfathered);
}

/** Conversion element monitoring: every paid tier. */
export function includesConversionMonitoring(tier: PlanTier): boolean {
  return isPaidTier(tier);
}
