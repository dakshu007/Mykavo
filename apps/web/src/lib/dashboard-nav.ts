/**
 * The dashboard's navigation, in one place.
 *
 * WHY THIS IS GROUPED, AND WHY PART OF IT IS GATED
 * ------------------------------------------------
 * This used to be a flat list of ten entries, duplicated between the sidebar
 * and the mobile pill row: Overview, Websites, Changes, Scan History, Site
 * Audit, Search Console, MyKavo Analyser, Notifications, Billing, Settings.
 *
 * Ten items at equal weight, on every screen, reads as ten products rather
 * than one. MyKavo does one job - approve a known-good baseline, then hear
 * about it when something important changes - and the audit, Search Console
 * and analyser tools are DEPTH on that job, not peers of it.
 *
 * So: three groups, and the analysis group appears only once monitoring is
 * actually live. Before a baseline exists those three pages have nothing to
 * show - each renders its own "add a website first" empty state - so on day
 * one they are not merely noisy, they are dead ends. Nothing is removed: the
 * routes stay reachable, and the group appears for good the moment the first
 * baseline lands.
 *
 * Pure data, no React, so the shape is unit-testable and the two navigation
 * components cannot drift apart again.
 */

export type NavGroupId = "monitoring" | "analysis" | "account" | "admin";

/** Stable ids, so the sidebar's icon map is checked at compile time. */
export type NavItemId =
  | "overview"
  | "websites"
  | "changes"
  | "scans"
  | "site-audit"
  | "search-console"
  | "analyser"
  | "notifications"
  | "billing"
  | "settings"
  | "blog"
  | "users"
  | "usage"
  | "app-requests"
  | "app";

export interface NavItem {
  id: NavItemId;
  href: string;
  label: string;
  /** Shorter label for the horizontal mobile row, where width is scarce. */
  short?: string;
  /** Match the pathname exactly - only /dashboard needs this. */
  exact?: boolean;
}

export interface NavGroup {
  id: NavGroupId;
  /** Heading above the group, or null to render the group unlabelled. */
  label: string | null;
  items: NavItem[];
}

export interface NavAccess {
  /**
   * Has this account been approved for the Android app? Adds a download entry
   * to the account group. Absent for everyone else - including people whose
   * request is pending or was declined, which are deliberately
   * indistinguishable (see packages/shared/src/app-access.ts).
   */
  appApproved?: boolean;
  /**
   * Has the first-run loop completed for this workspace - at least one
   * finished scan or active baseline? Same signal the getting-started card
   * uses, so the sidebar and the checklist always agree about what "set up"
   * means.
   */
  monitoringLive: boolean;
  isBlogAdmin: boolean;
  isPlatformAdmin: boolean;
}

/** The core loop's screens. Always present - this is the product. */
const MONITORING: NavItem[] = [
  { id: "overview", href: "/dashboard", label: "Overview", exact: true },
  { id: "websites", href: "/dashboard/websites", label: "Websites" },
  { id: "changes", href: "/dashboard/changes", label: "Changes" },
  { id: "scans", href: "/dashboard/scans", label: "Scan History", short: "Scans" },
];

/** Depth on a product you already understand. Gated on monitoringLive. */
const ANALYSIS: NavItem[] = [
  { id: "site-audit", href: "/dashboard/site-audit", label: "Site Audit", short: "Audit" },
  {
    id: "search-console",
    href: "/dashboard/search-console",
    label: "Search Console",
    short: "GSC",
  },
  { id: "analyser", href: "/dashboard/analyser", label: "MyKavo Analyser", short: "Analyser" },
];

const ACCOUNT: NavItem[] = [
  { id: "notifications", href: "/dashboard/notifications", label: "Notifications" },
  { id: "billing", href: "/dashboard/billing", label: "Billing" },
  { id: "settings", href: "/dashboard/settings", label: "Settings" },
];

/** Shown only to an account approved for the Android app. */
const APP_DOWNLOAD: NavItem = {
  id: "app",
  href: "/dashboard/app",
  label: "Android app",
  short: "App",
};

export function dashboardNav(access: NavAccess): NavGroup[] {
  const groups: NavGroup[] = [
    // Unlabelled: a heading over the first group is noise, since everything
    // above it is the logo and the workspace switcher.
    { id: "monitoring", label: null, items: MONITORING },
  ];

  if (access.monitoringLive) {
    groups.push({ id: "analysis", label: "Deeper analysis", items: ANALYSIS });
  }

  groups.push({
    id: "account",
    label: "Account",
    // The download sits at the top of the account group rather than with the
    // monitoring screens: it is a thing you own, not a thing you check.
    items: access.appApproved ? [APP_DOWNLOAD, ...ACCOUNT] : ACCOUNT,
  });

  // Operator entries. Two separate flags because publishing a post and
  // reading the infrastructure bill are different privileges. Every one of
  // these pages re-checks its own allowlist server-side; hiding them here is
  // tidiness, not the boundary.
  const admin: NavItem[] = [];
  if (access.isBlogAdmin) {
    admin.push({ id: "blog", href: "/dashboard/blog", label: "Blog" });
  }
  if (access.isPlatformAdmin) {
    admin.push(
      { id: "users", href: "/dashboard/users", label: "Users" },
      {
        id: "app-requests",
        href: "/dashboard/app-requests",
        label: "App requests",
        short: "Requests",
      },
      { id: "usage", href: "/dashboard/usage", label: "All Usage" },
    );
  }
  if (admin.length > 0) {
    groups.push({ id: "admin", label: "Admin", items: admin });
  }

  return groups;
}

/** Every item across every group, in render order. */
export function flattenNav(groups: NavGroup[]): NavItem[] {
  return groups.flatMap((g) => g.items);
}

/**
 * Is this item the active one for the given pathname?
 *
 * Prefix matching for everything but /dashboard, which would otherwise match
 * every page in the dashboard.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  return item.exact ? pathname === item.href : pathname.startsWith(item.href);
}
