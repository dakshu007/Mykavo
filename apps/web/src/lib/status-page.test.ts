import { describe, expect, it } from "vitest";
import {
  buildDayBuckets,
  dayLevel,
  dayTooltip,
  formatDuration,
  formatUptime,
  formatUtcDay,
  type DayRollupRow,
} from "./status-page";

describe("dayLevel", () => {
  it("maps missing data to empty", () => {
    expect(dayLevel(null)).toBe("empty");
  });

  it("maps ≥99.5% to operational (green)", () => {
    expect(dayLevel(100)).toBe("operational");
    expect(dayLevel(99.5)).toBe("operational");
  });

  it("maps ≥95% to degraded (amber)", () => {
    expect(dayLevel(99.49)).toBe("degraded");
    expect(dayLevel(95)).toBe("degraded");
  });

  it("maps <95% to down (red)", () => {
    expect(dayLevel(94.99)).toBe("down");
    expect(dayLevel(0)).toBe("down");
  });
});

describe("formatUptime", () => {
  it("shows a dash when no checks exist", () => {
    expect(formatUptime(null)).toBe("—");
  });

  it("shows exactly 100 without decimals", () => {
    expect(formatUptime(100)).toBe("100%");
  });

  it("collapses values that round to 100.00 into 100%", () => {
    expect(formatUptime(99.999)).toBe("100%");
  });

  it("shows two decimals otherwise", () => {
    expect(formatUptime(99.985)).toBe("99.98%");
    expect(formatUptime(97.5)).toBe("97.50%");
    expect(formatUptime(0)).toBe("0.00%");
  });
});

describe("formatDuration", () => {
  it("never shows 0m for sub-minute outages", () => {
    expect(formatDuration(0)).toBe("< 1m");
    expect(formatDuration(59_000)).toBe("< 1m");
  });

  it("shows minutes below an hour", () => {
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(42 * 60_000)).toBe("42m");
  });

  it("shows hours with a minute remainder", () => {
    expect(formatDuration(60 * 60_000)).toBe("1h");
    expect(formatDuration(65 * 60_000)).toBe("1h 5m");
  });

  it("shows days with an hour remainder and drops minutes", () => {
    expect(formatDuration(24 * 60 * 60_000)).toBe("1d");
    expect(formatDuration((2 * 24 + 4) * 60 * 60_000 + 30 * 60_000)).toBe("2d 4h");
  });
});

describe("buildDayBuckets", () => {
  const now = new Date("2026-07-11T15:30:00Z");
  const rows: DayRollupRow[] = [
    { day: "2026-07-09", total: 100, up: 90 },
    { day: "2026-07-11", total: 288, up: 288 },
  ];

  it("covers the last N UTC days ending today, oldest first", () => {
    const buckets = buildDayBuckets(rows, 5, now);
    expect(buckets.map((b) => b.date)).toEqual([
      "2026-07-07",
      "2026-07-08",
      "2026-07-09",
      "2026-07-10",
      "2026-07-11",
    ]);
  });

  it("computes per-day percentages and leaves gaps null", () => {
    const buckets = buildDayBuckets(rows, 5, now);
    expect(buckets[0].uptimePercent).toBeNull();
    expect(buckets[2].uptimePercent).toBe(90);
    expect(buckets[3].uptimePercent).toBeNull();
    expect(buckets[4].uptimePercent).toBe(100);
  });

  it("treats a zero-check day as no data", () => {
    const buckets = buildDayBuckets([{ day: "2026-07-11", total: 0, up: 0 }], 1, now);
    expect(buckets[0].uptimePercent).toBeNull();
  });

  it("crosses month boundaries in UTC", () => {
    const buckets = buildDayBuckets([], 2, new Date("2026-07-01T00:10:00Z"));
    expect(buckets.map((b) => b.date)).toEqual(["2026-06-30", "2026-07-01"]);
  });
});

describe("formatUtcDay", () => {
  it("formats without local-timezone drift", () => {
    expect(formatUtcDay("2026-07-11")).toBe("Jul 11, 2026");
    expect(formatUtcDay("2026-01-01")).toBe("Jan 1, 2026");
  });
});

describe("dayTooltip", () => {
  it("combines the date with the uptime percentage", () => {
    expect(dayTooltip({ date: "2026-07-11", uptimePercent: 99.985 })).toBe(
      "Jul 11, 2026 · 99.98% uptime",
    );
  });

  it("labels missing days as no data", () => {
    expect(dayTooltip({ date: "2026-07-07", uptimePercent: null })).toBe(
      "Jul 7, 2026 · no data",
    );
  });
});
