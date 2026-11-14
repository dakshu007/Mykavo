import { describe, expect, it } from "vitest";
import { buildUtmUrl, UTM_PRESETS, utmToken } from "./utm-links";
import { parseUtm } from "./attribution/core";

describe("UTM links", () => {
  it("tags any page and lands on a section", () => {
    expect(
      buildUtmUrl({ path: "/blog/wordpress-memory-limit", source: "LinkedIn", medium: "social", campaign: "WordPress fixes", section: "#how-to-fix-it" }),
    ).toBe(
      "https://mykavo.app/blog/wordpress-memory-limit?utm_source=linkedin&utm_medium=social&utm_campaign=wordpress-fixes#how-to-fix-it",
    );
  });

  it("adds content and term only when given, and accepts a full URL", () => {
    const url = buildUtmUrl({ path: "https://mykavo.app/pricing", source: "google", medium: "cpc", campaign: "brand", content: "ad-1", term: "website monitoring" });
    expect(url).toBe("https://mykavo.app/pricing?utm_source=google&utm_medium=cpc&utm_campaign=brand&utm_content=ad-1&utm_term=website-monitoring");
  });

  it("needs source, medium and campaign", () => {
    expect(buildUtmUrl({ path: "/", source: "", medium: "social", campaign: "x" })).toBeNull();
    expect(buildUtmUrl({ path: "/", source: "x", medium: "social", campaign: "" })).toBeNull();
  });

  it("produces tags the site reads back unchanged", () => {
    const url = buildUtmUrl({ path: "/", source: "Newsletter", medium: "email", campaign: "Nov 2026", content: "hero" })!;
    expect(parseUtm(new URL(url).search)).toEqual({ source: "newsletter", medium: "email", campaign: "nov-2026", content: "hero" });
  });

  it("strips junk from tokens and section anchors", () => {
    expect(utmToken(" Black Friday <b> ")).toBe("black-friday-b");
    expect(buildUtmUrl({ path: "/", source: "a", medium: "b", campaign: "c", section: "faq\"><script>" })).toBe(
      "https://mykavo.app/?utm_source=a&utm_medium=b&utm_campaign=c#faqscript",
    );
  });

  it("has one preset per channel", () => {
    expect(new Set(UTM_PRESETS.map((p) => p.id)).size).toBe(UTM_PRESETS.length);
  });
});
