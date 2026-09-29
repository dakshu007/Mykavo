import { describe, expect, it } from "vitest";
import { HERO_CYCLE, STEPS, heroFrameAt } from "./hero-story-animation";

describe("hero story animation", () => {
  it("walks through the five steps in order, then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < HERO_CYCLE; t += 0.1) {
      const s = heroFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(STEPS).toHaveLength(5);
    expect(heroFrameAt(HERO_CYCLE + 0.5).step).toBe(0);
  });

  it("captures every signal at baseline, then flags exactly the ones that changed", () => {
    expect(heroFrameAt(0.5).items.every((i) => i.state === "hidden")).toBe(true);
    const captured = heroFrameAt(4.5);
    expect(captured.items.every((i) => i.state === "captured" && i.left === 1 && i.right === 0)).toBe(true);
    const compared = heroFrameAt(8.5);
    expect(compared.items.every((i) => i.right === 1)).toBe(true);
    expect(compared.items.filter((i) => i.state === "changed").map((i) => i.label)).toEqual(["Screenshot", "Add to cart", "Robots meta"]);
    expect(compared.items.filter((i) => i.state === "match").map((i) => i.label)).toEqual(["HTTP status", "Title tag"]);
  });

  it("slides the approved baseline out of the live page before anything breaks", () => {
    expect(heroFrameAt(0.8).baselineP).toBe(0);
    expect(heroFrameAt(2.4).baselineP).toBe(1);
    expect(heroFrameAt(2.4).stamp).toBeGreaterThan(0.99);
    expect(heroFrameAt(2.4).broken).toBe(0);
  });

  it("breaks the page before the scan and restores it before the rescan", () => {
    expect(heroFrameAt(2).broken).toBe(0);
    expect(heroFrameAt(3.2).deployChip).toBeGreaterThan(0.9);
    expect(heroFrameAt(4.5).beam.o).toBe(1);
    expect(heroFrameAt(6).broken).toBe(1);
    expect(heroFrameAt(10).broken).toBe(1);
    expect(heroFrameAt(14).broken).toBe(0);
    expect(heroFrameAt(14.2).beam.o).toBe(1);
  });

  it("alerts with the critical changes first, then shows all clear", () => {
    const alert = heroFrameAt(11.8);
    expect(alert.sheetO).toBe(1);
    expect(alert.alerts.map((a) => a.sev)).toEqual(["CRITICAL", "CRITICAL", "MEDIUM"]);
    expect(alert.alerts.every((a) => a.o > 0.99)).toBe(true);
    expect(alert.channels.every((c) => c.sent)).toBe(true);
    const clear = heroFrameAt(15.4);
    expect(clear.sheetO).toBe(0);
    expect(clear.clearS).toBeGreaterThan(0.9);
    expect(clear.items.every((i) => i.state === "match")).toBe(true);
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 40; t += 0.13) {
      const f = heroFrameAt(t);
      const values = [
        f.stepP, f.fade, f.flash, f.stamp, f.baselineP, f.baselineO, f.burst, f.beam.y, f.beam.o, f.dim, f.sheetO, f.sheetY,
        f.cur.p, f.cur.o, f.clearS, f.counter, f.pulse, f.captionIn, ...f.build,
        ...f.items.flatMap((i) => [i.o, i.left, i.right, i.flash]),
        ...f.alerts.flatMap((a) => [a.o, a.x]),
        ...f.channels.flatMap((c) => [c.s, c.ring]),
      ];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
