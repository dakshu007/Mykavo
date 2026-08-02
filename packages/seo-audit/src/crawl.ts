/**
 * The Site Audit crawler + site-level analysis. Fetch-only (no browser), so
 * a 1,500-page audit costs a few minutes of worker time and nothing else -
 * the zero-budget answer to Ahrefs/Semrush credits.
 *
 * Safety: every URL passes the shared SSRF validation, robots.txt is
 * respected, concurrency/size/duration are capped, and crawling never leaves
 * the start host.
 */

import { assertSafeUrl } from "@mykavo/shared/ssrf";
import { extractFacts, pageIssues, type PageFacts, type PageIssue } from "./page";
import { AUDIT_CHECKS, SEVERITY_ORDER, type AuditSeverity } from "./registry";

export interface CrawlLimits {
  maxPages: number;
  maxDurationMs: number;
  concurrency: number;
  maxHtmlBytes: number;
  /** External links to liveness-probe (sampled). */
  maxExternalProbes: number;
}

export const DEFAULT_LIMITS: CrawlLimits = {
  maxPages: 150,
  maxDurationMs: 10 * 60 * 1000,
  concurrency: 5,
  maxHtmlBytes: 2 * 1024 * 1024,
  maxExternalProbes: 100,
};

export interface AuditIssueGroup {
  checkId: string;
  count: number;
  /** Sampled affected URLs with optional details (capped for DB size). */
  urls: { url: string; detail?: string }[];
}

export interface AuditResult {
  pagesCrawled: number;
  urlsDiscovered: number;
  healthScore: number;
  errorCount: number;
  warningCount: number;
  noticeCount: number;
  pagesWithErrors: number;
  issues: AuditIssueGroup[];
  stoppedReason: "completed" | "page-limit" | "time-limit" | "blocked";
}

const URL_SAMPLE_CAP = 100;
const USER_AGENT = "Mozilla/5.0 (compatible; MyKavoAudit/1.0; +https://mykavo.app)";
const GENERIC_DIRECTIVE_BLOCK = /^user-agent:\s*\*/im;

interface Fetched {
  url: string;
  status: number;
  html: string;
  fetchMs: number;
  finalUrl: string;
  hops: number;
  headers: { contentEncoding: string | null; cacheControl: string | null; hsts: boolean };
  error?: string;
}

async function fetchPage(url: string, limits: CrawlLimits): Promise<Fetched> {
  const started = Date.now();
  try {
    await assertSafeUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      const res = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT, accept: "text/html,*/*;q=0.8" },
      });
      const fetchMs = Date.now() - started;
      const contentType = res.headers.get("content-type") ?? "";
      let html = "";
      if (contentType.includes("text/html") && res.status < 400) {
        const reader = res.body?.getReader();
        if (reader) {
          const chunks: Uint8Array[] = [];
          let total = 0;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            chunks.push(value);
            if (total > limits.maxHtmlBytes) {
              await reader.cancel();
              break;
            }
          }
          html = Buffer.concat(chunks).toString("utf8");
        }
      } else {
        await res.body?.cancel().catch(() => {});
      }
      return {
        url,
        status: res.status,
        html,
        fetchMs,
        finalUrl: res.url || url,
        hops: res.redirected ? 1 : 0,
        headers: {
          contentEncoding: res.headers.get("content-encoding"),
          cacheControl: res.headers.get("cache-control"),
          hsts: res.headers.has("strict-transport-security"),
        },
      };
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    return {
      url,
      status: 0,
      html: "",
      fetchMs: Date.now() - started,
      finalUrl: url,
      hops: 0,
      headers: { contentEncoding: null, cacheControl: null, hsts: false },
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/** HEAD-ish liveness probe (GET with immediate cancel - HEAD is often 405'd). */
async function probeStatus(url: string): Promise<number> {
  try {
    await assertSafeUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const res = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": USER_AGENT },
      });
      await res.body?.cancel().catch(() => {});
      return res.status;
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return 0;
  }
}

function normalizeForQueue(raw: string): string | null {
  try {
    const url = new URL(raw);
    url.hash = "";
    // Skip obvious non-HTML assets.
    if (/\.(png|jpe?g|gif|webp|avif|svg|ico|css|js|mjs|json|xml|pdf|zip|mp4|webm|woff2?|ttf)$/i.test(url.pathname))
      return null;
    return url.href;
  } catch {
    return null;
  }
}

interface RobotsInfo {
  present: boolean;
  disallows: string[];
  sitemaps: string[];
  blocksAssets: boolean;
}

