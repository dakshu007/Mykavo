/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere - server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * MyKavo ships three plans: Free, Pro at $20/month and Agency at $49/month.
 * Pro is 8 websites with 15 monitored pages each; Agency is 30 with 25 each,
 * plus white-label client reports and a larger team. Prices live in
 * @mykavo/shared (PLAN_PRICES_USD) because the worker quotes them in emails.
 * "Unlimited" numeric limits use Infinity so `count >= limit` is never true.
 * (The former $6/mo website add-on was removed 2026-07-17 - the WebsiteAddon
 * table remains for historical rows but nothing reads or grants it anymore.)
 *
 * Pro subscriptions that started before Agency launched are grandfathered:
 * resolvePlan() gives them back white-label reports and 5 seats, which Pro
 * included when they bought it.
 */

import { PLAN_HISTORY_DAYS, PLAN_PRICES_USD, type PlanTier } from "@mykavo/shared";

export type PlanId = PlanTier;

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
    /**
     * White-label client reports: agency branding (name, logo, accent color)
     * replaces MyKavo branding on the public /r/[token] report. The report
     * link itself is available on every plan - Free reports carry MyKavo
     * branding, which is the growth loop.
     */
    whiteLabelReports: boolean;
    /**
     * Post-deploy verification hook: a secret URL CI hits after a release;
     * MyKavo scans immediately and sends a verdict. Effectively on-demand
     * scanning, so it follows manual scans: Pro only, shared daily quota.
     */
    deployChecks: boolean;
    /** Max pages crawled per technical SEO site audit. */
    siteAuditPages: number;
    /** Site audits per workspace per UTC day. */
    siteAuditsPerDay: number;
  };
  features: string[];
  highlighted?: boolean;
  /** True for a Pro plan resolved with its pre-Agency inclusions. */
  grandfathered?: boolean;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyUsd: PLAN_PRICES_USD.free,
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
      whiteLabelReports: false,
      deployChecks: false,
      siteAuditPages: 150,
      siteAuditsPerDay: 1,
    },
    features: [
      "1 website",
      "5 monitored pages",
      "Weekly scans",
      "30-day history",
      "Email alerts",
      "WordPress plugin",
      "Shareable client reports",
      "Site audits - 150 pages per crawl",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: PLAN_PRICES_USD.pro,
    headline: "For freelancers and small teams: 8 websites, checked daily.",
    highlighted: true,
    limits: {
      websites: 8,
      pagesPerWebsite: 15,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.pro,
      manualScans: true,
      manualScansPerDay: 20,
      conversionElementMonitoring: true,
      maxMembers: 3,
      whiteLabelReports: false,
      deployChecks: true,
      siteAuditPages: 1500,
      siteAuditsPerDay: 10,
    },
    features: [
      "8 websites",
      "15 monitored pages per website",
      "Daily scans",
      "Manual scans - 20 a day",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "1-year history",
      "Site audits - 1,500 pages per crawl",
      "Up to 3 team members",
      "Email alerts",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: PLAN_PRICES_USD.agency,
    headline: "For agencies: 30 client websites, reports under your own brand.",
    limits: {
      websites: 30,
      pagesPerWebsite: 25,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.agency,
      manualScans: true,
      manualScansPerDay: 100,
      conversionElementMonitoring: true,
      maxMembers: 15,
      whiteLabelReports: true,
      deployChecks: true,
      // The crawler stops at 10 minutes, which lands near 2,000 pages - the
      // worker caps audits there too. Never advertise more than it can crawl.
      siteAuditPages: 2000,
      siteAuditsPerDay: 25,
    },
    features: [
      "30 websites",
      "25 monitored pages per website",
      "Daily scans",
      "Manual scans - 100 a day",
      "White-label client reports",
      "Automatic client report emails",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "1-year history",
      "Site audits - 2,000 pages per crawl",
      "Up to 15 team members",
      "Email alerts",
    ],
  },
];

export const FREE_PLAN_ID: PlanId = "free";
/** The plan a Free workspace is nudged towards first. */
export const PAID_PLAN_ID: PlanId = "pro";
export const AGENCY_PLAN_ID: PlanId = "agency";

export function getPlan(id: PlanId): Plan {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}

/**
 * A workspace's effective plan. Grandfathered Pro keeps what Pro included
 * before Agency existed: white-label client reports (and their automatic
 * emails) and 5 seats. Only Pro can be grandfathered.
 */
export function resolvePlan(id: PlanId, grandfathered = false): Plan {
  const plan = getPlan(id);
  if (id !== "pro" || !grandfathered) return plan;
  return {
    ...plan,
    grandfathered: true,
    limits: { ...plan.limits, whiteLabelReports: true, maxMembers: 5 },
    features: [
      ...plan.features.map((f) => (f === "Up to 3 team members" ? "Up to 5 team members" : f)),
      "White-label client reports",
      "Automatic client report emails",
    ],
  };
}

/** The next plan up, or null at the top. */
export function nextPlanUp(id: PlanId): Plan | null {
  const index = plans.findIndex((p) => p.id === id);
  return index >= 0 ? (plans[index + 1] ?? null) : null;
}

/** Human display for a possibly-infinite limit. */
export function formatLimit(value: number): string {
  return value === Infinity ? "Unlimited" : value.toLocaleString("en-US");
}
