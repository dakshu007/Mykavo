import { CHANNELS, type Channel } from "@/lib/activity/core";
import type { TrackingRow } from "@/lib/admin/tracking-core";

/**
 * The Tracking page's filters, shared by the web page and the Android app's
 * Tracking screen so both answer "who is stuck" the same way. Pure.
 */

export type TrackingShow = "all" | "active" | "inactive" | "stuck" | Channel;

export const TRACKING_SHOWS: Array<{ id: TrackingShow; label: string }> = [
  { id: "all", label: "Everyone" },
  { id: "active", label: "Active 7 days" },
  { id: "inactive", label: "Gone quiet" },
  { id: "stuck", label: "Stuck somewhere" },
  { id: "android", label: "Android app" },
  { id: "wordpress", label: "WordPress" },
  { id: "shopify", label: "Shopify" },
  { id: "chrome", label: "Chrome" },
  { id: "mcp", label: "AI assistant" },
];

export function parseTrackingShow(value: string | null | undefined): TrackingShow {
  return TRACKING_SHOWS.find((s) => s.id === value)?.id ?? "all";
}

export function matchesShow(row: TrackingRow, show: TrackingShow, now: number): boolean {
  const recent = (at: string | null, days: number) => !!at && now - new Date(at).getTime() <= days * 86_400_000;
  switch (show) {
    case "all":
      return true;
    case "active":
      return recent(row.lastActiveAt, 7);
    case "inactive":
      return !recent(row.lastActiveAt, 14);
    case "stuck":
      return CHANNELS.some((ch) => ["pending", "started"].includes(row.channels[ch].status));
    default:
      return row.channels[show].status !== "none";
  }
}

/** The filtered rows, most recently active first. */
export function visibleRows(rows: TrackingRow[], show: TrackingShow, now: number = Date.now()): TrackingRow[] {
  return rows
    .filter((r) => matchesShow(r, show, now))
    .sort((a, b) => (b.lastActiveAt ?? b.signedUpAt).localeCompare(a.lastActiveAt ?? a.signedUpAt));
}
