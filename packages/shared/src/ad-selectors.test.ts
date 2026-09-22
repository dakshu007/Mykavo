import { describe, expect, it } from "vitest";
import { DEFAULT_AD_MASK_SELECTORS, withDefaultAdMasks } from "./ad-selectors";

describe("withDefaultAdMasks", () => {
  it("adds the defaults to an empty configuration", () => {
    expect(withDefaultAdMasks([])).toEqual([...DEFAULT_AD_MASK_SELECTORS]);
  });

  it("keeps the customer's own selectors first", () => {
    const out = withDefaultAdMasks([".my-ticker", "#promo"]);
    expect(out[0]).toBe(".my-ticker");
    expect(out[1]).toBe("#promo");
    expect(out).toContain("ins.adsbygoogle");
  });

  it("does not duplicate a selector the customer already added", () => {
    const out = withDefaultAdMasks(["ins.adsbygoogle"]);
    expect(out.filter((s) => s === "ins.adsbygoogle")).toHaveLength(1);
  });

  it("drops blanks rather than passing an empty selector to the browser", () => {
    expect(withDefaultAdMasks(["", "   "])).toEqual([...DEFAULT_AD_MASK_SELECTORS]);
  });
});

describe("the default selector list", () => {
  /**
   * THE FAILURE THIS GUARDS AGAINST.
   *
   * A broad substring selector is the obvious way to catch ad slots and the
   * fastest way to blank out real content: `[class*="ad"]` matches header,
   * badge, shadow, loading and download. Masking those would paint over the
   * page and then report that nothing changed - silently worse than the
   * noise being fixed.
   */
  it("has no substring matcher on class or id", () => {
    for (const selector of DEFAULT_AD_MASK_SELECTORS) {
      expect(selector, `${selector} uses a substring match`).not.toMatch(
        /\[(class|id)\*=/,
      );
    }
  });

  it("only substring-matches on src, where the host is unambiguous", () => {
    for (const selector of DEFAULT_AD_MASK_SELECTORS) {
      if (selector.includes("*=")) {
        expect(selector, `${selector} substring-matches a risky attribute`).toMatch(
          /\[src\*=/,
        );
      }
    }
  });

  it("would not match ordinary page furniture", () => {
    // Class names that a careless list would swallow.
    const innocent = ["header", "badge", "shadow", "loading", "download", "gradient"];
    for (const name of innocent) {
      for (const selector of DEFAULT_AD_MASK_SELECTORS) {
        const prefix = selector.match(/\[class\^="([^"]+)"\]/)?.[1];
        if (prefix) expect(name.startsWith(prefix)).toBe(false);
      }
    }
  });

  it("has no duplicates", () => {
    expect(new Set(DEFAULT_AD_MASK_SELECTORS).size).toBe(
      DEFAULT_AD_MASK_SELECTORS.length,
    );
  });
});
