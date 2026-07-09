/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere — server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * Fluxen ships two plans: Free, and Pro at $12/month. Pro includes 8 websites
 * with 20 monitored pages each; buyers can extend capacity with $6/month
 * add-ons of one website each, up to 3 (see WEBSITE_ADDON). "Unlimited"
 * numeric limits use Infinity so `count >= limit` is never true.
 */

import { PLAN_HISTORY_DAYS } from "@fluxen/shared";

export type PlanId = "free" | "pro";

/**
 * Self-serve website-capacity add-on. Each purchased unit is its own recurring
 * charge and grants `websitesPerUnit` extra websites on top of the Pro base,
 * capped at `maxUnits` active units per workspace. A workspace's effective
 * website limit = Pro base + min(active units, maxUnits) × websitesPerUnit.
 */
export const WEBSITE_ADDON = {
  websitesPerUnit: 1,
  maxUnits: 3,
  priceMonthlyUsd: 6,
} as const;

export type ScanFrequency = "WEEKLY" | "DAILY";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  headline: string;
  limits: {
    /** Infinity means unlimited. */
    websites: number;
    /** Monitored pages allowed per website. Infinity means unlimited. */
    pagesPerWebsite: number;
    scanFrequency: ScanFrequency;
    historyDays: number;
    manualScans: boolean;
    /** Max user-triggered scans per UTC day (0 when manualScans is false). */
    manualScansPerDay: number;
    conversionElementMonitoring: boolean;
  };
  features: string[];
  highlighted?: boolean;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyUsd: 0,
    headline: "Start monitoring one important website.",
    limits: {
      websites: 1,
      pagesPerWebsite: 5,
      scanFrequency: "WEEKLY",
      historyDays: PLAN_HISTORY_DAYS.free,
      manualScans: false,
      manualScansPerDay: 0,
      conversionElementMonitoring: false,
    },
    features: [
      "1 website",
      "5 monitored pages",
      "Weekly scans",
      "30-day history",
      "Email alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 12,
    headline: "8 websites, 20 pages each — add more anytime.",
    highlighted: true,
    limits: {
      // Base capacity. Effective limit = 8 + capped add-on units, computed
      // server-side in lib/billing/subscription.ts — never read this number
      // alone for enforcement.
      websites: 8,
      pagesPerWebsite: 20,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.pro,
      manualScans: true,
      manualScansPerDay: 20,
      conversionElementMonitoring: true,
    },
    features: [
      "8 websites included",
      `Add ${WEBSITE_ADDON.websitesPerUnit} more anytime for $${WEBSITE_ADDON.priceMonthlyUsd}/mo (up to ${WEBSITE_ADDON.maxUnits})`,
      "20 monitored pages per website",
      "Daily scans",
      "1-year history",
      "Manual scans",
      "Conversion element monitoring",
      "Email alerts",
    ],
  },
];

export const FREE_PLAN_ID: PlanId = "free";
export const PAID_PLAN_ID: PlanId = "pro";

export function getPlan(id: PlanId): Plan {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

/** Human display for a possibly-infinite limit. */
export function formatLimit(value: number): string {
  return value === Infinity ? "Unlimited" : value.toLocaleString("en-US");
}
