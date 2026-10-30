/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere - server-side enforcement (limits.ts)
 * and all UI read from this module.
 *
 * MyKavo ships four plans: Free, Starter at $7/month, Pro at $20/month and
 * Agency at $79/month. Starter is every monitoring feature on 2 websites with
 * 10 pages each, for one person; Pro is 8 websites with 15 monitored pages
 * each and a small team; Agency is 30 with 25 each, plus white-label client
 * reports and a larger team. Prices live in
 * @mykavo/shared (PLAN_PRICES_USD) because the worker quotes them in emails.
 * "Unlimited" numeric limits use Infinity so `count >= limit` is never true.
 * (The former $6/mo website add-on was removed 2026-07-17 - the WebsiteAddon
 * table remains for historical rows but nothing reads or grants it anymore.)
 *
 * Pro subscriptions that started before Agency launched are grandfathered:
 * resolvePlan() gives them back white-label reports and 5 seats, which Pro
 * included when they bought it.
 */

import {
  PLAN_HISTORY_DAYS,
  PLAN_PAGE_LIMITS,
  PLAN_PRICES_USD,
  PLAN_WEBSITE_LIMITS,
  TRIAL_DAYS,
  TRIAL_MAX_WEBSITES,
  type PlanTier,
} from "@mykavo/shared";

export type PlanId = PlanTier;

export type ScanFrequency = "WEEKLY" | "DAILY";

export interface Plan {
  id: PlanId;
  name: string;
  /** Set while this plan comes from a free trial, not a payment. */
  trial?: { endsAt: Date } | null;
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
    /**
     * Baseline scans per rolling 24 hours, counted per workspace and kept even
     * when the website is deleted - so deleting and re-adding a site cannot
     * be used as a free re-scan button.
     */
    baselineScansPer24h: number;
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
    /**
     * AI change explanations per workspace per calendar month (lib/ai). Each
     * is generated once and kept, so re-opening one never counts again.
     */
    aiExplanationsPerMonth: number;
    /**
     * AI assistant connectors: ChatGPT, Claude and other MCP clients reading
     * this workspace's monitoring data (app/api/mcp). Pro and Agency only.
     */
    aiAssistants: boolean;
    /**
     * MCP tool calls per workspace per UTC day. Each one is a few small
     * database reads, so the cap protects database egress from a runaway
     * assistant loop far more than it limits a person asking questions.
     */
    aiAssistantCallsPerDay: number;
  };
  features: string[];
  highlighted?: boolean;
  /** True for a Pro plan resolved with its pre-Agency inclusions. */
  grandfathered?: boolean;
  /** True for the platform admin's own workspace: Agency, no numeric limits, no charge. */
  unlimited?: boolean;
}

