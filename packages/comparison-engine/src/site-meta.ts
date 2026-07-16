/**
 * Site-level SEO comparators: robots.txt + sitemap.xml (spec §19 family,
 * "robots.txt Monitoring" / "Sitemap Monitoring" scenarios). Pure functions —
 * the worker does the fetching, these decide what changed; severity and copy
 * come from @mykavo/severity-engine like every other signal.
 */

import { scoreChange, type ChangeSignal, type ScoredChange } from "@mykavo/severity-engine";

/** One scan's captured robots.txt + sitemap state (SiteMetaSnapshot row). */
export interface SiteMetaComparable {
  robotsTxtStatus: number | null;
  robotsTxtContent: string | null;
  robotsTxtHash: string | null;
  sitemapUrl: string | null;
  sitemapStatus: number | null;
  sitemapUrlCount: number | null;
  sitemapHash: string | null;
}

/**
 * Does this robots.txt block ALL crawling for every crawler? True only when a
 * `User-agent: *` group contains `Disallow: /` (the whole site) and no
 * `Allow: /` softens it. Deliberately conservative — this drives a CRITICAL
 * alert and false positives are poison (spec §4.5). Agent-specific groups
 * (e.g. only Googlebot blocked) do NOT count as blocking all.
 */
export function robotsBlocksAll(content: string): boolean {
  // Groups are runs of User-agent lines followed by rules (RFC 9309).
  let agents: string[] = [];
  let lastWasAgent = false;
  let starDisallowedAll = false;
  let starAllowedRoot = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    if (line.length === 0) continue;
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === "user-agent") {
      if (!lastWasAgent) agents = [];
      agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;

    if (!agents.includes("*")) continue;
    if (field === "disallow" && value === "/") starDisallowedAll = true;
    if (field === "allow" && value === "/") starAllowedRoot = true;
  }

  return starDisallowedAll && !starAllowedRoot;
}

export type ParsedSitemap =
  | { kind: "urlset"; count: number }
  | { kind: "index"; children: string[] }
  | { kind: "invalid" };

/**
 * Minimal sitemap parse: count `<loc>` entries in a urlset, or list child
 * sitemaps in a sitemap index. Regex-based on purpose — sitemaps in the wild
 * are frequently malformed, and we only need counts, never the URLs' content.
 */
export function parseSitemap(xml: string): ParsedSitemap {
  const locs = [...xml.matchAll(/<loc>\s*([^<]*?)\s*<\/loc>/gi)].map((m) => m[1]);
  if (/<sitemapindex[\s>]/i.test(xml)) {
    return { kind: "index", children: locs.filter((l) => l.length > 0) };
  }
  if (/<urlset[\s>]/i.test(xml)) {
    return { kind: "urlset", count: locs.length };
  }
  return { kind: "invalid" };
}

const OK = (status: number | null): boolean => status !== null && status >= 200 && status < 300;

/** Sitemap shrank enough to alert: previous ≥ 10 URLs and a >50% drop. */
const SIGNIFICANT_SHRINK_MIN_PREVIOUS = 10;

/**
 * Compare two site-meta captures. `previous` is the most recent earlier
 * capture (site meta has no user-approved baseline concept); null on a
 * website's first capture — which produces no signals (baseline behavior).
 */
export function compareSiteMeta(
  previous: SiteMetaComparable | null,
  current: SiteMetaComparable,
): ScoredChange[] {
  if (!previous) return [];

  const signals: ChangeSignal[] = [];

  // robots.txt
  const hadRobots = OK(previous.robotsTxtStatus);
  const hasRobots = OK(current.robotsTxtStatus);
  if (hadRobots && !hasRobots) {
    signals.push({
      kind: "robots_txt_removed",
      previousStatus: previous.robotsTxtStatus as number,
      currentStatus: current.robotsTxtStatus,
    });
  } else if (hasRobots && (!hadRobots || previous.robotsTxtHash !== current.robotsTxtHash)) {
    const previousBlocked =
      hadRobots && previous.robotsTxtContent !== null
        ? robotsBlocksAll(previous.robotsTxtContent)
        : false;
    const currentBlocked =
      current.robotsTxtContent !== null ? robotsBlocksAll(current.robotsTxtContent) : false;
    signals.push({
      kind: "robots_txt_changed",
      appeared: !hadRobots,
      newlyBlocksAll: currentBlocked && !previousBlocked,
      previous: previous.robotsTxtContent,
      current: current.robotsTxtContent,
    });
  }

  // sitemap
  const hadSitemap = OK(previous.sitemapStatus);
  const hasSitemap = OK(current.sitemapStatus);
  const sitemapUrl = current.sitemapUrl ?? previous.sitemapUrl ?? "sitemap.xml";
  if (hadSitemap && !hasSitemap) {
    signals.push({
      kind: "sitemap_removed",
      sitemapUrl,
      currentStatus: current.sitemapStatus,
    });
  } else if (
    hadSitemap &&
    hasSitemap &&
    previous.sitemapUrlCount !== null &&
    current.sitemapUrlCount !== null &&
    previous.sitemapUrlCount >= SIGNIFICANT_SHRINK_MIN_PREVIOUS &&
    current.sitemapUrlCount < previous.sitemapUrlCount / 2
  ) {
    signals.push({
      kind: "sitemap_url_count",
      previous: previous.sitemapUrlCount,
      current: current.sitemapUrlCount,
      sitemapUrl,
    });
  } else if (hadSitemap && hasSitemap && previous.sitemapHash !== current.sitemapHash) {
    signals.push({ kind: "sitemap_content_changed", sitemapUrl });
  }

  return signals
    .map(scoreChange)
    .filter((change): change is ScoredChange => change !== null);
}
