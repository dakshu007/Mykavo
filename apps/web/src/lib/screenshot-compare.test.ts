import { describe, expect, it } from "vitest";
import {
  clampSliderPercent,
  defaultCompareMode,
  modeAvailability,
  SLIDER_KEY_STEP,
  sliderPercentForKey,
} from "./screenshot-compare";

describe("modeAvailability", () => {
  it("enables everything when all images exist", () => {
    expect(modeAvailability({ hasBefore: true, hasAfter: true, hasDiff: true })).toEqual({
      "side-by-side": true,
      slider: true,
      diff: true,
    });
  });

  it("requires both screenshots for the slider", () => {
    expect(
      modeAvailability({ hasBefore: true, hasAfter: false, hasDiff: false }).slider,
    ).toBe(false);
    expect(
      modeAvailability({ hasBefore: false, hasAfter: true, hasDiff: false }).slider,
    ).toBe(false);
    expect(
      modeAvailability({ hasBefore: true, hasAfter: true, hasDiff: false }).slider,
    ).toBe(true);
  });

  it("allows side by side with a single screenshot", () => {
    expect(
      modeAvailability({ hasBefore: true, hasAfter: false, hasDiff: false })["side-by-side"],
    ).toBe(true);
    expect(
      modeAvailability({ hasBefore: false, hasAfter: true, hasDiff: false })["side-by-side"],
    ).toBe(true);
    expect(
      modeAvailability({ hasBefore: false, hasAfter: false, hasDiff: false })["side-by-side"],
    ).toBe(false);
  });

  it("gates diff mode on the diff image alone", () => {
    expect(modeAvailability({ hasBefore: false, hasAfter: false, hasDiff: true }).diff).toBe(true);
    expect(modeAvailability({ hasBefore: true, hasAfter: true, hasDiff: false }).diff).toBe(false);
  });
});

describe("defaultCompareMode", () => {
  it("picks the slider for visual changes with both screenshots", () => {
    expect(defaultCompareMode({ hasBefore: true, hasAfter: true, hasDiff: true }, true)).toBe(
      "slider",
    );
    expect(defaultCompareMode({ hasBefore: true, hasAfter: true, hasDiff: false }, true)).toBe(
      "slider",
    );
  });

  it("falls back to side by side when a screenshot is missing", () => {
    expect(defaultCompareMode({ hasBefore: false, hasAfter: true, hasDiff: true }, true)).toBe(
      "side-by-side",
    );
    expect(defaultCompareMode({ hasBefore: true, hasAfter: false, hasDiff: false }, true)).toBe(
      "side-by-side",
    );
  });

  it("stays side by side for non-visual changes even with both screenshots", () => {
    expect(defaultCompareMode({ hasBefore: true, hasAfter: true, hasDiff: false }, false)).toBe(
      "side-by-side",
    );
  });
});

describe("clampSliderPercent", () => {
  it("passes through in-range values", () => {
    expect(clampSliderPercent(0)).toBe(0);
    expect(clampSliderPercent(37.5)).toBe(37.5);
    expect(clampSliderPercent(100)).toBe(100);
  });

  it("clamps out-of-range values", () => {
    expect(clampSliderPercent(-12)).toBe(0);
    expect(clampSliderPercent(140)).toBe(100);
  });

  it("recenters non-finite input", () => {
    expect(clampSliderPercent(Number.NaN)).toBe(50);
    expect(clampSliderPercent(Number.POSITIVE_INFINITY)).toBe(50);
  });
});

describe("sliderPercentForKey", () => {
  it("nudges by the key step with arrow keys", () => {
    expect(sliderPercentForKey(50, "ArrowLeft")).toBe(50 - SLIDER_KEY_STEP);
    expect(sliderPercentForKey(50, "ArrowRight")).toBe(50 + SLIDER_KEY_STEP);
  });

  it("clamps arrow-key movement at the edges", () => {
    expect(sliderPercentForKey(1, "ArrowLeft")).toBe(0);
    expect(sliderPercentForKey(99, "ArrowRight")).toBe(100);
  });

  it("snaps to the edges with Home and End", () => {
    expect(sliderPercentForKey(63, "Home")).toBe(0);
    expect(sliderPercentForKey(63, "End")).toBe(100);
  });

  it("ignores keys the slider does not handle", () => {
    expect(sliderPercentForKey(50, "ArrowUp")).toBeNull();
    expect(sliderPercentForKey(50, "Tab")).toBeNull();
    expect(sliderPercentForKey(50, "a")).toBeNull();
  });
});
