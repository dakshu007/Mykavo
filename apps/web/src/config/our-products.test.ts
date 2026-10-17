import { describe, expect, it } from "vitest";
import { OUR_PRODUCTS, ourProductsByKind, productHref } from "./our-products";

describe("our products config", () => {
  it("lists two apps and three Chrome extensions", () => {
    expect(ourProductsByKind("app").map((p) => p.slug)).toEqual(["billzap", "shrinkto"]);
    expect(ourProductsByKind("extension").map((p) => p.slug)).toEqual([
      "image-size-inspector",
      "spacing-inspector",
      "eeat-analyser",
    ]);
  });

  it("has unique slugs and https URLs", () => {
    const slugs = OUR_PRODUCTS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const p of OUR_PRODUCTS) expect(new URL(p.url).protocol).toBe("https:");
  });

  it("keeps copy free of em and en dashes", () => {
    for (const p of OUR_PRODUCTS) {
      expect(p.description).not.toMatch(/[–—]/);
      expect(p.name).not.toMatch(/[–—]/);
    }
  });

  it("tags links with ref=mykavo", () => {
    expect(productHref({ url: "https://billzap.app/" })).toBe("https://billzap.app/?ref=mykavo");
  });

  it("keeps an existing query and replaces an existing ref", () => {
    expect(productHref({ url: "https://example.com/a?x=1" })).toBe("https://example.com/a?x=1&ref=mykavo");
    expect(productHref({ url: "https://example.com/?ref=old&y=2" })).toBe(
      "https://example.com/?ref=mykavo&y=2",
    );
  });

  it("keeps a hash after the query", () => {
    expect(productHref({ url: "https://example.com/p#top" })).toBe("https://example.com/p?ref=mykavo#top");
  });
});
