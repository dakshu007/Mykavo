import { describe, expect, it } from "vitest";
import { REPORT_CYCLE, SCORES, STEPS, reportFrameAt } from "./client-report-animation";

describe("client report animation", () => {
  it("runs build, brand, deliver in order and loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < REPORT_CYCLE; t += 0.1) {
      const s = reportFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2]);
    expect(STEPS).toEqual(["Build", "Brand", "Deliver"]);
  });

  it("finishes building the report before branding starts", () => {
    const f = reportFrameAt(4.1);
    expect(f.uptime).toBeCloseTo(99.98, 2);
    expect([f.response, f.changes, f.scans]).toEqual([412, 7, 30]);
    expect(f.rings.every((p) => p === 1)).toBe(true);
    expect(SCORES.map((s) => s.score)).toEqual([91, 98, 100, 96]);
    expect(f.accent).toBe(0);
  });

  it("is white-labelled before it is delivered", () => {
    expect(reportFrameAt(7).accent).toBe(1);
    expect(reportFrameAt(7).shrink).toBe(0);
    expect(reportFrameAt(10).shrink).toBe(1);
    expect(reportFrameAt(10).inbox).toBe(1);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < 30; t += 0.13) {
      const f = reportFrameAt(t);
      const values = [f.fade, f.uptime, f.spark, f.ssl, f.palette, f.cur.o, f.cur.p, f.accent, f.flip, f.schedule, f.shrink, f.inbox, f.thumbO, f.rowNew, f.opened, ...f.rings];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
