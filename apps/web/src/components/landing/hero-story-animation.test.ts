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

  it("captures signals, then flags exactly the ones that changed", () => {
    const captured = heroFrameAt(2.5);
    expect(captured.items.every((i) => i.state === "captured")).toBe(true);
    const compared = heroFrameAt(7);
    const changed = compared.items.filter((i) => i.state === "changed").map((i) => i.label);
    expect(changed).toEqual(["Robots meta", "“Add to cart” button", "Screenshot"]);
    expect(compared.items.filter((i) => i.state === "match")).toHaveLength(3);
  });

  it("breaks the page before the scan and restores it before the rescan", () => {
    expect(heroFrameAt(2).broken).toBe(0);
    expect(heroFrameAt(6).broken).toBe(1);
    expect(heroFrameAt(10).broken).toBe(1);
    expect(heroFrameAt(14).broken).toBe(0);
  });

  it("alerts with the critical changes first, then shows all clear", () => {
    const alert = heroFrameAt(11.5);
    expect(alert.alerts.map((a) => a.sev)).toEqual(["CRITICAL", "CRITICAL", "MEDIUM"]);
    expect(alert.alerts.every((a) => a.o > 0.99)).toBe(true);
    expect(alert.channels.every((c) => c.sent)).toBe(true);
    expect(heroFrameAt(15.3).clearS).toBeGreaterThan(0.9);
  });

  it("never produces NaN at any moment", () => {
    for (let t = 0; t < 40; t += 0.13) {
      const f = heroFrameAt(t);
      const values = [f.stepP, f.fade, f.flash, f.stamp, f.scanY, f.rescanY, f.diffO, f.cur.p, f.cur.o, f.clearS, ...f.items.map((i) => i.o), ...f.alerts.flatMap((a) => [a.o, a.x]), ...f.channels.map((c) => c.s)];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });
});
