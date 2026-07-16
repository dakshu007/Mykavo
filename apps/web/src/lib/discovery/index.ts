/**
 * Page discovery orchestrator (spec §13). Order: homepage → robots.txt →
 * declared sitemaps (+ /sitemap.xml fallback) → sitemap indexes → homepage
 * internal links. Every fetch goes through the SSRF guard; hard caps keep
 * discovery bounded (no unlimited crawling, spec §62).
 */

import { safeFetch, UnsafeUrlError } from "@/lib/security/ssrf";
import { normalizeUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import {
  extractInternalLinks,
  parseRobotsSitemaps,
  parseSitemapXml,
  toSameOriginPages,
} from "./parse";

const MAX_SITEMAP_FETCHES = 5;
const MAX_DISCOVERED_URLS = 200;

export type PageSource = "homepage" | "sitemap" | "link";

export interface DiscoveredPage {
  url: string;
  source: PageSource;
}

export interface DiscoveryResult {
  pages: DiscoveredPage[];
  /** Non-fatal issues surfaced to the user (e.g. sitemap unreachable). */
  warnings: string[];
  /** True when we hit the discovery cap and more pages likely exist. */
  truncated: boolean;
  /**
   * The homepage URL after redirects (e.g. apex → www). Callers should
   * treat this as the website's canonical base for same-origin checks.
   */
  finalUrl: string;
}

export class DiscoveryError extends Error {
  constructor(
    public readonly code: "HOMEPAGE_UNREACHABLE" | "HOMEPAGE_ERROR_STATUS",
    message: string,
  ) {
    super(message);
    this.name = "DiscoveryError";
  }
}

export async function discoverPages(websiteUrl: string): Promise<DiscoveryResult> {
  const warnings: string[] = [];
  const pages = new Map<string, PageSource>();
  const log = logger.child({ module: "discovery" });

  // 1. Homepage - must be reachable for discovery to proceed.
  let homepage;
  try {
    homepage = await safeFetch(websiteUrl);
  } catch (err) {
    const message =
      err instanceof UnsafeUrlError ? err.message : "The website could not be reached.";
    throw new DiscoveryError("HOMEPAGE_UNREACHABLE", message);
  }
  if (homepage.status >= 400) {
    throw new DiscoveryError(
      "HOMEPAGE_ERROR_STATUS",
      `The homepage returned HTTP ${homepage.status}.`,
    );
  }

  const base = homepage.finalUrl;
  pages.set(normalizeUrl(base), "homepage");

  // 2–3. robots.txt → declared sitemaps.
  const origin = new URL(base).origin;
  let sitemapCandidates: string[] = [];
  try {
    const robots = await safeFetch(`${origin}/robots.txt`);
    if (robots.status === 200) {
      sitemapCandidates = parseRobotsSitemaps(robots.body, base);
    }
  } catch {
    // robots.txt unreachable - fine, fall back to the default location.
  }
  if (sitemapCandidates.length === 0) {
    sitemapCandidates = [`${origin}/sitemap.xml`];
  }

  // 4–6. Fetch sitemaps, expanding indexes, within a bounded fetch budget.
  const queue = [...sitemapCandidates];
  const fetched = new Set<string>();
  let sitemapFound = false;

  while (queue.length > 0 && fetched.size < MAX_SITEMAP_FETCHES) {
    const sitemapUrl = queue.shift()!;
    if (fetched.has(sitemapUrl)) continue;
    fetched.add(sitemapUrl);

    if (/\.gz($|\?)/i.test(sitemapUrl)) {
      warnings.push(`Skipped compressed sitemap: ${sitemapUrl}`);
      continue;
    }

    try {
      const res = await safeFetch(sitemapUrl);
      if (res.status !== 200) {
        if (!sitemapUrl.endsWith("/sitemap.xml")) {
          warnings.push(`Sitemap returned HTTP ${res.status}: ${sitemapUrl}`);
        }
        continue;
      }
      const parsed = parseSitemapXml(res.body);
      if (parsed.isIndex) {
        queue.push(...toSameOriginPages(parsed.locs, base).slice(0, MAX_SITEMAP_FETCHES));
      } else if (parsed.locs.length > 0) {
        sitemapFound = true;
        for (const url of toSameOriginPages(parsed.locs, base)) {
          if (pages.size >= MAX_DISCOVERED_URLS) break;
          if (!pages.has(url)) pages.set(url, "sitemap");
        }
      }
    } catch (err) {
      warnings.push(
        err instanceof UnsafeUrlError && err.code === "RESPONSE_TOO_LARGE"
          ? `Sitemap too large to read fully: ${sitemapUrl}`
          : `Could not read sitemap: ${sitemapUrl}`,
      );
    }
    if (pages.size >= MAX_DISCOVERED_URLS) break;
  }

  // 7. Homepage internal links - fills gaps for sites without sitemaps.
  if (pages.size < MAX_DISCOVERED_URLS) {
    for (const url of extractInternalLinks(homepage.body, base)) {
      if (pages.size >= MAX_DISCOVERED_URLS) break;
      if (!pages.has(url)) pages.set(url, "link");
    }
  }

  if (!sitemapFound) {
    warnings.push("No sitemap found - pages were discovered from homepage links.");
  }

  const truncated = pages.size >= MAX_DISCOVERED_URLS;
  log.info("discovery completed", {
    url: websiteUrl,
    pages: pages.size,
    sitemapsFetched: fetched.size,
    truncated,
  });

  // Homepage first, then shallow paths before deep ones, then alphabetical.
  const sorted = [...pages.entries()]
    .map(([url, source]) => ({ url, source }))
    .sort((a, b) => {
      if (a.source === "homepage") return -1;
      if (b.source === "homepage") return 1;
      const depthA = new URL(a.url).pathname.split("/").filter(Boolean).length;
      const depthB = new URL(b.url).pathname.split("/").filter(Boolean).length;
      return depthA - depthB || a.url.localeCompare(b.url);
    });

  return { pages: sorted, warnings, truncated, finalUrl: base };
}
