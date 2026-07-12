import { describe, expect, it } from "vitest";
import {
  shouldAlertPerformanceDrop,
  PERFORMANCE_DROP_THRESHOLD,
  PERFORMANCE_DROP_MIN_BASELINE,
} from "./performance";

describe("shouldAlertPerformanceDrop (the drop rule)", () => {
  it("alerts on a fall of exactly the threshold (edge: 15 points)", () => {
    expect(shouldAlertPerformanceDrop(90, 75)).toBe(true);
    expect(shouldAlertPerformanceDrop(45, 30)).toBe(true);
  });

  it("does NOT alert one point short of the threshold", () => {
    expect(shouldAlertPerformanceDrop(90, 76)).toBe(false);
    expect(shouldAlertPerformanceDrop(45, 31)).toBe(false);
  });

  it("alerts on falls well beyond the threshold", () => {
    expect(shouldAlertPerformanceDrop(95, 40)).toBe(true);
    expect(shouldAlertPerformanceDrop(100, 0)).toBe(true);
  });

  it("never alerts on the first audit (no previous score)", () => {
    expect(shouldAlertPerformanceDrop(null, 20)).toBe(false);
    expect(shouldAlertPerformanceDrop(null, 95)).toBe(false);
  });

  it("never alerts when the current audit produced no score", () => {
    expect(shouldAlertPerformanceDrop(90, null)).toBe(false);
    expect(shouldAlertPerformanceDrop(null, null)).toBe(false);
  });

  it("exempts already-terrible baselines (previous < 30)", () => {
    expect(shouldAlertPerformanceDrop(29, 0)).toBe(false);
    expect(shouldAlertPerformanceDrop(20, 5)).toBe(false);
    expect(shouldAlertPerformanceDrop(0, 0)).toBe(false);
  });

  it("alerts at the baseline edge: previous of exactly 30 still qualifies", () => {
    expect(shouldAlertPerformanceDrop(PERFORMANCE_DROP_MIN_BASELINE, 15)).toBe(true);
    expect(shouldAlertPerformanceDrop(PERFORMANCE_DROP_MIN_BASELINE, 16)).toBe(false);
  });

  it("does NOT alert on improvements or unchanged scores", () => {
    expect(shouldAlertPerformanceDrop(70, 70)).toBe(false);
    expect(shouldAlertPerformanceDrop(70, 90)).toBe(false);
  });

  it("keeps the documented constants", () => {
    expect(PERFORMANCE_DROP_THRESHOLD).toBe(15);
    expect(PERFORMANCE_DROP_MIN_BASELINE).toBe(30);
  });
});
