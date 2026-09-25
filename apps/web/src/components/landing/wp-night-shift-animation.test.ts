import { describe, expect, it } from "vitest";
import { NIGHT_CYCLE, PAGES, STEPS, UPDATES, nightFrameAt } from "./wp-night-shift-animation";

describe("WordPress night shift animation", () => {
  it("plays the five steps of the night in order, then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < NIGHT_CYCLE; t += 0.1) {
      const s = nightFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(STEPS.map((s) => s.time)).toEqual(["02:00", "02:01", "02:03", "08:30", "Next"]);
  });

  it("finishes all three updates before MyKavo checks", () => {
    expect(nightFrameAt(3.5).bars).toEqual([1, 1, 1]);
    expect(nightFrameAt(3.5).screen).toBe("updates");
    expect(nightFrameAt(4).screen).toBe("checking");
  });

  it("checks every page and flags only the broken ones", () => {
    const f = nightFrameAt(6.5);
    expect(f.pages.every((p) => p.done)).toBe(true);
    expect(f.pages.filter((p) => p.broken).map((p) => p.path)).toEqual(["/shop/yirgacheffe", "/subscribe"]);
    expect(PAGES).toHaveLength(8);
  });

  it("gives one update the blame and verifies the others", () => {
    expect(UPDATES.map((u) => u.changes)).toEqual([2, 0, 0]);
    expect(nightFrameAt(8).rows.every((o) => o === 1)).toBe(true);
    expect(nightFrameAt(8).badge).toBeCloseTo(1, 5);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < 40; t += 0.13) {
      const f = nightFrameAt(t);
      const values = [f.fade, f.night, f.checkP, f.badge, f.alertChip, f.pulse, f.appeared, f.warn, f.cur.o, f.cur.p, ...f.bars, ...f.rows];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
