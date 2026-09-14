import { describe, expect, it } from "vitest";
import { deltaPresentation, percentChange } from "./delta";

describe("percentChange", () => {
  it("computes the obvious cases", () => {
    expect(percentChange(120, 100)).toBeCloseTo(20);
    expect(percentChange(80, 100)).toBeCloseTo(-20);
    expect(percentChange(100, 100)).toBe(0);
  });

  it("refuses to divide by a zero baseline", () => {
    // "Up 100% from nothing" is not the same claim as "up 100%", and the
    // screen says "no earlier data" rather than inventing a number.
    expect(percentChange(50, 0)).toBeNull();
    expect(percentChange(0, 0)).toBeNull();
  });

  it("refuses non-finite input", () => {
    expect(percentChange(Number.NaN, 10)).toBeNull();
    expect(percentChange(10, Number.NaN)).toBeNull();
  });
});

describe("deltaPresentation - a rising number", () => {
  it("points up and calls it good when up is good", () => {
    const d = deltaPresentation(21, false);
    expect(d).toEqual({ direction: "up", good: true, label: "+21%" });
  });

  it("points up and calls it BAD when lower is better", () => {
    // Average position rising from 8 to 12 is a rise in the number and a
    // fall in the rankings.
    const d = deltaPresentation(50, true);
    expect(d.direction).toBe("up");
    expect(d.good).toBe(false);
  });
});

describe("deltaPresentation - a falling number", () => {
  it("points down and calls it bad when up is good", () => {
    const d = deltaPresentation(-8, false);
    expect(d.direction).toBe("down");
    expect(d.good).toBe(false);
    expect(d.label).toBe("−8%");
  });

  it("points DOWN and calls it GOOD when lower is better", () => {
    // The bug this module exists for: average position 17.8 -> 14.2 is a 20%
    // fall in the number and an improvement. The arrow must follow the
    // number (down) while the colour follows the judgement (good). An
    // up-arrow here sat beside a figure that had visibly dropped.
    const change = percentChange(14.2, 17.8);
    expect(change).toBeLessThan(0);
    const d = deltaPresentation(change, true);
    expect(d.direction).toBe("down");
    expect(d.good).toBe(true);
    expect(d.label).toBe("−20%");
  });
});

describe("deltaPresentation - nothing much happened", () => {
  it("draws sub-half-a-percent as flat with no judgement", () => {
    for (const change of [0, 0.4, -0.4]) {
      const d = deltaPresentation(change, false);
      expect(d.direction).toBe("flat");
      expect(d.good).toBeNull();
    }
  });

  it("has no label when there is nothing to compare", () => {
    expect(deltaPresentation(null, false)).toEqual({
      direction: "flat",
      good: null,
      label: null,
    });
    expect(deltaPresentation(Number.NaN, true).label).toBeNull();
  });
});

describe("deltaPresentation - the sign", () => {
  it("uses a real minus sign, not a hyphen", () => {
    // A hyphen beside a digit at 12px reads as punctuation in the sentence.
    expect(deltaPresentation(-12, false).label).toBe("−12%");
    expect(deltaPresentation(-12, false).label).not.toContain("-");
  });

  it("always signs the number, so the arrow is never the only cue", () => {
    expect(deltaPresentation(12, false).label?.startsWith("+")).toBe(true);
  });
});

describe("direction and judgement stay independent", () => {
  it("covers all four combinations", () => {
    const cases: [number, boolean, string, boolean][] = [
      [10, false, "up", true], // clicks up: good
      [-10, false, "down", false], // clicks down: bad
      [10, true, "up", false], // position up: bad
      [-10, true, "down", true], // position down: good
    ];
    for (const [change, lowerIsBetter, direction, good] of cases) {
      const d = deltaPresentation(change, lowerIsBetter);
      expect(d.direction).toBe(direction);
      expect(d.good).toBe(good);
    }
  });
});
