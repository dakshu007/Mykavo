import { describe, expect, it } from "vitest";
import {
  detectTrafficDrop,
  findTrafficDrops,
  DROP_RULES,
  type PageDailyPoint,
  type PageChange,
} from "./traffic-drop";

/** Build a series ending on 2026-03-01, oldest first. */
function series(dailyClicks: number[], position = 5): PageDailyPoint[] {
  const end = new Date("2026-03-01T00:00:00Z");
  return dailyClicks.map((clicks, i) => {
    const d = new Date(end.getTime() - (dailyClicks.length - 1 - i) * 86_400_000);
    return {
      date: d.toISOString().slice(0, 10),
      clicks,
      impressions: clicks * 20,
      position,
    };
  });
}

/** Same 28-day range, but with a position per day as well as clicks. */
function seriesWithPosition(
  days: Array<{ clicks: number; position: number }>,
): PageDailyPoint[] {
  const end = new Date("2026-03-01T00:00:00Z");
  return days.map((day, i) => ({
    date: new Date(end.getTime() - (days.length - 1 - i) * 86_400_000)
      .toISOString()
      .slice(0, 10),
    clicks: day.clicks,
    impressions: day.clicks * 20,
    position: day.position,
  }));
}

/** 21 baseline days then 7 recent days. */
const steady = (n: number) => Array(28).fill(n);
const dropped = (before: number, after: number) => [
  ...Array(21).fill(before),
  ...Array(7).fill(after),
];

function change(partial: Partial<PageChange> = {}): PageChange {
  return {
    id: "c1",
    detectedAt: new Date("2026-02-22T10:00:00Z"),
    category: "SEO",
    severity: "HIGH",
    title: "Canonical URL removed",
    ...partial,
  };
}

describe("detectTrafficDrop - when NOT to report", () => {
  it("says nothing when traffic is steady", () => {
    expect(detectTrafficDrop("/p", series(steady(10)), [])).toBeNull();
  });

  it("says nothing when traffic went UP", () => {
    expect(detectTrafficDrop("/p", series(dropped(10, 40)), [])).toBeNull();
  });

  // A page with a handful of clicks swings for reasons that have nothing to do
  // with the site. Reporting those trains people to ignore the feature.
  it("ignores pages too quiet to reason about", () => {
    // 21 baseline days totalling 7 clicks - far under minBaselineClicks (20) -
    // then nothing. A real collapse in percentage terms, and meaningless.
    const quiet = [...Array(14).fill(0), ...Array(7).fill(1), ...Array(7).fill(0)];
    expect(quiet.slice(0, 21).reduce((a, b) => a + b, 0)).toBeLessThan(
      DROP_RULES.minBaselineClicks,
    );
    expect(detectTrafficDrop("/p", series(quiet), [])).toBeNull();
  });

  it("needs enough history before it will judge anything", () => {
    expect(detectTrafficDrop("/p", series(Array(10).fill(50)), [])).toBeNull();
  });

  it("ignores a fall smaller than the threshold", () => {
    // 10 -> 9 is a 10% fall, under the 25% rule.
    expect(detectTrafficDrop("/p", series(dropped(10, 9)), [])).toBeNull();
  });
});

describe("detectTrafficDrop - the drop itself", () => {
  it("reports the size of a real fall", () => {
    const drop = detectTrafficDrop("/pricing", series(dropped(20, 8)), [])!;
    expect(drop).not.toBeNull();
    expect(drop.dropPercent).toBe(60);
    expect(drop.page).toBe("/pricing");
  });

  it("reports clicks before and after", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [])!;
    expect(drop.clicksBefore).toBe(140); // 20/day x 7
    expect(drop.clicksAfter).toBe(35); // 5/day x 7
  });

  it("carries average position before and after", () => {
    const drop = detectTrafficDrop(
      "/p",
      seriesWithPosition([
        ...Array(21).fill({ clicks: 20, position: 3 }),
        ...Array(7).fill({ clicks: 5, position: 18 }),
      ]),
      [],
    )!;
    expect(drop.positionBefore).toBe(3);
    expect(drop.positionAfter).toBe(18);
  });

  // A single quiet Sunday is not the moment everything went wrong.
  it("does not treat one bad day as the onset", () => {
    const s = series([...Array(21).fill(20), 1, 20, 20, 20, 20, 20, 20]);
    expect(detectTrafficDrop("/p", s, [])).toBeNull();
  });
});

