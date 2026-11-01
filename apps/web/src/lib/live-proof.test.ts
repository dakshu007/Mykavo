import { describe, expect, it } from "vitest";
import { agoLabel, proofLabel, siteKind } from "./live-proof";

describe("proofLabel", () => {
  it("names the change in plain words, never with page text", () => {
    expect(proofLabel("conversion_element_missing", "CONVERSION")).toBe("Buy button or form went missing");
    expect(proofLabel("robots_txt_blocks_all", "SEO")).toBe("robots.txt started blocking the site");
    expect(proofLabel("canonical_removed", "SEO")).toBe("Canonical tag removed");
    expect(proofLabel("script_removed", "SCRIPT")).toBe("Tracking script removed");
  });
  it("falls back to the category, then to a generic line", () => {
    expect(proofLabel("something_new", "LINKS")).toBe("Links broke");
    expect(proofLabel("something_new", "UNKNOWN")).toBe("Important change caught");
  });
});

describe("siteKind", () => {
  it("says what kind of site, not which", () => {
    expect(siteKind(["wordpress"])).toBe("WordPress site");
    expect(siteKind(["shopify"])).toBe("Shopify store");
    expect(siteKind([])).toBe("Website");
  });
});

describe("agoLabel", () => {
  const now = new Date("2026-11-02T12:00:00Z");
  it("reads like a person would say it", () => {
    expect(agoLabel(new Date("2026-11-02T11:59:30Z"), now)).toBe("just now");
    expect(agoLabel(new Date("2026-11-02T11:25:00Z"), now)).toBe("35m ago");
    expect(agoLabel(new Date("2026-11-02T07:00:00Z"), now)).toBe("5h ago");
    expect(agoLabel(new Date("2026-11-01T10:00:00Z"), now)).toBe("yesterday");
    expect(agoLabel(new Date("2026-10-29T12:00:00Z"), now)).toBe("4 days ago");
  });
});
