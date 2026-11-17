import { describe, expect, it } from "vitest";
import { noBreakHyphens, splitTitle } from "./blog-title";

describe("splitTitle", () => {
  it("moves a trailing bracket to its own part", () => {
    expect(splitTitle("How to Safely Update WordPress Plugins (+ 12-Point Checklist)")).toEqual({
      main: "How to Safely Update WordPress Plugins",
      aside: "(+ 12-Point Checklist)",
    });
  });

  it("leaves titles without a trailing bracket alone", () => {
    expect(splitTitle("Autoblogging: How It Works")).toEqual({ main: "Autoblogging: How It Works", aside: null });
    expect(splitTitle("The (Not So) Simple Guide")).toEqual({ main: "The (Not So) Simple Guide", aside: null });
  });

  it("does not split a title that is almost all bracket", () => {
    expect(splitTitle("FAQ (2026)").aside).toBeNull();
  });

  it("keeps hyphenated words together", () => {
    expect(noBreakHyphens("12-Point")).toBe("12‑Point");
  });
});
