/**
 * Pure logic for the before/after screenshot comparison widget (spec §33 -
 * "Make comparison extremely easy"). Kept free of React so it can be unit
 * tested in the node vitest environment and shared by the server page (to
 * pick the initial mode) and the client component.
 */

export type CompareMode = "side-by-side" | "slider" | "diff";

export interface CompareImages {
  hasBefore: boolean;
  hasAfter: boolean;
  hasDiff: boolean;
}

/** How far one arrow-key press moves the slider divider, in percent. */
export const SLIDER_KEY_STEP = 2;

/** Which comparison modes are usable given the images we actually have. */
export function modeAvailability(images: CompareImages): Record<CompareMode, boolean> {
  return {
    "side-by-side": images.hasBefore || images.hasAfter,
    slider: images.hasBefore && images.hasAfter,
    diff: images.hasDiff,
  };
}

/**
 * Initial mode: slider when both screenshots exist and the caller prefers it
 * (visual changes), otherwise plain side-by-side.
 */
export function defaultCompareMode(images: CompareImages, preferSlider: boolean): CompareMode {
  if (preferSlider && modeAvailability(images).slider) return "slider";
  return "side-by-side";
}

/** Clamp a slider divider position to 0–100%. Non-finite input recenters. */
export function clampSliderPercent(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.min(100, Math.max(0, value));
}

/**
 * Keyboard handling for the slider handle: left/right arrows nudge by
 * SLIDER_KEY_STEP, Home/End snap to the edges. Returns null for keys the
 * slider does not handle (so callers only preventDefault when it does).
 */
export function sliderPercentForKey(current: number, key: string): number | null {
  switch (key) {
    case "ArrowLeft":
      return clampSliderPercent(current - SLIDER_KEY_STEP);
    case "ArrowRight":
      return clampSliderPercent(current + SLIDER_KEY_STEP);
    case "Home":
      return 0;
    case "End":
      return 100;
    default:
      return null;
  }
}
