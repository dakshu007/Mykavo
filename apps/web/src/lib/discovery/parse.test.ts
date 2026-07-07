import { describe, expect, it } from "vitest";
import {
  extractInternalLinks,
  parseRobotsSitemaps,
  parseSitemapXml,
  toSameOriginPages,
} from "./parse";

const BASE = "https://example.com/";

describe("parseRobotsSitemaps", () => {
  it("extracts sitemap declarations case-insensitively", () => {
    const robots = [
      "User-agent: *",
      "Disallow: /admin",
      "Sitemap: https://example.com/sitemap.xml",
      "sitemap:https://example.com/sitemap-news.xml",
      "SITEMAP:   https://example.com/sitemap-2.xml",
    ].join("\n");
    expect(parseRobotsSitemaps(robots, BASE)).toEqual([
      "https://example.com/sitemap.xml",
      "https://example.com/sitemap-news.xml",
      "https://example.com/sitemap-2.xml",
    ]);
  });

  it("resolves relative sitemap paths and dedupes", () => {
    const robots = "Sitemap: /sitemap.xml\nSitemap: /sitemap.xml";
    expect(parseRobotsSitemaps(robots, BASE)).toEqual(["https://example.com/sitemap.xml"]);
  });

  it("returns empty for robots without sitemaps", () => {
    expect(parseRobotsSitemaps("User-agent: *\nDisallow:", BASE)).toEqual([]);
  });
});

describe("parseSitemapXml", () => {
  it("parses a urlset", () => {
    const xml = `<?xml version="1.0"?>
      <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <url><loc>https://example.com/</loc></url>
        <url><loc> https://example.com/pricing </loc></url>
      </urlset>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.isIndex).toBe(false);
    expect(parsed.locs).toEqual(["https://example.com/", "https://example.com/pricing"]);
  });

  it("detects sitemap indexes", () => {
    const xml = `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
        <sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap>
        <sitemap><loc>https://example.com/sitemap-2.xml</loc></sitemap>
      </sitemapindex>`;
    const parsed = parseSitemapXml(xml);
    expect(parsed.isIndex).toBe(true);
    expect(parsed.locs).toHaveLength(2);
  });

  it("handles CDATA and entities in loc values", () => {
    const xml = `<urlset>
        <url><loc><![CDATA[https://example.com/a?x=1&y=2]]></loc></url>
        <url><loc>https://example.com/b?x=1&amp;y=2</loc></url>
      </urlset>`;
    expect(parseSitemapXml(xml).locs).toEqual([
      "https://example.com/a?x=1&y=2",
      "https://example.com/b?x=1&y=2",
    ]);
  });
});

describe("extractInternalLinks", () => {
  const html = `
    <a href="/about">About</a>
    <a href="/pricing/">Pricing</a>
    <a href="https://example.com/blog">Blog</a>
    <a href="https://other.com/external">External</a>
    <a href="#anchor">Anchor</a>
    <a href="mailto:hi@example.com">Mail</a>
    <a href="/logo.png">Image</a>
    <a href='/single-quotes'>SQ</a>
  `;

  it("keeps same-origin page links, normalized and deduplicated", () => {
    const links = extractInternalLinks(html, BASE);
    expect(links).toContain("https://example.com/about");
    expect(links).toContain("https://example.com/pricing");
    expect(links).toContain("https://example.com/blog");
    expect(links).toContain("https://example.com/single-quotes");
  });

  it("drops external links, anchors, mailto, and asset files", () => {
    const links = extractInternalLinks(html, BASE);
    expect(links.some((l) => l.includes("other.com"))).toBe(false);
    expect(links.some((l) => l.includes("#"))).toBe(false);
    expect(links.some((l) => l.includes("mailto"))).toBe(false);
    expect(links.some((l) => l.endsWith(".png"))).toBe(false);
  });
});

describe("toSameOriginPages", () => {
  it("filters cross-origin candidates and normalizes survivors", () => {
    const result = toSameOriginPages(
      [
        "https://example.com/a/",
        "https://EXAMPLE.com/b#frag",
        "https://sub.example.com/c",
        "not a url",
      ],
      BASE,
    );
    expect(result).toEqual(["https://example.com/a", "https://example.com/b"]);
  });
});
