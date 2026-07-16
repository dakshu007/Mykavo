import { describe, expect, it } from "vitest";
import {
  parseHealthWindow,
  bucketMinutesForWindow,
  uptimeBand,
  overallUptime,
  formatPercent,
  formatDayLabel,
  uptimeStripSummary,
  formatDuration,
  formatMs,
  xAt,
  yAt,
  niceTicks,
  splitTimeSegments,
  linePath,
  areaPath,
  responseTimeStats,
  responseTimeSummary,
  formatBucketLabel,
  formatAxisTime,
  type UptimeDay,
} from "./health-charts";

function day(date: string, total: number, up: number): UptimeDay {
  return {
    date,
    totalChecks: total,
    upChecks: up,
    uptimePercent: total > 0 ? (up / total) * 100 : null,
  };
}

describe("parseHealthWindow", () => {
  it("maps the known params", () => {
    expect(parseHealthWindow("7d")).toBe(7);
    expect(parseHealthWindow("30d")).toBe(30);
    expect(parseHealthWindow("90d")).toBe(90);
  });

  it("defaults to 30 for missing or junk values", () => {
    expect(parseHealthWindow(undefined)).toBe(30);
    expect(parseHealthWindow("")).toBe(30);
    expect(parseHealthWindow("14d")).toBe(30);
    expect(parseHealthWindow("<script>")).toBe(30);
  });

  it("takes the first value of a repeated param", () => {
    expect(parseHealthWindow(["7d", "90d"])).toBe(7);
  });
});

describe("bucketMinutesForWindow", () => {
  it("keeps every window near 180 buckets", () => {
    expect((7 * 24 * 60) / bucketMinutesForWindow(7)).toBe(168);
    expect((30 * 24 * 60) / bucketMinutesForWindow(30)).toBe(180);
    expect((90 * 24 * 60) / bucketMinutesForWindow(90)).toBe(180);
  });
});

describe("uptimeBand", () => {
  it("applies the status-page thresholds, boundaries included", () => {
    expect(uptimeBand(100)).toBe("good");
    expect(uptimeBand(99.5)).toBe("good");
    expect(uptimeBand(99.49)).toBe("degraded");
    expect(uptimeBand(95)).toBe("degraded");
    expect(uptimeBand(94.99)).toBe("bad");
    expect(uptimeBand(0)).toBe("bad");
    expect(uptimeBand(null)).toBe("empty");
  });
});

describe("overallUptime", () => {
  it("weights by check count rather than averaging day percentages", () => {
    // 1 check down day + 99 up checks = 99% (not (0+100)/2 = 50%).
    const days = [day("2026-07-01", 1, 0), day("2026-07-02", 99, 99)];
    expect(overallUptime(days)).toBe(99);
  });

  it("is null when there are no checks at all", () => {
    expect(overallUptime([day("2026-07-01", 0, 0)])).toBeNull();
    expect(overallUptime([])).toBeNull();
  });
});

describe("formatPercent", () => {
  it("formats plainly with at most two decimals", () => {
    expect(formatPercent(null)).toBe("-");
    expect(formatPercent(100)).toBe("100%");
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(99.5)).toBe("99.5%");
    expect(formatPercent(99.98)).toBe("99.98%");
    expect(formatPercent(97.123)).toBe("97.12%");
  });

  it("never rounds a partial outage up to 100%", () => {
    expect(formatPercent(99.999)).toBe("99.99%");
  });
});

describe("formatDayLabel", () => {
  it("renders the UTC day without local-timezone drift", () => {
    expect(formatDayLabel("2026-07-09")).toBe("Jul 9");
    expect(formatDayLabel("2026-01-01")).toBe("Jan 1");
    expect(formatDayLabel("2026-12-31")).toBe("Dec 31");
  });
});