describe("detectTrafficDrop - attributing the cause", () => {
  it("names a change that landed just before the drop", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [change()])!;
    expect(drop.suspects).toHaveLength(1);
    expect(drop.suspects[0].title).toBe("Canonical URL removed");
    expect(drop.suspects[0].daysBefore).toBeGreaterThanOrEqual(0);
  });

  // The whole point: a change AFTER the drop began cannot have caused it.
  it("ignores changes that happened after the drop started", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ detectedAt: new Date("2026-03-01T00:00:00Z") }),
    ])!;
    expect(drop.suspects).toHaveLength(0);
    expect(drop.confidence).toBe("unexplained");
  });

  it("ignores changes from long before the drop", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ detectedAt: new Date("2025-11-01T00:00:00Z") }),
    ])!;
    expect(drop.suspects).toHaveLength(0);
  });

  it("puts the most severe suspect first", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ id: "low", severity: "LOW", title: "Meta description changed" }),
      change({ id: "crit", severity: "CRITICAL", title: "Page returns 404" }),
    ])!;
    expect(drop.suspects[0].id).toBe("crit");
  });
});

describe("detectTrafficDrop - confidence, and admitting ignorance", () => {
  // The most important behaviour in this file. If nothing changed, say so.
  // Blaming the nearest unrelated change sends someone to "fix" something that
  // was never broken.
  it("says unexplained when nothing changed on the page", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [])!;
    expect(drop.confidence).toBe("unexplained");
    expect(drop.suspects).toHaveLength(0);
  });

  it("is strong for a severe change in a search-relevant category", () => {
    const drop = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ severity: "CRITICAL", category: "SEO" }),
    ])!;
    expect(drop.confidence).toBe("strong");
  });

  // A visual tweak the same week is a coincidence, not a cause.
  it("is only possible for a low-severity or unrelated change", () => {
    const visual = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ severity: "HIGH", category: "VISUAL", title: "Layout shifted" }),
    ])!;
    expect(visual.confidence).toBe("possible");

    const minor = detectTrafficDrop("/p", series(dropped(20, 5)), [
      change({ severity: "LOW", category: "SEO" }),
    ])!;
    expect(minor.confidence).toBe("possible");
  });
});

describe("findTrafficDrops - ordering across pages", () => {
  it("puts explained drops above unexplained ones", () => {
    const pages = new Map([
      ["/mystery", series(dropped(100, 5))], // bigger drop, no cause
      ["/pricing", series(dropped(20, 10))], // smaller drop, clear cause
    ]);
    const changes = new Map([["/pricing", [change({ severity: "CRITICAL" })]]]);
    const drops = findTrafficDrops(pages, changes);
    expect(drops.map((d) => d.page)).toEqual(["/pricing", "/mystery"]);
  });

  it("orders by size within the same confidence", () => {
    const pages = new Map([
      ["/small", series(dropped(20, 13))],
      ["/large", series(dropped(20, 2))],
    ]);
    const drops = findTrafficDrops(pages, new Map());
    expect(drops[0].page).toBe("/large");
  });

  it("returns nothing when no page dropped", () => {
    expect(findTrafficDrops(new Map([["/a", series(steady(30))]]), new Map())).toEqual([]);
  });
});

describe("DROP_RULES", () => {
  it("keeps the thresholds arguable rather than magic", () => {
    expect(DROP_RULES.minDropFraction).toBeGreaterThan(0);
    expect(DROP_RULES.minDropFraction).toBeLessThan(1);
    expect(DROP_RULES.windowDays).toBeGreaterThan(0);
    expect(DROP_RULES.lookbackDays).toBeGreaterThan(DROP_RULES.windowDays);
  });
});
