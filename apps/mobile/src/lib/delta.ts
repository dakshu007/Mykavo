/**
 * How to draw "this number moved".
 *
 * Pulled out of the Search Console screen because it has two independent
 * axes that are easy to conflate, and conflating them inverts the meaning of
 * a whole screen:
 *
 *   direction - which way the NUMBER went. Drives the arrow.
 *   good      - whether that is an improvement. Drives the colour.
 *
 * For clicks the two agree. For average search position they do not: 17.8 ->
 * 14.2 is a fall in the number and a rise in the rankings. The first version
 * pointed the arrow at "better", which put an up-arrow next to a figure that
 * had visibly gone down. Two signals disagreeing is worse than one.
 */

export type DeltaDirection = "up" | "down" | "flat";

export interface DeltaPresentation {
  direction: DeltaDirection;
  /** null when there is nothing to judge (no prior period, or no movement). */
  good: boolean | null;
  /** Signed percentage, e.g. "+21%" or "−20%". null when incomparable. */
  label: string | null;
}

/** Below this, a change is noise and is drawn flat rather than coloured. */
const FLAT_THRESHOLD_PERCENT = 0.5;

export function deltaPresentation(
  changePercent: number | null,
  lowerIsBetter = false,
): DeltaPresentation {
  if (changePercent === null || !Number.isFinite(changePercent)) {
    return { direction: "flat", good: null, label: null };
  }

  const flat = Math.abs(changePercent) < FLAT_THRESHOLD_PERCENT;
  const direction: DeltaDirection = flat ? "flat" : changePercent > 0 ? "up" : "down";
  const good = flat ? null : lowerIsBetter ? changePercent < 0 : changePercent > 0;

  // U+2212 MINUS SIGN, not a hyphen: at this size a hyphen next to a digit
  // reads as a dash in the sentence rather than a negative number.
  const sign = changePercent > 0 ? "+" : changePercent < 0 ? "−" : "";
  return {
    direction,
    good,
    label: `${sign}${Math.abs(changePercent).toFixed(0)}%`,
  };
}

/** Percentage change, or null when there is nothing to compare against. */
export function percentChange(current: number, previous: number): number | null {
  // A previous period of zero has no meaningful percentage - "up 100%" from
  // nothing is a different claim from "up 100%" from a real figure, and the
  // screen says "no earlier data" rather than inventing one.
  if (previous === 0 || !Number.isFinite(previous) || !Number.isFinite(current)) return null;
  return ((current - previous) / previous) * 100;
}
