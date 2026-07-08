/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere — server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * Fluxen ships two plans: Free, and Pro at $12/month with no limits.
 * "Unlimited" numeric limits use Infinity so `count >= limit` is never true.
 */

export type PlanId = "free" | "pro";

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
    headline: "Unlimited monitoring for everything you manage.",
    highlighted: true,
    limits: {
      websites: Infinity,
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
      "Unlimited websites",
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
