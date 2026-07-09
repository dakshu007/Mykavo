/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere — server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * Fluxen ships two plans: Free, and Pro at $12/month. Pro includes 50 websites
 * and unlimited monitored pages; buyers can add capacity in $6/month blocks of
 * 30 websites (see WEBSITE_ADDON). "Unlimited" numeric limits use Infinity so
 * `count >= limit` is never true.
 */

export type PlanId = "free" | "pro";

/**
 * Self-serve website-capacity add-on. Each purchased unit is its own recurring
 * charge and grants `websitesPerUnit` extra websites on top of the Pro base.
 * A workspace's effective website limit = Pro base + (active units × 30).
 */
export const WEBSITE_ADDON = {
  websitesPerUnit: 30,
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
    /** Infinity means unlimited. */
    monitoredPages: number;
    scanFrequency: ScanFrequency;
    historyDays: number;
    manualScans: boolean;
    conversionElementMonitoring: boolean;
    multiUserWorkspace: boolean;
    advancedMonitoringSettings: boolean;
    priorityScanning: boolean;
    clientReports: boolean;
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
      monitoredPages: 5,
      scanFrequency: "WEEKLY",
      historyDays: 30,
      manualScans: false,
      conversionElementMonitoring: false,
      multiUserWorkspace: false,
      advancedMonitoringSettings: false,
      priorityScanning: false,
      clientReports: false,
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
    headline: "50 websites and unlimited pages — add more anytime.",
    highlighted: true,
    limits: {
      // Base capacity. Effective limit = 50 + (active add-on units × 30),
      // computed server-side in lib/limits.ts — never read this number alone
      // for enforcement.
      websites: 50,
      monitoredPages: Infinity,
      scanFrequency: "DAILY",
      historyDays: 365,
      manualScans: true,
      conversionElementMonitoring: true,
      multiUserWorkspace: true,
      advancedMonitoringSettings: true,
      priorityScanning: true,
      clientReports: true,
    },
    features: [
      "50 websites included",
      `Add ${WEBSITE_ADDON.websitesPerUnit} more anytime for $${WEBSITE_ADDON.priceMonthlyUsd}/mo`,
      "Unlimited monitored pages",
      "Daily scans",
      "1-year history",
      "Manual scans",
      "Advanced monitoring settings",
      "Conversion element monitoring",
      "Priority scanning",
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
