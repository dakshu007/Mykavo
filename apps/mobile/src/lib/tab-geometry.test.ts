import { describe, expect, it } from "vitest";
import { indexAtPoint, indexAtX } from "./tab-geometry";

/**
 * The drag-to-switch hit test.
 *
 * Worth testing on its own because every failure mode is silent: an off-by-one
 * sends you to the tab NEXT to the one under your thumb, and a wrong cancel
 * boundary either strands the gesture (never cancels) or makes the bar feel
 * like it drops your finger.
 *
 * Geometry for 6 tabs: padding 10, size 48, gap 6.
 *   item 0 spans x 10..58, item 1 64..112, item 2 118..166,
 *   item 3 172..220, item 4 226..274, item 5 280..328
 *   pill width = 10*2 + 6*48 + 5*6 = 338
 */
const SIX = { count: 6, size: 48, gap: 6 };

function at(x: number, o = SIX) {
  return indexAtX(x, o.count, o.size, o.gap);
}

describe("indexAtX", () => {
  it("picks the item the finger is inside", () => {
    expect(at(10)).toBe(0);
    expect(at(34)).toBe(0); // centre of item 0
    expect(at(88)).toBe(1); // centre of item 1
    expect(at(142)).toBe(2);
    expect(at(304)).toBe(5); // centre of the last item
  });

  it("snaps to the nearest item when the finger is in a gap", () => {
    // Dragging through the 6px gaps must never blank the preview - the
    // highlight would flicker off and on between every pair of tabs.
    expect(at(60)).toBe(0); // just past item 0's right edge
    expect(at(62)).toBe(1); // just before item 1's left edge
    expect(at(114)).toBe(1);
    expect(at(116)).toBe(2);
  });

  it("clamps at both ends rather than running off", () => {
    expect(at(0)).toBe(0);
    expect(at(-10)).toBe(0);
    expect(at(336)).toBe(5);
  });

  it("returns null once the finger leaves the pill, which cancels", () => {
    // The cancel affordance: slide off the bar and lift to change nothing.
    expect(at(-40)).toBeNull();
    expect(at(400)).toBeNull();
  });

  it("keeps a slop margin so a slightly-off finger still counts", () => {
    // Fingers are not precise and the pill is 6dp from the screen edge on a
    // 360dp phone; cancelling the instant the touch strays a pixel past the
    // rounded corner would make the gesture feel brittle.
    expect(at(-20)).toBe(0);
    expect(at(348)).toBe(5);
  });

  it("works for the five-tab (non-admin) bar", () => {
    const five = { count: 5, size: 48, gap: 6 };
    expect(at(34, five)).toBe(0);
    expect(at(250, five)).toBe(4); // centre of the last of five
    // A five-tab pill is 284dp wide. Where a SIXTH tab would sit (x 280-328)
    // is past its end - but the first 24dp of that is inside the slop and
    // still clamps to the last tab, which is the point of the slop.
    expect(at(304, five)).toBe(4);
    expect(at(340, five)).toBeNull();
  });

  it("works for the seven-tab shrunken bar", () => {
    const seven = { count: 7, size: 44, gap: 4 };
    expect(at(32, seven)).toBe(0);
    expect(at(320, seven)).toBe(6);
  });

  it("never returns an index outside the tab list", () => {
    for (const count of [1, 2, 5, 6, 7]) {
      for (let x = -60; x < 460; x += 3) {
        const index = indexAtX(x, count, 48, 6);
        if (index === null) continue;
        expect(index).toBeGreaterThanOrEqual(0);
        expect(index).toBeLessThan(count);
      }
    }
  });
});

describe("indexAtPoint", () => {
  const SIZE = 48;
  const GAP = 6;
  const COUNT = 6;
  const at = (x: number, y: number) => indexAtPoint(x, y, COUNT, SIZE, GAP);

  it("behaves like indexAtX while the finger is on the bar", () => {
    for (const x of [-20, 0, 10, 34, 64, 118, 200, 338, 355, 400]) {
      expect(at(x, SIZE / 2)).toBe(indexAtX(x, COUNT, SIZE, GAP));
    }
  });

  it("tolerates a thumb wandering off the bar's height mid-sweep", () => {
    // A sideways sweep near the bottom of a phone is not a straight line.
    expect(at(118, -40)).toBe(2);
    expect(at(118, SIZE + 40)).toBe(2);
  });

  /**
   * Straight up is how a thumb backs out of a gesture. Checking x alone meant
   * lifting up there still committed the switch.
   */
  it("cancels once the finger is clearly away from the bar", () => {
    expect(at(118, -120)).toBeNull();
    expect(at(118, SIZE + 120)).toBeNull();
  });

  it("still cancels sideways, whatever the height", () => {
    expect(at(-200, SIZE / 2)).toBeNull();
    expect(at(900, SIZE / 2)).toBeNull();
  });
});
