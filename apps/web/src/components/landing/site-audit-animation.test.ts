import { describe, expect, it } from "vitest";
import { auditFrameAt } from "./site-audit-animation";

describe("site audit animation", () => {
  it("crawls, then sorts issues by severity", () => {
    const crawling = auditFrameAt(1.2 + 1.5);
    expect(crawling.ticker).toMatch(/^Crawling \//);
    expect(crawling.crawlO).toBe(1);
    const sorted = auditFrameAt(1.2 + 4);
    const order = [...sorted.rows].sort((a, b) => a.y - b.y).map((r) => r.label);
    expect(order).toEqual(["4XX page", "Broken internal link", "Missing meta description", "Duplicate title", "Title too long"]);
  });

  it("raises the health score as fixes land", () => {
    const before = auditFrameAt(1.2 + 4).score;
    const after = auditFrameAt(1.2 + 10).score;
    expect(before).toBe(62);
    expect(after).toBe(62 + 8 + 12 + 7 + 5);
    expect(auditFrameAt(1.2 + 10).rows[1].count).toBe("Fixed");
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 30; t += 0.37) {
      const f = auditFrameAt(t);
      const values = [f.arcOff, f.crawlPct, f.cur.x, f.cur.y, f.ripple.s, ...f.rows.map((r) => r.y), ...f.fly.flatMap((x) => [x.x, x.y])];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
