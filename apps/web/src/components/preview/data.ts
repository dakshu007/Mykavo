/**
 * Sample data for the Phase 0 dashboard preview. Clearly presented in the UI
 * as a product preview - realistic shapes, no fabricated customer identities.
 */

import type { Severity, Health } from "@/components/ui/badge";

export interface PreviewWebsite {
  name: string;
  domain: string;
  health: Health;
  pages: number;
  openChanges: number;
  highestSeverity: Severity | null;
  lastScan: string;
  nextScan: string;
}

export const websites: PreviewWebsite[] = [
  { name: "Aurora Outdoor", domain: "aurora-outdoor.com", health: "critical", pages: 42, openChanges: 6, highestSeverity: "CRITICAL", lastScan: "24 min ago", nextScan: "Tomorrow, 6:00 am" },
  { name: "Meridian Legal", domain: "meridianlegal.co", health: "attention", pages: 18, openChanges: 3, highestSeverity: "HIGH", lastScan: "1 h ago", nextScan: "Tomorrow, 6:10 am" },
  { name: "Bloom & Root", domain: "bloomandroot.shop", health: "healthy", pages: 35, openChanges: 0, highestSeverity: null, lastScan: "2 h ago", nextScan: "Tomorrow, 6:20 am" },
  { name: "Northwind Dental", domain: "northwinddental.com", health: "healthy", pages: 12, openChanges: 1, highestSeverity: "INFO", lastScan: "2 h ago", nextScan: "Tomorrow, 6:30 am" },
  { name: "Copperline Coffee", domain: "copperline.coffee", health: "healthy", pages: 9, openChanges: 0, highestSeverity: null, lastScan: "3 h ago", nextScan: "Tomorrow, 6:40 am" },
  { name: "Vector Labs", domain: "vectorlabs.io", health: "paused", pages: 27, openChanges: 0, highestSeverity: null, lastScan: "12 days ago", nextScan: "Paused" },
];

export interface PreviewChange {
  severity: Severity;
  category: "AVAILABILITY" | "VISUAL" | "SEO" | "CONTENT" | "LINKS" | "SCRIPT" | "PERFORMANCE" | "CONVERSION";
  website: string;
  page: string;
  title: string;
  detected: string;
  status: "NEW" | "REVIEWED" | "APPROVED" | "RESOLVED";
}

export const changes: PreviewChange[] = [
  { severity: "CRITICAL", category: "CONVERSION", website: "aurora-outdoor.com", page: "/pricing", title: "“Start Free Trial” button is missing", detected: "24 min ago", status: "NEW" },
  { severity: "CRITICAL", category: "SEO", website: "aurora-outdoor.com", page: "/collections/tents", title: "Page changed from index to noindex", detected: "24 min ago", status: "NEW" },
  { severity: "CRITICAL", category: "AVAILABILITY", website: "aurora-outdoor.com", page: "/checkout", title: "HTTP status changed 200 → 500", detected: "24 min ago", status: "NEW" },
  { severity: "HIGH", category: "SCRIPT", website: "meridianlegal.co", page: "/", title: "Google Analytics script disappeared", detected: "1 h ago", status: "NEW" },
  { severity: "HIGH", category: "LINKS", website: "meridianlegal.co", page: "/resources", title: "17 internal links became broken", detected: "1 h ago", status: "REVIEWED" },
  { severity: "MEDIUM", category: "SEO", website: "aurora-outdoor.com", page: "/about", title: "Title tag changed", detected: "24 min ago", status: "NEW" },
  { severity: "MEDIUM", category: "VISUAL", website: "meridianlegal.co", page: "/team", title: "Visual difference of 8.4% detected", detected: "1 h ago", status: "REVIEWED" },
  { severity: "LOW", category: "PERFORMANCE", website: "aurora-outdoor.com", page: "/", title: "Page weight increased 12%", detected: "24 min ago", status: "NEW" },
  { severity: "INFO", category: "CONTENT", website: "northwinddental.com", page: "/blog", title: "Small content change detected", detected: "2 h ago", status: "APPROVED" },
];

export const upcomingScans = [
  { day: "Tue, 7 Jul", time: "06:00 am", website: "aurora-outdoor.com", detail: "Daily scan · 42 pages" },
  { day: "Tue, 7 Jul", time: "06:10 am", website: "meridianlegal.co", detail: "Daily scan · 18 pages" },
  { day: "Tue, 7 Jul", time: "06:20 am", website: "bloomandroot.shop", detail: "Daily scan · 35 pages" },
  { day: "Wed, 8 Jul", time: "06:30 am", website: "northwinddental.com", detail: "Weekly scan · 12 pages" },
];

export const categoryBreakdown = [
  { label: "SEO", pct: 34, trend: "up" as const },
  { label: "Visual", pct: 22, trend: "up" as const },
  { label: "Links", pct: 18, trend: "down" as const },
  { label: "Scripts", pct: 14, trend: "up" as const },
  { label: "Performance", pct: 12, trend: "down" as const },
];

export const changeDetail = {
  title: "“Start Free Trial” button is missing",
  severity: "CRITICAL" as Severity,
  category: "CONVERSION",
  website: "aurora-outdoor.com",
  page: "/pricing",
  detected: "Today, 09:24 am",
  scan: "Scheduled scan #482",
  element: "a.btn-primary[href='/signup']",
  previous: { existence: "Present", visibility: "Visible", text: "Start Free Trial", href: "/signup" },
  current: { existence: "Missing", visibility: "-", text: "-", href: "-" },
};