describe("uptimeStripSummary", () => {
  it("summarises overall percentage, coverage, and outage days", () => {
    const days = [day("2026-07-01", 100, 100), day("2026-07-02", 100, 50), day("2026-07-03", 0, 0)];
    const summary = uptimeStripSummary(days, 3);
    expect(summary).toContain("75%");
    expect(summary).toContain("2 of 3 days with checks");
    expect(summary).toContain("1 day below 95%");
  });

  it("reports the empty window plainly", () => {
    expect(uptimeStripSummary([day("2026-07-01", 0, 0)], 7)).toBe(
      "No uptime checks recorded in the last 7 days.",
    );
  });
});

describe("formatDuration", () => {
  it("covers sub-minute through multi-day spans", () => {
    expect(formatDuration(0)).toBe("< 1m");
    expect(formatDuration(59_000)).toBe("< 1m");
    expect(formatDuration(60_000)).toBe("1m");
    expect(formatDuration(42 * 60_000)).toBe("42m");
    expect(formatDuration(60 * 60_000)).toBe("1h");
    expect(formatDuration(3 * 3_600_000 + 5 * 60_000)).toBe("3h 5m");
    expect(formatDuration(24 * 3_600_000)).toBe("1d");
    expect(formatDuration(2 * 86_400_000 + 4 * 3_600_000)).toBe("2d 4h");
  });
});

describe("formatMs", () => {
  it("switches to seconds at 1000ms and trims .0", () => {
    expect(formatMs(0)).toBe("0 ms");
    expect(formatMs(412.4)).toBe("412 ms");
    expect(formatMs(999)).toBe("999 ms");
    expect(formatMs(1000)).toBe("1 s");
    expect(formatMs(2100)).toBe("2.1 s");
    expect(formatMs(2000)).toBe("2 s");
  });
});

describe("xAt / yAt", () => {
  it("spreads indices across the horizontal range", () => {
    expect(xAt(0, 3, 10, 110)).toBe(10);
    expect(xAt(1, 3, 10, 110)).toBe(60);
    expect(xAt(2, 3, 10, 110)).toBe(110);
  });

  it("centres a single point instead of dividing by zero", () => {
    expect(xAt(0, 1, 10, 110)).toBe(60);
  });

  it("maps values top-down within the vertical range", () => {
    expect(yAt(0, 100, 8, 108)).toBe(108);
    expect(yAt(100, 100, 8, 108)).toBe(8);
    expect(yAt(50, 100, 8, 108)).toBe(58);
  });

  it("pins to the baseline when the domain is degenerate", () => {
    expect(yAt(0, 0, 8, 108)).toBe(108);
  });
});

describe("niceTicks", () => {
  it("uses 1/2/5 × 10^k steps and always covers the max", () => {
    expect(niceTicks(412)).toEqual([0, 200, 400, 600]);
    expect(niceTicks(100)).toEqual([0, 50, 100]);
    expect(niceTicks(1000)).toEqual([0, 500, 1000]);
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    const ticks = niceTicks(87);
    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(87);
  });

  it("handles degenerate input without exploding", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
    expect(niceTicks(-5)).toEqual([0, 1]);
    expect(niceTicks(Number.NaN)).toEqual([0, 1]);
  });

  it("works when every value is the same (max equals the single value)", () => {
    const ticks = niceTicks(200);
    expect(ticks[ticks.length - 1]).toBeGreaterThanOrEqual(200);
    expect(ticks).toContain(0);
  });
});

