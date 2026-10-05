import { describe, expect, it } from "vitest";
import { CHECKS, CHROME_CYCLE, SCORE, STEPS, chromeFrameAt, path } from "./chrome-extension-animation";

describe("Chrome extension animation", () => {
  it("plays the five steps in order, then loops", () => {
    const seen: number[] = [];
    for (let t = 0; t < CHROME_CYCLE; t += 0.1) {
      const s = chromeFrameAt(t).step;
      if (seen[seen.length - 1] !== s) seen.push(s);
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(STEPS).toHaveLength(5);
  });

  it("finishes the check before Protect is pressed", () => {
    const f = chromeFrameAt(6.2);
    expect(f.checkOpen).toBe(true);
    expect(f.score).toBe(SCORE);
    expect(f.rows.every((o) => o === 1)).toBe(true);
    expect(CHECKS.some((c) => c.status === "fail")).toBe(true);
  });

  it("opens mykavo.app after Protect and comes back to the site connected", () => {
    expect(chromeFrameAt(7.0).onMykavo).toBe(false);
    expect(chromeFrameAt(8.5).onMykavo).toBe(true);
    expect(chromeFrameAt(9.9).done).toBe(1);
    expect(chromeFrameAt(9.5).formOut).toBe(1);
    expect(chromeFrameAt(9.3).done).toBe(0);
    const back = chromeFrameAt(12);
    expect(back.onMykavo).toBe(false);
    expect(back.statusOpen).toBe(true);
    expect(back.critical).toBe(0);
  });

  it("flags the critical change with the badge and the email", () => {
    const f = chromeFrameAt(16);
    expect(f.critical).toBe(1);
    expect(f.badge).toBeCloseTo(1, 5);
    expect(f.mail).toBe(1);
    expect(chromeFrameAt(12).badge).toBe(0);
  });

  it("never shows both popups at once, and never produces NaN", () => {
    for (let t = 0; t < 40; t += 0.07) {
      const f = chromeFrameAt(t);
      expect(f.checkOpen && f.statusOpen).toBe(false);
      const values = [f.fade, f.pageIn, f.tabSwap, f.iconPress, f.badge, f.checkIn, f.ring, f.chips, f.protectIn, f.done, f.doneCheck, f.statusIn, f.tiles, f.uptime, f.cloud, f.flip, f.mail, f.cursor.o, ...f.rows];
      for (const v of values) expect(Number.isFinite(v)).toBe(true);
    }
  });

  it("moves the cursor through its waypoints", () => {
    const keys: Array<[number, { x: number; y: number }]> = [
      [0, { x: 0, y: 0 }],
      [1, { x: 10, y: 20 }],
    ];
    expect(path(-1, keys)).toEqual({ x: 0, y: 0 });
    expect(path(1, keys)).toEqual({ x: 10, y: 20 });
    expect(path(5, keys)).toEqual({ x: 10, y: 20 });
  });
});
