/**
 * Pure parsing helpers for page discovery (spec §13).
 * Dependency-free so they are trivially unit-testable.
 */

import { isSameOrigin, normalizeUrl, resolveHref } from "@/lib/url";

/** Extract declared sitemap URLs from robots.txt content. */
export function parseRobotsSitemaps(robotsTxt: string, baseUrl: string): string[] {
  const sitemaps: string[] = [];
  for (const line of robotsTxt.split(/\r?\n/)) {
    const match = line.match(/^\s*sitemap\s*:\s*(\S+)\s*$/i);
    if (!match) continue;
    const resolved = resolveHref(match[1], baseUrl);
    if (resolved && (resolved.protocol === "http:" || resolved.protocol === "https:")) {
      sitemaps.push(resolved.href);
    }
  }
  return [...new Set(sitemaps)];
}

export interface ParsedSitemap {
  /** True when the document is a sitemap index (children are sitemaps). */
  isIndex: boolean;
  /** <loc> values: page URLs for urlsets, child sitemap URLs for indexes. */
  locs: string[];
}

/** Parse a sitemap XML document (urlset or sitemapindex). Regex-based. */
export function parseSitemapXml(xml: string): ParsedSitemap {
  const isIndex = /<sitemapindex[\s>]/i.test(xml);
  const locs: string[] = [];
  for (const match of xml.matchAll(/<loc>\s*([\s\S]*?)\s*<\/loc>/gi)) {
    const value = match[1]
      .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#0?39;|&apos;/g, "'")
      .trim();
    if (value) locs.push(value);
  }
  return { isIndex, locs: [...new Set(locs)] };
}

/** Extract same-origin page URLs from an HTML document's anchor tags. */
export function extractInternalLinks(html: string, baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const urls = new Set<string>();
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const hrefMatch = tag.match(/href\s*=\s*("([^"]*)"|'([^']*)'|([^\s>]+))/i);
    if (!hrefMatch) continue;
    const href = (hrefMatch[2] ?? hrefMatch[3] ?? hrefMatch[4] ?? "").trim();
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const resolved = resolveHref(href, baseUrl);
    if (!resolved) continue;
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
    if (!isSameOrigin(resolved, base)) continue;
    // Skip obvious non-page resources.
    if (/\.(png|jpe?g|gif|svg|webp|ico|css|js|pdf|zip|xml|json|mp4|webm|woff2?)$/i.test(resolved.pathname)) {
      continue;
    }
    urls.add(normalizeUrl(resolved));
  }
  return [...urls];
}

/**
 * Filter candidate URLs (e.g. sitemap <loc> values) to same-origin pages,
 * normalized and deduplicated. Candidates must be absolute URLs — relative
 * or malformed values are dropped rather than resolved.
 */
export function toSameOriginPages(candidates: string[], baseUrl: string): string[] {
  const base = new URL(baseUrl);
  const urls = new Set<string>();
  for (const candidate of candidates) {
    let resolved: URL;
    try {
      resolved = new URL(candidate);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
    if (!isSameOrigin(resolved, base)) continue;
    urls.add(normalizeUrl(resolved));
  }
  return [...urls];
}
