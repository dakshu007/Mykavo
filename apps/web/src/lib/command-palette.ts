import type { ChangeSeverity, ChangeStatus } from "@fluxen/database";

/**
 * Pure logic for the dashboard command palette (⌘K). Static entries, substring
 * filtering, section grouping, and flat-index math live here so keyboard
 * navigation is unit-testable without the DOM.
 */

/** Render order of palette sections. Server results always come last. */
export const SECTION_ORDER = [
  "Actions",
  "Navigation",
  "Websites",
  "Pages",
  "Changes",
] as const;

export type PaletteSection = (typeof SECTION_ORDER)[number];

export interface PaletteEntry {
  /** Stable unique id — also used for aria-activedescendant option ids. */
  id: string;
  section: PaletteSection;
  label: string;
  /** Secondary line — URL for websites/pages, owning website for pages. */
  hint?: string;
  href: string;
  /** Only present on Changes entries — rendered as a severity chip. */
  severity?: ChangeSeverity;
  status?: ChangeStatus;
}

export interface PaletteGroup {
  section: PaletteSection;
  entries: PaletteEntry[];
}

/**
 * Client-side entries available without any network round-trip. Navigation
 * mirrors the sidebar (Blog only for allowlisted admins — same flag the
 * layout already computes; pages/APIs enforce it server-side).
 */
export function staticEntries(isBlogAdmin: boolean): PaletteEntry[] {
  const actions: PaletteEntry[] = [
    {
      id: "action-add-website",
      section: "Actions",
      label: "Add website",
      href: "/dashboard/websites/new",
    },
    {
      id: "action-invite-teammate",
      section: "Actions",
      label: "Invite teammate",
      href: "/dashboard/settings",
    },
  ];
  if (isBlogAdmin) {
    actions.push({
      id: "action-write-blog-post",
      section: "Actions",
      label: "Write blog post",
      href: "/dashboard/blog/new",
    });
  }

  const navigation: PaletteEntry[] = [
    { id: "nav-overview", section: "Navigation", label: "Overview", href: "/dashboard" },
    { id: "nav-websites", section: "Navigation", label: "Websites", href: "/dashboard/websites" },
    { id: "nav-changes", section: "Navigation", label: "Changes", href: "/dashboard/changes" },
    { id: "nav-scans", section: "Navigation", label: "Scan History", href: "/dashboard/scans" },
    {
      id: "nav-notifications",
      section: "Navigation",
      label: "Notifications",
      href: "/dashboard/notifications",
    },
    { id: "nav-billing", section: "Navigation", label: "Billing", href: "/dashboard/billing" },
    { id: "nav-settings", section: "Navigation", label: "Settings", href: "/dashboard/settings" },
  ];
  if (isBlogAdmin) {
    navigation.push({
      id: "nav-blog",
      section: "Navigation",
      label: "Blog",
      href: "/dashboard/blog",
    });
  }

  return [...actions, ...navigation];
}

/** Case-insensitive substring match on label and hint. Empty query matches all. */
export function matchesQuery(entry: PaletteEntry, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  if (entry.label.toLowerCase().includes(q)) return true;
  return entry.hint !== undefined && entry.hint.toLowerCase().includes(q);
}

export function filterEntries(entries: PaletteEntry[], query: string): PaletteEntry[] {
  return entries.filter((entry) => matchesQuery(entry, query));
}

/** Groups entries by section in SECTION_ORDER, dropping empty sections. */
export function groupEntries(entries: PaletteEntry[]): PaletteGroup[] {
  return SECTION_ORDER.map((section) => ({
    section,
    entries: entries.filter((entry) => entry.section === section),
  })).filter((group) => group.entries.length > 0);
}

/** Flat list backing keyboard navigation — index order matches render order. */
export function flattenGroups(groups: PaletteGroup[]): PaletteEntry[] {
  return groups.flatMap((group) => group.entries);
}

/**
 * ArrowUp/ArrowDown movement across the flattened list with wrap-around.
 * Returns 0 for empty lists so state never goes negative.
 */
export function moveIndex(current: number, delta: 1 | -1, length: number): number {
  if (length <= 0) return 0;
  // Clamp a stale index (list shrank between renders) before stepping.
  const safe = Math.min(Math.max(current, 0), length - 1);
  return (safe + delta + length) % length;
}
