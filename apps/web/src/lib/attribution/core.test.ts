import { describe, expect, it } from "vitest";
import {
  cleanPath,
  cleanPlacement,
  cleanUtmValue,
  ctaPlacement,
  decodeFirstTouch,
  decodeUtm,
  encodeFirstTouch,
  encodeUtm,
  isAppPath,
  pageSlug,
  pageTypeOf,
  parseUtm,
  referrerHost,
  sectionSlug,
} from "./core";

describe("attribution", () => {
  it("keeps only a clean path", () => {
    expect(cleanPath("/blog/seo-tools?utm=x#top")).toBe("/blog/seo-tools");
    expect(cleanPath("//evil.example/x")).toBe("/");
    expect(cleanPath("https://x.com")).toBe("/");
    expect(cleanPath("/a<script>")).toBe("/ascript");
  });

  it("reads the referring host and ignores our own", () => {
    expect(referrerHost("https://www.google.com/search?q=x", "mykavo.app")).toBe("www.google.com");
    expect(referrerHost("https://mykavo.app/blog", "mykavo.app")).toBe("");
    expect(referrerHost("", "mykavo.app")).toBe("");
    expect(referrerHost("not a url", "mykavo.app")).toBe("");
  });

  it("sanitises CTA placements", () => {
    expect(cleanPlacement("blog:mid-tool")).toBe("blog:mid-tool");
    expect(cleanPlacement("Tool Results <b>")).toBe("toolresultsb");
    expect(cleanPlacement("")).toBeNull();
    expect(cleanPlacement(null)).toBeNull();
  });

  it("round-trips the first-touch cookie and rejects junk", () => {
    const raw = encodeFirstTouch({ landing: "/tools/script-detector", referrer: "www.google.com" });
    expect(decodeFirstTouch(raw)).toEqual({ landing: "/tools/script-detector", referrer: "www.google.com" });
    expect(decodeFirstTouch("%7Bbad")).toBeNull();
    expect(decodeFirstTouch(undefined)).toBeNull();
  });

  it("knows app paths are not landing pages", () => {
    expect(isAppPath("/dashboard/websites")).toBe(true);
    expect(isAppPath("/blog")).toBe(false);
    expect(isAppPath("/")).toBe(false);
  });

  it("reads, cleans and round-trips UTM tags", () => {
    expect(parseUtm("?utm_source=Instagram&utm_medium=Social&utm_campaign=Black%20Friday&x=1")).toEqual({
      source: "instagram",
      medium: "social",
      campaign: "black friday",
    });
    expect(parseUtm("?x=1")).toBeNull();
    expect(parseUtm("?utm_source=<script>")).toEqual({ source: "script" });
    const utm = { source: "newsletter", content: "hero" };
    expect(decodeUtm(encodeUtm(utm))).toEqual(utm);
    expect(decodeUtm("%7Bbad")).toBeNull();
    expect(cleanUtmValue("x".repeat(300))).toHaveLength(100);
  });

  it("names pages and sections for CTA placements", () => {
    expect(pageSlug("/")).toBe("home");
    expect(pageSlug("/blog/wordpress-memory-limit?x=1")).toBe("blog-wordpress-memory-limit");
    expect(sectionSlug("What $10 a month gets you")).toBe("what-10-a-month-gets-you");
    expect(sectionSlug("!!!")).toBe("section");
    const placement = ctaPlacement("/blog/a-very-long-blog-post-slug-about-wordpress-memory-limits", "Frequently asked questions");
    expect(placement.length).toBeLessThanOrEqual(60);
    expect(cleanPlacement(placement)).toBe(placement);
    expect(ctaPlacement("/pricing", "hero")).toBe("pricing:hero");
  });

  it("groups pages by type", () => {
    expect(pageTypeOf("/")).toBe("home");
    expect(pageTypeOf("/blog")).toBe("blog_index");
    expect(pageTypeOf("/blog/wordpress-memory-limit")).toBe("blog_post");
    expect(pageTypeOf("/tools/broken-link-checker")).toBe("tool");
    expect(pageTypeOf("/pricing")).toBe("pricing");
    expect(pageTypeOf("/visualping-alternative")).toBe("comparison");
    expect(pageTypeOf("/black-friday")).toBe("page");
  });
});

