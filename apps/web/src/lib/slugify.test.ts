import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";
import { SLUG_PATTERN } from "./blog-validation";

describe("slugify", () => {
  it("lowercases and hyphenates words", () => {
    expect(slugify("Know What Changed")).toBe("know-what-changed");
  });

  it("collapses punctuation and consecutive separators into one hyphen", () => {
    expect(slugify("SEO — change   monitoring!!!")).toBe("seo-change-monitoring");
  });

  it("trims leading and trailing separators", () => {
    expect(slugify("  --Hello World--  ")).toBe("hello-world");
  });

  it("strips diacritics", () => {
    expect(slugify("Café régression überwachen")).toBe("cafe-regression-uberwachen");
  });

  it("keeps digits", () => {
    expect(slugify("Top 10 checks for 2026")).toBe("top-10-checks-for-2026");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(slugify("!!!***")).toBe("");
    expect(slugify("")).toBe("");
  });

  it("caps length without leaving a trailing hyphen", () => {
    const slug = slugify(`${"word ".repeat(40)}end`);
    expect(slug.length).toBeLessThanOrEqual(96);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("produces slugs matching the API slug pattern", () => {
    for (const title of ["Hello World", "A/B testing 101", "  Weird -- input  "]) {
      expect(slugify(title)).toMatch(SLUG_PATTERN);
    }
  });
});
