import { describe, expect, it } from "vitest";
import { CHANNELS, type Channel } from "@/lib/activity/core";
import type { ChannelState, TrackingRow } from "@/lib/admin/tracking-core";
import { matchesShow, parseTrackingShow, visibleRows } from "./tracking-filter";

const NOW = new Date("2026-10-11T12:00:00Z").getTime();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const none: ChannelState = { status: "none", label: "", detail: null, lastAt: null };

function row(over: Partial<TrackingRow> & { channel?: Partial<Record<Channel, ChannelState["status"]>> }): TrackingRow {
  const channels = Object.fromEntries(
    CHANNELS.map((ch) => [ch, { ...none, status: over.channel?.[ch] ?? "none" }]),
  ) as Record<Channel, ChannelState>;
  return {
    id: "u", name: "U", email: "u@example.com", internal: false, signedUpAt: daysAgo(60), plan: "free", paid: false,
    websites: 0, monitoring: false, lastActiveAt: null, lastChannel: null, activeDays30: 0, spark: [], channels,
    ...over,
  };
}

describe("tracking filters", () => {
  it("reads unknown filters as everyone", () => {
    expect(parseTrackingShow("wordpress")).toBe("wordpress");
    expect(parseTrackingShow("nope")).toBe("all");
    expect(parseTrackingShow(null)).toBe("all");
  });

  it("splits active, gone quiet and stuck", () => {
    const active = row({ lastActiveAt: daysAgo(2) });
    const quiet = row({ lastActiveAt: daysAgo(20) });
    const stuck = row({ channel: { wordpress: "started" } });
    expect(matchesShow(active, "active", NOW)).toBe(true);
    expect(matchesShow(quiet, "active", NOW)).toBe(false);
    expect(matchesShow(quiet, "inactive", NOW)).toBe(true);
    expect(matchesShow(stuck, "stuck", NOW)).toBe(true);
    expect(matchesShow(stuck, "wordpress", NOW)).toBe(true);
    expect(matchesShow(active, "wordpress", NOW)).toBe(false);
  });

  it("lists the most recently active first", () => {
    const rows = [
      row({ id: "old", lastActiveAt: daysAgo(9) }),
      row({ id: "new", lastActiveAt: daysAgo(1) }),
      row({ id: "never", lastActiveAt: null, signedUpAt: daysAgo(3) }),
    ];
    expect(visibleRows(rows, "all", NOW).map((r) => r.id)).toEqual(["new", "never", "old"]);
  });
});