export const plans: Plan[] = [
  {
    id: "free",
    name: "Free",
    priceMonthlyUsd: PLAN_PRICES_USD.free,
    headline: "Start monitoring one important website.",
    limits: {
      websites: PLAN_WEBSITE_LIMITS.free,
      pagesPerWebsite: PLAN_PAGE_LIMITS.free,
      scanFrequency: "WEEKLY",
      historyDays: PLAN_HISTORY_DAYS.free,
      manualScans: false,
      manualScansPerDay: 0,
      baselineScansPer24h: 2,
      conversionElementMonitoring: false,
      maxMembers: 1,
      whiteLabelReports: false,
      deployChecks: false,
      siteAuditPages: 150,
      siteAuditsPerDay: 1,
      aiExplanationsPerMonth: 10,
      aiAssistants: false,
      aiAssistantCallsPerDay: 0,
    },
    features: [
      "1 website",
      "5 monitored pages",
      "Weekly scans",
      "AI Website Insights - 10 explanations a month",
      "30-day history",
      "Email alerts",
      "WordPress plugin",
      "Shareable client reports",
      "Site audits - 150 pages per crawl",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: PLAN_PRICES_USD.starter,
    headline: "Every feature for one person's websites: 2 sites, checked daily.",
    limits: {
      websites: PLAN_WEBSITE_LIMITS.starter,
      pagesPerWebsite: PLAN_PAGE_LIMITS.starter,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.starter,
      manualScans: true,
      manualScansPerDay: 5,
      baselineScansPer24h: 10,
      conversionElementMonitoring: true,
      maxMembers: 1,
      whiteLabelReports: false,
      deployChecks: true,
      siteAuditPages: 500,
      siteAuditsPerDay: 3,
      aiExplanationsPerMonth: 30,
      aiAssistants: false,
      aiAssistantCallsPerDay: 0,
    },
    features: [
      "2 websites",
      "10 monitored pages per website",
      "Daily scans",
      "AI Website Insights - 30 explanations a month",
      "Manual scans - 5 a day",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "90-day history",
      "Site audits - 500 pages per crawl",
      "Email alerts",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: PLAN_PRICES_USD.pro,
    headline: "For freelancers and small teams: 8 websites, checked daily.",
    highlighted: true,
    limits: {
      websites: PLAN_WEBSITE_LIMITS.pro,
      pagesPerWebsite: PLAN_PAGE_LIMITS.pro,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.pro,
      manualScans: true,
      manualScansPerDay: 20,
      baselineScansPer24h: 30,
      conversionElementMonitoring: true,
      maxMembers: 3,
      whiteLabelReports: false,
      deployChecks: true,
      siteAuditPages: 1500,
      siteAuditsPerDay: 10,
      aiExplanationsPerMonth: 100,
      aiAssistants: true,
      aiAssistantCallsPerDay: 300,
    },
    features: [
      "8 websites",
      "15 monitored pages per website",
      "Daily scans",
      "AI Website Insights - 100 explanations a month",
      "Manual scans - 20 a day",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "1-year history",
      "Site audits - 1,500 pages per crawl",
      "Up to 3 team members",
      "Ask ChatGPT and Claude about your sites",
      "Email alerts",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: PLAN_PRICES_USD.agency,
    headline: "For agencies: 30 client websites, reports under your own brand.",
    limits: {
      websites: PLAN_WEBSITE_LIMITS.agency,
      pagesPerWebsite: PLAN_PAGE_LIMITS.agency,
      scanFrequency: "DAILY",
      historyDays: PLAN_HISTORY_DAYS.agency,
      manualScans: true,
      manualScansPerDay: 100,
      baselineScansPer24h: 100,
      conversionElementMonitoring: true,
      maxMembers: 15,
      whiteLabelReports: true,
      deployChecks: true,
      // The crawler stops at 10 minutes, which lands near 2,000 pages - the
      // worker caps audits there too. Never advertise more than it can crawl.
      siteAuditPages: 2000,
      siteAuditsPerDay: 25,
      aiExplanationsPerMonth: 500,
      aiAssistants: true,
      aiAssistantCallsPerDay: 1000,
    },
    features: [
      "30 websites",
      "25 monitored pages per website",
      "Daily scans",
      "AI Website Insights - 500 explanations a month",
      "Manual scans - 100 a day",
      "White-label client reports",
      "Automatic client report emails",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "1-year history",
      "Site audits - 2,000 pages per crawl",
      "Up to 15 team members",
      "Ask ChatGPT and Claude about your sites",
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
export function resolvePlan(
  id: PlanId,
  grandfathered = false,
  unlimited = false,
  trialEndsAt: Date | null = null,
): Plan {
  if (unlimited) return unlimitedAgencyPlan();
  if (trialEndsAt) return trialPlan(id, trialEndsAt);
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

/**
 * A free trial: the plan's features with a smaller website cap, so a trial
 * shows what paying gets without the footprint of a full paid account.
 *
 * The cap is the ONE difference from the paid plan, so everything that
 * describes the plan must say it: the feature list swaps "8 websites" for
 * the trial's own number, and the headline names it. Copying the paid
 * plan's list unchanged told trial users they had 8 websites when they
 * could add 3.
 */
export function trialPlan(id: PlanId, endsAt: Date): Plan {
  const plan = getPlan(id);
  const websites = Math.min(plan.limits.websites, TRIAL_MAX_WEBSITES);
  const paidLine = `${formatLimit(plan.limits.websites)} websites`;
  const trialLine = `${websites} website${websites === 1 ? "" : "s"} during the trial (${plan.name} has ${formatLimit(plan.limits.websites)})`;
  return {
    ...plan,
    name: `${plan.name} trial`,
    headline: `Free for ${TRIAL_DAYS} days: every ${plan.name} feature on up to ${websites} website${websites === 1 ? "" : "s"}.`,
    trial: { endsAt },
    limits: { ...plan.limits, websites },
    features: plan.features.map((f) => (f === paidLine ? trialLine : f)),
  };
}

/** "Free plan", "Pro plan", or "Pro trial": a trial's name already says what it is. */
export function planLabel(plan: Plan): string {
  return plan.trial ? plan.name : `${plan.name} plan`;
}

/**
 * The platform admin's own workspace (owner on ADMIN_EMAILS): everything in
 * Agency with the numeric limits lifted. Scans stay daily and site audits keep
 * Agency's crawl size - those are what the worker can actually do per run.
 */
export function unlimitedAgencyPlan(): Plan {
  const agency = getPlan("agency");
  return {
    ...agency,
    name: "Agency (Unlimited)",
    headline: "Admin workspace: every Agency feature, no limits.",
    unlimited: true,
    limits: {
      ...agency.limits,
      websites: Infinity,
      pagesPerWebsite: Infinity,
      manualScansPerDay: Infinity,
      baselineScansPer24h: Infinity,
      maxMembers: Infinity,
      siteAuditsPerDay: Infinity,
      aiExplanationsPerMonth: Infinity,
      aiAssistantCallsPerDay: Infinity,
    },
    features: [
      "Unlimited websites",
      "Unlimited monitored pages",
      "Daily scans",
      "AI Website Insights - unlimited explanations",
      "Unlimited manual scans",
      "White-label client reports",
      "Automatic client report emails",
      "Post-deploy checks",
      "WordPress Safe Updates - a check after every update",
      "Conversion element monitoring",
      "1-year history",
      `Site audits - ${agency.limits.siteAuditPages.toLocaleString("en-US")} pages per crawl, unlimited a day`,
      "Unlimited team members",
      "Ask ChatGPT and Claude about your sites",
      "Email alerts",
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