async function fetchRobots(origin: string): Promise<RobotsInfo> {
  try {
    const res = await fetch(`${origin}/robots.txt`, {
      headers: { "user-agent": USER_AGENT },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return { present: false, disallows: [], sitemaps: [], blocksAssets: false };
    const text = (await res.text()).slice(0, 100_000);
    const sitemaps = [...text.matchAll(/^sitemap:\s*(\S+)/gim)].map((m) => m[1]);
    // Only honor the generic (*) group - we crawl as a generic bot.
    const disallows: string[] = [];
    if (GENERIC_DIRECTIVE_BLOCK.test(text)) {
      let inStar = false;
      for (const line of text.split(/\r?\n/)) {
        const ua = line.match(/^user-agent:\s*(.+)$/i);
        if (ua) inStar = ua[1].trim() === "*";
        else if (inStar) {
          const dis = line.match(/^disallow:\s*(\S*)/i);
          if (dis && dis[1]) disallows.push(dis[1]);
        }
      }
    }
    const blocksAssets = disallows.some((d) => /\.(css|js)|\/(css|js|assets|static|wp-includes)\b/i.test(d));
    return { present: true, disallows, sitemaps, blocksAssets };
  } catch {
    return { present: false, disallows: [], sitemaps: [], blocksAssets: false };
  }
}

function robotsAllows(path: string, disallows: string[]): boolean {
  return !disallows.some((rule) => rule !== "/" ? path.startsWith(rule.replace(/\*$/, "")) : true);
}

async function fetchSitemapUrls(origin: string, robotsSitemaps: string[]): Promise<string[]> {
  const candidates = robotsSitemaps.length > 0 ? robotsSitemaps : [`${origin}/sitemap.xml`];
  const urls = new Set<string>();
  const queue = [...candidates.slice(0, 5)];
  let fetched = 0;
  while (queue.length > 0 && fetched < 10 && urls.size < 5_000) {
    const next = queue.shift()!;
    fetched++;
    try {
      const res = await fetch(next, {
        headers: { "user-agent": USER_AGENT },
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) continue;
      const xml = (await res.text()).slice(0, 5_000_000);
      const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((m) => m[1]);
      if (/<sitemapindex/i.test(xml)) queue.push(...locs.slice(0, 10));
      else for (const loc of locs) urls.add(loc);
    } catch {
      // Sitemap fetch failures are reported via the sitemap-missing check.
    }
  }
  return [...urls];
}

export async function runSiteAudit(
  startUrl: string,
  limits: CrawlLimits = DEFAULT_LIMITS,
): Promise<AuditResult> {
  const start = new URL(startUrl);
  const origin = start.origin;
  const deadline = Date.now() + limits.maxDurationMs;

  const robots = await fetchRobots(origin);
  const sitemapUrls = (await fetchSitemapUrls(origin, robots.sitemaps))
    .map(normalizeForQueue)
    .filter((u): u is string => Boolean(u))
    .filter((u) => u.startsWith(origin));

  // BFS queue: homepage first, then sitemap URLs, then discovered links.
  const queued = new Set<string>();
  const queue: { url: string; depth: number }[] = [];
  const enqueue = (url: string, depth: number) => {
    if (queued.has(url) || queued.size >= limits.maxPages * 4) return;
    if (!url.startsWith(origin)) return;
    if (!robotsAllows(new URL(url).pathname, robots.disallows)) return;
    queued.add(url);
    queue.push({ url, depth });
  };
  enqueue(normalizeForQueue(start.href) ?? start.href, 0);
  for (const u of sitemapUrls) enqueue(u, 1);

  const pages: PageFacts[] = [];
  const issues: PageIssue[] = [];
  const statusByUrl = new Map<string, number>();
  const inboundLinks = new Map<string, number>();
  const depthByUrl = new Map<string, number>();
  const redirectHops = new Map<string, number>();
  let stoppedReason: AuditResult["stoppedReason"] = "completed";

  while (queue.length > 0 && statusByUrl.size < limits.maxPages) {
    if (Date.now() > deadline) {
      stoppedReason = "time-limit";
      break;
    }
    // Politeness: a short pause between batches keeps bot-protection happier.
    await new Promise((resolve) => setTimeout(resolve, 150));
    const batch = queue.splice(0, limits.concurrency);
    const results = await Promise.all(batch.map((b) => fetchPage(b.url, limits)));
    for (let i = 0; i < results.length; i++) {
      const fetched = results[i];
      const depth = batch[i].depth;
      depthByUrl.set(fetched.url, depth);
      if (fetched.error) {
        statusByUrl.set(fetched.url, 0);
        issues.push({ checkId: "http-fetch-error", url: fetched.url, detail: fetched.error.slice(0, 120) });
        continue;
      }
      statusByUrl.set(fetched.url, fetched.status);
      if (fetched.finalUrl !== fetched.url) {
        redirectHops.set(fetched.url, 1);
        issues.push({ checkId: "http-redirect", url: fetched.url, detail: `→ ${fetched.finalUrl.slice(0, 100)}` });
      }
      if (!fetched.html) {
        if (fetched.status >= 500) issues.push({ checkId: "http-5xx", url: fetched.url, detail: `HTTP ${fetched.status}` });
        else if (fetched.status >= 400) issues.push({ checkId: "http-4xx", url: fetched.url, detail: `HTTP ${fetched.status}` });
        continue;
      }
      const facts = extractFacts({
        url: fetched.finalUrl.startsWith(origin) ? fetched.finalUrl : fetched.url,
        status: fetched.status,
        html: fetched.html,
        fetchMs: fetched.fetchMs,
        headers: fetched.headers,
      });
      pages.push(facts);
      issues.push(...pageIssues(facts));
      if (depth >= 5) issues.push({ checkId: "crawl-depth", url: facts.url, detail: `depth ${depth}` });
      for (const link of facts.internalLinks) {
        const normalized = normalizeForQueue(link);
        if (!normalized) continue;
        inboundLinks.set(normalized, (inboundLinks.get(normalized) ?? 0) + 1);
        enqueue(normalized, depth + 1);
      }
    }
  }
  if (statusByUrl.size >= limits.maxPages && queue.length > 0) stoppedReason = "page-limit";

  // ---- Site-level checks ----
  if (!robots.present) issues.push({ checkId: "robots-missing", url: `${origin}/robots.txt` });
  else {
    if (robots.sitemaps.length === 0) issues.push({ checkId: "robots-no-sitemap", url: `${origin}/robots.txt` });
    if (robots.blocksAssets) issues.push({ checkId: "robots-blocks-assets", url: `${origin}/robots.txt` });
  }
  if (sitemapUrls.length === 0) issues.push({ checkId: "sitemap-missing", url: `${origin}/sitemap.xml` });

  // Duplicates across pages
  const byTitle = new Map<string, string[]>();
  const byDesc = new Map<string, string[]>();
  const byH1 = new Map<string, string[]>();
  const byText = new Map<string, string[]>();
  for (const p of pages) {
    if (p.titles[0]) byTitle.set(p.titles[0], [...(byTitle.get(p.titles[0]) ?? []), p.url]);
    if (p.descriptions[0]) byDesc.set(p.descriptions[0], [...(byDesc.get(p.descriptions[0]) ?? []), p.url]);
    if (p.h1s[0]) byH1.set(p.h1s[0], [...(byH1.get(p.h1s[0]) ?? []), p.url]);
    if (p.wordCount > 50) byText.set(p.textHash, [...(byText.get(p.textHash) ?? []), p.url]);
  }
  const pushDupes = (map: Map<string, string[]>, checkId: string) => {
    for (const urls of map.values()) {
      if (urls.length > 1)
        for (const url of urls) issues.push({ checkId, url, detail: `${urls.length} pages share this` });
    }
  };
  pushDupes(byTitle, "title-duplicate");
  pushDupes(byDesc, "desc-duplicate");
  pushDupes(byH1, "h1-duplicate");
  pushDupes(byText, "content-duplicate");

  // Broken internal links: every crawled page's links whose target we know is 4xx/5xx,
  // plus probes for a sample of uncrawled targets.
  const uncrawledTargets = new Set<string>();
  for (const p of pages) {
    for (const link of p.internalLinks) {
      const normalized = normalizeForQueue(link);
      if (!normalized) continue;
      const status = statusByUrl.get(normalized);
      if (status === undefined) uncrawledTargets.add(normalized);
      else if (status >= 400 || status === 0)
        issues.push({ checkId: "link-internal-broken", url: p.url, detail: normalized.slice(0, 120) });
      else if (redirectHops.has(normalized))
        issues.push({ checkId: "link-internal-redirect", url: p.url, detail: normalized.slice(0, 120) });
    }
  }

  // External link probes (sampled, deduped).
  const externalTargets = new Map<string, string>();
  for (const p of pages) {
    for (const link of p.externalLinks) {
      if (!externalTargets.has(link)) externalTargets.set(link, p.url);
      if (externalTargets.size >= limits.maxExternalProbes) break;
    }
    if (externalTargets.size >= limits.maxExternalProbes) break;
  }
  const externalEntries = [...externalTargets.entries()];
  for (let i = 0; i < externalEntries.length; i += limits.concurrency) {
    if (Date.now() > deadline) break;
    const slice = externalEntries.slice(i, i + limits.concurrency);
    const statuses = await Promise.all(slice.map(([target]) => probeStatus(target)));
    statuses.forEach((status, j) => {
      const [target, fromPage] = slice[j];
      if (status >= 400 || status === 0)
        issues.push({ checkId: "link-external-broken", url: fromPage, detail: target.slice(0, 120) });
    });
  }

  // Sitemap hygiene + orphans (limited to URLs we actually have data for).
  const crawledNoindex = new Set(pages.filter((p) => p.noindex).map((p) => p.url));
  for (const url of sitemapUrls) {
    const status = statusByUrl.get(url);
    if (status !== undefined) {
      if (status >= 400 || status === 0) issues.push({ checkId: "sitemap-broken-url", url, detail: `HTTP ${status}` });
      else if (redirectHops.has(url)) issues.push({ checkId: "sitemap-redirect-url", url });
    }
    if (crawledNoindex.has(url)) issues.push({ checkId: "sitemap-noindex-url", url });
    if (statusByUrl.has(url) && !inboundLinks.has(url) && url !== normalizeForQueue(start.href))
      issues.push({ checkId: "link-orphan", url });
  }

  // Trust pages (site-level, judged from crawled URL set).
  const allPaths = new Set(pages.map((p) => new URL(p.url).pathname.toLowerCase()));
  const hasPath = (pattern: RegExp) => [...allPaths].some((p) => pattern.test(p));
  if (!hasPath(/contact/)) issues.push({ checkId: "trust-no-contact", url: origin });
  if (!hasPath(/privacy/)) issues.push({ checkId: "trust-no-privacy", url: origin });

  // Bot-protection heuristic: when a third of fetches come back 403/429,
  // the numbers describe the firewall, not the site - say so in the UI.
  const blockedResponses = [...statusByUrl.values()].filter((s) => s === 403 || s === 429).length;
  if (statusByUrl.size >= 20 && blockedResponses / statusByUrl.size >= 0.3) stoppedReason = "blocked";

  // ---- Aggregate ----
  // Counts are DISTINCT affected URLs (Ahrefs semantics): a page linking to
  // the same broken target from nav + footer is ONE affected page, and a
  // busted global nav cannot explode into tens of thousands of "issues".
  const grouped = new Map<string, AuditIssueGroup>();
  const seenPairs = new Set<string>();
  for (const issue of issues) {
    if (!AUDIT_CHECKS[issue.checkId]) continue;
    const pairKey = `${issue.checkId}|${issue.url}`;
    if (seenPairs.has(pairKey)) continue;
    seenPairs.add(pairKey);
    let group = grouped.get(issue.checkId);
    if (!group) {
      group = { checkId: issue.checkId, count: 0, urls: [] };
      grouped.set(issue.checkId, group);
    }
    group.count++;
    if (group.urls.length < URL_SAMPLE_CAP)
      group.urls.push({ url: issue.url, detail: issue.detail });
  }
  const groupedList = [...grouped.values()].sort((a, b) => {
    const sevDiff =
      SEVERITY_ORDER[AUDIT_CHECKS[b.checkId].severity] - SEVERITY_ORDER[AUDIT_CHECKS[a.checkId].severity];
    return sevDiff !== 0 ? sevDiff : b.count - a.count;
  });

  const countBySeverity = (severity: AuditSeverity) =>
    groupedList
      .filter((g) => AUDIT_CHECKS[g.checkId].severity === severity)
      .reduce((sum, g) => sum + g.count, 0);

  const urlsWithErrors = new Set(
    issues.filter((i) => AUDIT_CHECKS[i.checkId]?.severity === "ERROR").map((i) => i.url),
  );
  const auditedUrls = Math.max(1, statusByUrl.size);
  const healthScore = Math.max(
    0,
    Math.round(((auditedUrls - urlsWithErrors.size) / auditedUrls) * 100),
  );

  return {
    pagesCrawled: statusByUrl.size,
    urlsDiscovered: queued.size,
    healthScore,
    errorCount: countBySeverity("ERROR"),
    warningCount: countBySeverity("WARNING"),
    noticeCount: countBySeverity("NOTICE"),
    pagesWithErrors: urlsWithErrors.size,
    issues: groupedList,
    stoppedReason,
  };
}
