import { describe, expect, it } from "vitest";
import { RELAY_CYCLE, RELAY_H, RELAY_ROWS, RELAY_W, relayFrameAt, rowY } from "./platforms-relay-animation";

describe("Platforms relay animation", () => {
  it("delivers to every destination in order, then holds", () => {
    const hold = relayFrameAt(7);
    expect(hold.rows.every((row) => row.on >= 1 && row.line >= 1)).toBe(true);
    let lastStart = -1;
    for (let i = 0; i < RELAY_ROWS.length; i++) {
      let start = -1;
      for (let t = 0; t < RELAY_CYCLE; t += 0.02) {
        if (relayFrameAt(t).rows[i].on > 0.05) {
          start = t;
          break;
        }
      }
      expect(start).toBeGreaterThan(lastStart);
      lastStart = start;
    }
  });

  it("shows the change before anything is delivered", () => {
    const early = relayFrameAt(1.2);
    expect(early.card).toBeGreaterThan(0.9);
    expect(early.rows.every((row) => row.on === 0 && row.line === 0)).toBe(true);
  });

  it("fades out at the end of the loop and restarts clean", () => {
    expect(relayFrameAt(RELAY_CYCLE - 0.05).fade).toBeLessThan(0.1);
    const again = relayFrameAt(RELAY_CYCLE + 0.1);
    expect(again.rows.every((row) => row.on === 0)).toBe(true);
  });

  it("keeps every destination inside the stage", () => {
    for (let i = 0; i < RELAY_ROWS.length; i++) {
      expect(rowY(i)).toBeGreaterThanOrEqual(0);
      expect(rowY(i) + 52).toBeLessThanOrEqual(RELAY_H);
    }
    expect(RELAY_W).toBeGreaterThan(900);
  });

  it("never produces NaN", () => {
    for (let t = 0; t < 40; t += 0.07) {
      const f = relayFrameAt(t);
      for (const v of [f.fade, f.card, f.chip, ...f.rows.flatMap((row) => [row.line, row.on])]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });
});
