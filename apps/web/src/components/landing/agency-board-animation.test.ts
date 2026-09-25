import { describe, expect, it } from "vitest";
import { AGENCY_CYCLE, SITES, agencyFrameAt } from "./agency-board-animation";

const order = (t: number) =>
  [...agencyFrameAt(t).rows].sort((a, b) => a.y - b.y).map((r) => r.id);

describe("agency board animation", () => {
  it("floats the sites that need attention to the top, most severe first", () => {
    expect(order(2)[0]).toBe("northwind");
    expect(order(5).slice(0, 2)).toEqual(["aurora", "meridian"]);
    expect(agencyFrameAt(5).attention).toBe(2);
  });

  it("drops the fixed site back into place as resolved", () => {
    const f = agencyFrameAt(10);
    expect(f.rows.find((r) => r.id === "aurora")?.state).toBe("fixed");
    expect(order(10)[0]).toBe("meridian");
    expect(f.attention).toBe(1);
    expect(f.healthy).toBe(11);
  });

  it("scans every site before anything changes", () => {
    const f = agencyFrameAt(2.6);
    expect(f.rows.every((r) => r.lastScan === "just now")).toBe(true);
    expect(f.attention).toBe(0);
    expect(SITES).toHaveLength(7);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < AGENCY_CYCLE * 2; t += 0.13) {
      const f = agencyFrameAt(t);
      const values = [f.fade, f.scanP, f.cur.o, f.cur.x, f.cur.y, f.drawer, f.clear, f.deploy, f.report, ...f.fixes, ...f.rows.flatMap((r) => [r.y, r.badgePop, r.flash])];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
