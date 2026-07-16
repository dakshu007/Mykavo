/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere - server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * MyKavo ships two plans: Free, and Pro at $20/month. Pro includes 8 websites
 * with 15 monitored pages each. "Unlimited" numeric limits use Infinity so
 * `count >= limit` is never true. (The former $6/mo website add-on was
 * removed 2026-07-17 - the WebsiteAddon table remains for historical rows
 * but nothing reads or grants it anymore.)
 */

import { PLAN_HISTORY_DAYS } from "@mykavo/shared";

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
    /** Monitored pages allowed per website. Infinity means unlimited. */
    pagesPerWebsite: number;
    scanFrequency: ScanFrequency;
    historyDays: number;
    manualScans: boolean;
    /** Max user-triggered scans per UTC day (0 when manualScans is false). */
    manualScansPerDay: number;
    conversionElementMonitoring: boolean;
    /**
     * Workspace seats: active members + pending invites. Teams are a Pro
     * feature - Free is single-seat (the owner).
     */
    maxMembers: number;
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
      maxMembers: 1,
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
    priceMonthlyUsd: 20,
    headline: "8 websites with 15 monitored pages each.",
    highlighted: true,
    limits: {
      websites: 8,
      pagesPerWebsite: 15,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.pro,
      manualScans: true,
      manualScansPerDay: 20,
      conversionElementMonitoring: true,
      maxMembers: 5,
    },
    features: [
      "8 websites",
      "15 monitored pages per website",
      "Daily scans",
      "1-year history",
      "Manual scans",
      "Conversion element monitoring",
      "Up to 5 team members",
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
