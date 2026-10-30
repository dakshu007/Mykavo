/**
 * Plan tiers and prices shared by the web app and the worker. The web plan
 * config (apps/web/src/config/plans.ts) owns limits and features; this module
 * holds only what the worker also needs - which tiers exist, what they cost,
 * and which tier-gated features the worker enforces itself - because the
 * worker cannot import web modules.
 */

import type { ScanFrequency } from "./schedule";

export type PlanTier = "free" | "starter" | "pro" | "agency";

/** How often a tier's websites are scanned. Paid plans scan daily. */
export function scanFrequencyForTier(tier: PlanTier): ScanFrequency {
  return tier === "free" ? "WEEKLY" : "DAILY";
}

/** Free Pro trial: length, and the websites it allows (Pro features, smaller footprint). */
export const TRIAL_DAYS = 14;
export const TRIAL_MAX_WEBSITES = 3;
/** The "trial ending" email goes out when this many days are left. */
export const TRIAL_REMINDER_DAYS_LEFT = 3;

/** Monthly price per tier, in USD. The one place a price is written down. */
export const PLAN_PRICES_USD: Record<PlanTier, number> = {
  free: 0,
  starter: 7,
  pro: 20,
  agency: 79,
};

/**
 * Yearly price per tier, in USD: twelve months for the price of ten. Sold
 * only where a yearly Dodo product is configured (apps/web billing config).
 */
export const PLAN_YEARLY_PRICES_USD: Record<PlanTier, number> = {
  free: 0,
  starter: 70,
  pro: 200,
  agency: 790,
};

/** How a paid plan is billed. */
export type BillingInterval = "month" | "year";

/**
 * Websites and monitored pages per website each tier allows. Here, not only
 * in the web plan config, because the worker enforces them too: a workspace
 * that moves to a smaller plan has the websites over its new limit paused
 * and scans only its first pages (plan-sweep.ts, scan-website.ts).
 */
export const PLAN_WEBSITE_LIMITS: Record<PlanTier, number> = {
  free: 1,
  starter: 2,
  pro: 8,
  agency: 30,
};

export const PLAN_PAGE_LIMITS: Record<PlanTier, number> = {
  free: 5,
  starter: 10,
  pro: 15,
  agency: 25,
};

/**
 * The website limit a workspace's entitlement gives: unlimited for the
 * platform admin, the trial cap during a trial, otherwise the tier's.
 */
export function websiteLimitFor(ent: { planId: string; unlimited?: boolean; billedBy?: string | null }): number {
  if (ent.unlimited) return Infinity;
  const tierLimit = PLAN_WEBSITE_LIMITS[toPlanTier(ent.planId)];
  return ent.billedBy === "trial" ? Math.min(tierLimit, TRIAL_MAX_WEBSITES) : tierLimit;
}

/** Monitored pages per website a workspace's entitlement allows. */
export function pageLimitFor(ent: { planId: string; unlimited?: boolean } | null): number {
  if (!ent) return PLAN_PAGE_LIMITS.free;
  return ent.unlimited ? Infinity : PLAN_PAGE_LIMITS[toPlanTier(ent.planId)];
}

export const PLAN_NAMES: Record<PlanTier, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

/** Narrow an untrusted plan string (a DB column) to a tier, defaulting to Free. */
export function toPlanTier(value: string | null | undefined): PlanTier {
  return value === "starter" || value === "pro" || value === "agency" ? value : "free";
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
