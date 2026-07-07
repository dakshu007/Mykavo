/**
 * Single source of truth for pricing and plan limits (spec §37).
 * Never hardcode plan limits elsewhere — server-side enforcement (Phase 8+)
 * and all UI read from this module.
 */

export type PlanId = "free" | "starter" | "pro" | "agency";

export type ScanFrequency = "WEEKLY" | "DAILY";

export interface Plan {
  id: PlanId;
  name: string;
  priceMonthlyUsd: number;
  headline: string;
  limits: {
    websites: number;
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
    id: "starter",
    name: "Starter",
    priceMonthlyUsd: 12,
    headline: "Daily monitoring for your key sites.",
    limits: {
      websites: 5,
      monitoredPages: 50,
      scanFrequency: "DAILY",
      historyDays: 90,
      manualScans: true,
      conversionElementMonitoring: false,
      multiUserWorkspace: false,
      advancedMonitoringSettings: false,
      priorityScanning: false,
      clientReports: false,
    },
    features: [
      "5 websites",
      "50 monitored pages",
      "Daily scans",
      "90-day history",
      "Email alerts",
      "Manual scans",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    priceMonthlyUsd: 29,
    headline: "Serious monitoring for professionals.",
    highlighted: true,
    limits: {
      websites: 25,
      monitoredPages: 500,
      scanFrequency: "DAILY",
      historyDays: 365,
      manualScans: true,
      conversionElementMonitoring: true,
      multiUserWorkspace: false,
      advancedMonitoringSettings: true,
      priorityScanning: true,
      clientReports: false,
    },
    features: [
      "25 websites",
      "500 monitored pages",
      "Daily scans",
      "1-year history",
      "Advanced monitoring settings",
      "Conversion element monitoring",
      "Priority scanning",
    ],
  },
  {
    id: "agency",
    name: "Agency",
    priceMonthlyUsd: 79,
    headline: "Every client website in one dashboard.",
    limits: {
      websites: 100,
      monitoredPages: 2500,
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
      "100 websites",
      "2,500 monitored pages",
      "Daily scans",
      "Multi-user workspace",
      "Client-ready reports",
      "Priority support",
    ],
  },
];

export function getPlan(id: PlanId): Plan {
  const plan = plans.find((p) => p.id === id);
  if (!plan) throw new Error(`Unknown plan: ${id}`);
  return plan;
}
