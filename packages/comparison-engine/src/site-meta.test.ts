import { describe, expect, it } from "vitest";
import {
  compareSiteMeta,
  parseSitemap,
  robotsBlocksAll,
  type SiteMetaComparable,
} from "./site-meta";

describe("robotsBlocksAll", () => {
  it("detects a full block for all crawlers", () => {
    expect(robotsBlocksAll("User-agent: *\nDisallow: /")).toBe(true);
  });

  it("is case-insensitive and tolerates whitespace/comments", () => {
    // Lenient like real-world parsers: whitespace around ":" still counts.
    expect(
      robotsBlocksAll("# maintenance\nUSER-AGENT:   *   \n DISALLOW :  / # todo"),
    ).toBe(true);
    expect(robotsBlocksAll("# lockdown\nuser-agent: *\ndisallow: /")).toBe(true);
  });

  it("does not flag normal partial disallows", () => {
    expect(robotsBlocksAll("User-agent: *\nDisallow: /admin/\nDisallow: /tmp/")).toBe(false);
    expect(robotsBlocksAll("User-agent: *\nDisallow:")).toBe(false);
  });

  it("does not flag agent-specific blocks", () => {
    expect(robotsBlocksAll("User-agent: BadBot\nDisallow: /")).toBe(false);
  });

  it("handles stacked user-agent lines forming one group", () => {
    expect(robotsBlocksAll("User-agent: BadBot\nUser-agent: *\nDisallow: /")).toBe(true);
  });

  it("respects Allow: / softening the block", () => {
    expect(robotsBlocksAll("User-agent: *\nDisallow: /\nAllow: /")).toBe(false);
  });

  it("finds the block in any group among several", () => {
    const content = "User-agent: Googlebot\nDisallow: /private/\n\nUser-agent: *\nDisallow: /";
    expect(robotsBlocksAll(content)).toBe(true);
  });

  it("returns false for empty or comment-only files", () => {
    expect(robotsBlocksAll("")).toBe(false);
    expect(robotsBlocksAll("# nothing here")).toBe(false);
  });
});

describe("parseSitemap", () => {
  it("counts urlset locs", () => {
    const xml = `<?xml version="1.0"?><urlset xmlns="x"><url><loc>https://a/1</loc></url><url><loc> https://a/2 </loc></url></urlset>`;
    expect(parseSitemap(xml)).toEqual({ kind: "urlset", count: 2 });
  });

  it("lists index children", () => {
    const xml = `<sitemapindex><sitemap><loc>https://a/s1.xml</loc></sitemap><sitemap><loc>https://a/s2.xml</loc></sitemap></sitemapindex>`;
    expect(parseSitemap(xml)).toEqual({
      kind: "index",
      children: ["https://a/s1.xml", "https://a/s2.xml"],
    });
  });

  it("marks non-sitemap content invalid", () => {
    expect(parseSitemap("<html><body>404</body></html>")).toEqual({ kind: "invalid" });
  });
});

function meta(overrides: Partial<SiteMetaComparable>): SiteMetaComparable {
  return {
    robotsTxtStatus: 200,
    robotsTxtContent: "User-agent: *\nDisallow: /admin/",
    robotsTxtHash: "hash-a",
    sitemapUrl: "https://example.com/sitemap.xml",
    sitemapStatus: 200,
    sitemapUrlCount: 100,
    sitemapHash: "map-a",
    ...overrides,
  };
}

describe("compareSiteMeta", () => {
  it("produces nothing on the first capture (no previous)", () => {
    expect(compareSiteMeta(null, meta({}))).toEqual([]);
  });

  it("produces nothing when nothing changed", () => {
    expect(compareSiteMeta(meta({}), meta({}))).toEqual([]);
  });

  it("flags robots.txt disappearing", () => {
    const changes = compareSiteMeta(meta({}), meta({ robotsTxtStatus: 404, robotsTxtContent: null, robotsTxtHash: null }));
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("robots_txt_removed");
  });

  it("flags a robots.txt that newly blocks all crawlers as CRITICAL", () => {
    const changes = compareSiteMeta(
      meta({}),
      meta({ robotsTxtContent: "User-agent: *\nDisallow: /", robotsTxtHash: "hash-b" }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("robots_txt_blocks_all");
    expect(changes[0].severity).toBe("CRITICAL");
  });

  it("flags ordinary robots.txt edits at lower severity", () => {
    const changes = compareSiteMeta(
      meta({}),
      meta({ robotsTxtContent: "User-agent: *\nDisallow: /tmp/", robotsTxtHash: "hash-b" }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("robots_txt_changed");
    expect(changes[0].severity).not.toBe("CRITICAL");
  });

  it("does not re-alert when robots.txt already blocked everything", () => {
    const blocking = "User-agent: *\nDisallow: /";
    const changes = compareSiteMeta(
      meta({ robotsTxtContent: blocking, robotsTxtHash: "hash-b" }),
      meta({ robotsTxtContent: blocking + "\n# note", robotsTxtHash: "hash-c" }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("robots_txt_changed"); // changed, not blocks_all
  });

  it("flags a vanished sitemap", () => {
    const changes = compareSiteMeta(meta({}), meta({ sitemapStatus: 404, sitemapUrlCount: null, sitemapHash: null }));
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("sitemap_removed");
  });

  it("flags a >50% sitemap shrink when previously substantial", () => {
    const changes = compareSiteMeta(meta({}), meta({ sitemapUrlCount: 12, sitemapHash: "map-b" }));
    expect(changes).toHaveLength(1);
    expect(changes[0].changeType).toBe("sitemap_shrank");
  });

  it("treats small sitemaps and mild churn as low-noise content changes", () => {
    const small = compareSiteMeta(
      meta({ sitemapUrlCount: 4 }),
      meta({ sitemapUrlCount: 1, sitemapHash: "map-b" }),
    );
    expect(small).toHaveLength(1);
    expect(small[0].changeType).toBe("sitemap_content_changed");
    expect(small[0].severity).toBe("INFO");
  });
});
