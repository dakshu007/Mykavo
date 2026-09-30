import { describe, expect, it } from "vitest";
import { scoreChange } from "@mykavo/severity-engine";
import { isPageRedesign, siteRedesignSignal } from "./redesign";

describe("isPageRedesign", () => {
  it("flags a page whose look, text and markup all changed", () => {
    expect(
      isPageRedesign({ contentPercentage: 65, pixelPercentage: 80, textChanged: true, domChanged: true }),
    ).toBe(true);
  });

  it("does not call a busy page with only markup churn a redesign", () => {
    // A slider caught on another slide: pixels and markup moved, words did not.
    expect(
      isPageRedesign({ contentPercentage: 45, pixelPercentage: 70, textChanged: false, domChanged: true }),
    ).toBe(false);
  });

  it("accepts a moderate content score when nearly every pixel changed", () => {
    expect(
      isPageRedesign({ contentPercentage: 25, pixelPercentage: 60, textChanged: true, domChanged: true }),
    ).toBe(true);
  });

  it("does not call a big visual change with identical text and markup a redesign", () => {
    // A carousel image rotating: pixels moved, nothing was rebuilt.
    expect(
      isPageRedesign({ contentPercentage: 55, pixelPercentage: 60, textChanged: false, domChanged: false }),
    ).toBe(false);
  });

  it("does not call a routine edit a redesign", () => {
    // New paragraph near the top: text and DOM change, content score small.
    expect(
      isPageRedesign({ contentPercentage: 8, pixelPercentage: 70, textChanged: true, domChanged: true }),
    ).toBe(false);
  });
});

describe("redesign severity", () => {
  it("never scores a redesigned page below HIGH, so it always notifies", () => {
    const scored = scoreChange({ kind: "visual_diff", percentage: 22, redesign: true })!;
    expect(scored.severity).toBe("HIGH");
    expect(scored.changeType).toBe("page_redesigned");
    expect(scored.notify).toBe(true);
  });

  it("scores a heavily redesigned page CRITICAL", () => {
    expect(scoreChange({ kind: "visual_diff", percentage: 70, redesign: true })!.severity).toBe("CRITICAL");
  });
});

describe("siteRedesignSignal", () => {
  it("raises one CRITICAL headline when most pages were redesigned together", () => {
    const signal = siteRedesignSignal(8, 10)!;
    const scored = scoreChange(signal)!;
    expect(scored.severity).toBe("CRITICAL");
    expect(scored.title).toContain("8 of 10 pages");
  });

  it("stays quiet when only a minority of pages changed", () => {
    expect(siteRedesignSignal(2, 10)).toBeNull();
  });

  it("leaves a one-page site to its per-page event", () => {
    expect(siteRedesignSignal(1, 1)).toBeNull();
  });
});