describe("splitTimeSegments", () => {
  const id = (n: number) => n;

  it("keeps a contiguous run together", () => {
    const segs = splitTimeSegments(
      [
        { t: 0, v: 1 },
        { t: 10, v: 2 },
        { t: 20, v: 3 },
      ],
      15,
      id,
      id,
    );
    expect(segs).toEqual([
      [
        { x: 0, y: 1 },
        { x: 10, y: 2 },
        { x: 20, y: 3 },
      ],
    ]);
  });

  it("breaks on null values", () => {
    const segs = splitTimeSegments(
      [
        { t: 0, v: 1 },
        { t: 10, v: null },
        { t: 20, v: 3 },
      ],
      100,
      id,
      id,
    );
    expect(segs).toHaveLength(2);
    expect(segs[0]).toEqual([{ x: 0, y: 1 }]);
    expect(segs[1]).toEqual([{ x: 20, y: 3 }]);
  });

  it("breaks on time gaps wider than maxGapMs (missing buckets)", () => {
    const segs = splitTimeSegments(
      [
        { t: 0, v: 1 },
        { t: 10, v: 2 },
        { t: 50, v: 3 }, // 40ms gap > 15ms max
      ],
      15,
      id,
      id,
    );
    expect(segs).toHaveLength(2);
    expect(segs[1]).toEqual([{ x: 50, y: 3 }]);
  });

  it("handles empty and all-null input", () => {
    expect(splitTimeSegments([], 10, id, id)).toEqual([]);
    expect(
      splitTimeSegments(
        [
          { t: 0, v: null },
          { t: 10, v: null },
        ],
        10,
        id,
        id,
      ),
    ).toEqual([]);
  });

  it("applies the scale functions", () => {
    const segs = splitTimeSegments([{ t: 1000, v: 50 }], 10, (t) => t / 100, (v) => 100 - v);
    expect(segs).toEqual([[{ x: 10, y: 50 }]]);
  });
});

describe("linePath / areaPath", () => {
  const seg = [
    { x: 0, y: 100 },
    { x: 50, y: 20.25 },
    { x: 100, y: 60 },
  ];

  it("builds a move-then-line path rounded to one decimal", () => {
    expect(linePath(seg)).toBe("M0 100 L50 20.3 L100 60");
    expect(linePath([])).toBe("");
  });

  it("closes the area down to the baseline", () => {
    expect(areaPath(seg, 120)).toBe("M0 100 L50 20.3 L100 60 L100 120 L0 120 Z");
    expect(areaPath([], 120)).toBe("");
  });

  it("produces a valid sliver for a single point", () => {
    expect(areaPath([{ x: 10, y: 5 }], 40)).toBe("M10 5 L10 40 L10 40 Z");
  });
});

describe("responseTimeStats / responseTimeSummary", () => {
  it("computes avg, peak, min across non-null buckets", () => {
    const stats = responseTimeStats([100, null, 300, 200]);
    expect(stats).toEqual({ avgMs: 200, peakMs: 300, minMs: 100, samples: 3 });
  });

  it("is null with no data and the summary says so", () => {
    expect(responseTimeStats([null, null])).toBeNull();
    expect(responseTimeSummary([], 7)).toBe("No response-time data in the last 7 days.");
  });

  it("summarises with formatted units", () => {
    expect(responseTimeSummary([412], 7)).toBe(
      "Average response time 412 ms over the last 7 days, peak 412 ms.",
    );
    expect(responseTimeSummary([100, 2100], 30)).toBe(
      "Average response time 1.1 s over the last 30 days, peak 2.1 s.",
    );
  });

  it("handles all-identical values (flat line)", () => {
    const stats = responseTimeStats([250, 250, 250]);
    expect(stats).toEqual({ avgMs: 250, peakMs: 250, minMs: 250, samples: 3 });
  });
});

describe("formatBucketLabel / formatAxisTime", () => {
  it("labels a bucket with its time and value", () => {
    const label = formatBucketLabel(Date.UTC(2026, 6, 9, 12, 0), 412);
    expect(label).toContain("Jul");
    expect(label).toContain("412 ms");
  });

  it("marks empty buckets explicitly", () => {
    expect(formatBucketLabel(Date.UTC(2026, 6, 9, 12, 0), null)).toContain(
      "no successful checks",
    );
  });

  it("includes the hour only for short windows", () => {
    const t = Date.UTC(2026, 6, 9, 15, 0);
    expect(formatAxisTime(t, 7)).toMatch(/\d\s?(AM|PM)/);
    expect(formatAxisTime(t, 30)).not.toMatch(/(AM|PM)/);
  });
});
