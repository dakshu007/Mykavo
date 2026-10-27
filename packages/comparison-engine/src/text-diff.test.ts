import { describe, expect, it } from "vitest";
import { describeTextDiff, diffTextLines } from "./text-diff";

describe("diffTextLines", () => {
  it("reports a replaced line as one removed and one added", () => {
    const diff = diffTextLines(
      ["Pricing", "Start your 14-day free trial", "Cancel anytime"],
      ["Pricing", "Start your 7-day free trial", "Cancel anytime"],
    );
    expect(diff).toMatchObject({
      removed: ["Start your 14-day free trial"],
      added: ["Start your 7-day free trial"],
      removedCount: 1,
      addedCount: 1,
      reordered: false,
    });
    expect(describeTextDiff(diff)).toBe(
      '"Start your 14-day free trial" was replaced with "Start your 7-day free trial".',
    );
  });

  it("does not report lines that only moved because something was inserted above them", () => {
    const diff = diffTextLines(["A", "B", "C"], ["New banner", "A", "B", "C"]);
    expect(diff.removed).toEqual([]);
    expect(diff.added).toEqual(["New banner"]);
  });

  it("counts repeated lines individually", () => {
    const diff = diffTextLines(["Buy now", "Buy now"], ["Buy now"]);
    expect(diff.removed).toEqual(["Buy now"]);
    expect(diff.removedCount).toBe(1);
  });

  it("recognises a pure reorder", () => {
    const diff = diffTextLines(["A", "B"], ["B", "A"]);
    expect(diff).toMatchObject({ removedCount: 0, addedCount: 0, reordered: true });
    expect(describeTextDiff(diff)).toBe("The same text is on the page, in a different order.");
  });

  it("caps the stored lines but keeps the true totals", () => {
    const after = Array.from({ length: 100 }, (_, i) => `Line ${i}`);
    const diff = diffTextLines([], after, 40);
    expect(diff.added).toHaveLength(40);
    expect(diff.addedCount).toBe(100);
    expect(describeTextDiff(diff)).toBe('100 lines added. New text includes "Line 0".');
  });

  it("clips very long lines", () => {
    const diff = diffTextLines([], ["x".repeat(1000)]);
    expect(diff.added[0]).toHaveLength(300);
  });
});
