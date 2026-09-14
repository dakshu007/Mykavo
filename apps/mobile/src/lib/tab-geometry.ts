/**
 * Geometry for the floating tab bar: how wide each item is, where it sits,
 * and which one a finger is over mid-drag.
 *
 * Kept out of the component so it can be unit-tested - importing anything
 * from react-native pulls its Flow source into the test runner, which cannot
 * parse it. Every failure mode here is silent (you land on the tab NEXT to
 * your thumb), so it is worth testing on its own.
 */

/** Horizontal padding inside the pill. */
export const PILL_PADDING = 10;

/**
 * Item size and spacing, chosen so the pill always fits the narrowest phone
 * it will meet (360dp) while every target stays at or above the 44dp
 * accessibility minimum.
 *
 *   5 tabs: 5x48 + 4x6 + 20 = 284dp
 *   6 tabs: 6x48 + 5x6 + 20 = 338dp   <- the Usage tab, admins only
 *   7 tabs: 7x48 + 6x6 + 20 = 392dp   <- would overflow a 360dp screen
 *
 * Hence the step down at seven: the bar shrinks before it clips. Below 44
 * would be an accessibility regression, so anything past seven needs a
 * different shape, not smaller buttons.
 */
export function itemGeometry(count: number): { size: number; gap: number } {
  if (count <= 6) return { size: 48, gap: 6 };
  return { size: 44, gap: 4 };
}

/** Left edge of item `index` inside the pill. */
export function itemOffset(index: number, size: number, gap: number): number {
  return PILL_PADDING + index * (size + gap);
}

/** Total pill width for `count` items. */
export function pillWidth(count: number, size: number, gap: number): number {
  return PILL_PADDING * 2 + count * size + Math.max(0, count - 1) * gap;
}

/**
 * Which tab a finger at `x` (relative to the pill's left edge) is over.
 *
 * Rounds to the NEAREST item rather than requiring a hit inside one, so
 * dragging through the 6dp gaps never blanks the preview - a highlight that
 * flickers off between every pair of tabs feels broken.
 *
 * Returns null once the finger leaves the pill by more than `slop`, which is
 * the cancel affordance: slide off the bar and lift to change nothing. The
 * slop exists because fingers are imprecise and the pill sits 11dp from the
 * screen edge on a 360dp phone - cancelling the instant a touch strays past
 * the rounded corner would make the gesture feel brittle.
 */
export function indexAtX(
  x: number,
  count: number,
  size: number,
  gap: number,
  slop = 24,
): number | null {
  if (count <= 0) return null;
  const width = pillWidth(count, size, gap);
  if (x < -slop || x > width + slop) return null;
  const nearest = Math.round((x - PILL_PADDING - size / 2) / (size + gap));
  return Math.min(count - 1, Math.max(0, nearest));
}
