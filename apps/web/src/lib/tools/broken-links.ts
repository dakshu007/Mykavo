import { attr, stripTags } from "./html";
import { SAFE_FETCH_USER_MESSAGES } from "./user-messages";

/**
 * Single-page broken link checking for the free Broken Link Checker.
 *
 * Extraction and classification are pure so they can be unit-tested; the
 * route supplies the network check (status-check.ts, SSRF-guarded on every
 * redirect hop). Classification follows the same false-positive posture as
 * the monitoring product (@mykavo/shared link-check): only definite failures
 * count as broken. 401/403/429, timeouts and redirect loops are reported as
 * "couldn't verify", never as broken.
 */

/** Unique links checked per request - keeps one check well under ~25s. */
export const MAX_LINKS_CHECKED = 100;

export interface ExtractedLink {
  /** Absolute URL with the #fragment removed - the dedupe key. */
  url: string;
  /** Visible anchor text (or alt/aria-label/title), trimmed. Empty if none. */
  text: string;
  internal: boolean;
  /** How many <a> tags on the page point at this URL. */
  occurrences: number;
}

export type LinkOutcome = "broken" | "unverified" | "redirect" | "ok";

export interface LinkCheckResult extends ExtractedLink {
  status: number | null;
  finalUrl: string | null;
  redirectCount: number;
  outcome: LinkOutcome;
  /** Plain-English explanation of the outcome. */
  reason: string;
}

export interface BrokenLinkReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  /** Unique http(s) links found on the page. */
  totalLinks: number;
  /** Links actually included in this report (at most MAX_LINKS_CHECKED). */
  checkedLinks: number;
  capped: boolean;
  internalCount: number;
  externalCount: number;
  counts: Record<LinkOutcome, number>;
  /** Broken first, then unverified, redirect, ok. */
  results: LinkCheckResult[];
}

/** Hostname without a leading "www." - www and apex count as the same site. */
export function siteHost(url: URL): string {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

const MAX_TEXT = 120;

function cleanText(s: string): string {
  return s.length > MAX_TEXT ? `${s.slice(0, MAX_TEXT - 1).trimEnd()}…` : s;
}

/** Remove regions that look like links but are never followed by visitors. */
function stripNonContent(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, " ");
}

/** The document base: <base href> if present and valid, else the page URL. */
function documentBase(html: string, pageUrl: string): string {
  const tag = html.match(/<base\b[^>]*>/i)?.[0];
  const href = tag ? attr(tag, "href") : null;
  if (href) {
    try {
      return new URL(href, pageUrl).href;
    } catch {
      // fall through
    }
  }
  return pageUrl;
}

/**
 * Every followable http(s) link on the page, deduped by URL (fragment
 * removed) in document order. Drops fragment-only links, mailto:, tel:,
 * javascript: and any other non-http scheme.
 */
export function extractLinks(html: string, pageUrl: string): ExtractedLink[] {
  const page = new URL(pageUrl);
  const pageHost = siteHost(page);
  const base = documentBase(html, pageUrl);
  const clean = stripNonContent(html);

  const byUrl = new Map<string, ExtractedLink>();
  const re = /<a\b([^>]*)>([\s\S]*?)(?=<\/a\s*>|<a\b|$)/gi;
  for (const m of clean.matchAll(re)) {
    const tag = `<a ${m[1]}>`;
    const href = attr(tag, "href")?.trim();
    if (!href || href.startsWith("#")) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, base);
    } catch {
      continue;
    }
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") continue;
    resolved.hash = "";
    const url = resolved.href;

    const existing = byUrl.get(url);
    const text = cleanText(
      stripTags(m[2]) ||
        attr(m[2].match(/<img\b[^>]*>/i)?.[0] ?? "", "alt") ||
        attr(tag, "aria-label") ||
        attr(tag, "title") ||
        "",
    );
    if (existing) {
      existing.occurrences++;
      if (!existing.text && text) existing.text = text;
      continue;
    }
    byUrl.set(url, { url, text, internal: siteHost(resolved) === pageHost, occurrences: 1 });
  }
  return [...byUrl.values()];
}

/** What came back from checking one link (shape of status-check's result). */
export interface LinkProbe {
  status: number | null;
  finalUrl: string | null;
  redirectCount: number;
  /** User-safe error message from SAFE_FETCH_USER_MESSAGES, or a deadline marker. */
  error: string | null;
}

/** Marker for links the time budget didn't reach. */
export const NOT_CHECKED_TIME_LIMIT = "NOT_CHECKED_TIME_LIMIT";

const STATUS_TEXT: Record<number, string> = {
  400: "Bad request",
  404: "Not found",
  405: "Method not allowed",
  410: "Gone",
  500: "Server error",
  502: "Bad gateway",
  503: "Service unavailable",
  504: "Gateway timeout",
};

function statusLabel(status: number): string {
  return STATUS_TEXT[status] ? `${STATUS_TEXT[status]} (${status})` : `HTTP ${status}`;
}

/** Classify one probe into broken / couldn't verify / redirect / ok. */
export function classifyLink(probe: LinkProbe, timeoutSeconds: number): { outcome: LinkOutcome; reason: string } {
  if (probe.error !== null) {
    switch (probe.error) {
      case NOT_CHECKED_TIME_LIMIT:
        return { outcome: "unverified", reason: "Not checked - the time limit for this check was reached." };
      case SAFE_FETCH_USER_MESSAGES.DNS_FAILURE:
        return { outcome: "broken", reason: "The domain doesn't resolve (DNS failure)." };
      case SAFE_FETCH_USER_MESSAGES.FETCH_FAILED:
        return { outcome: "broken", reason: "Couldn't connect to the server." };
      case SAFE_FETCH_USER_MESSAGES.INVALID_URL:
        return { outcome: "broken", reason: "The link is not a valid URL." };
      case SAFE_FETCH_USER_MESSAGES.TIMEOUT:
        return {
          outcome: "unverified",
          reason: `No response within ${timeoutSeconds} seconds. The server may be slow rather than down.`,
        };
      case SAFE_FETCH_USER_MESSAGES.BLOCKED_HOST:
        return { outcome: "unverified", reason: "Points to a private or internal address, which we don't check." };
      default:
        return { outcome: "unverified", reason: "We couldn't check this link." };
    }
  }

  const status = probe.status;
  if (status === null) return { outcome: "unverified", reason: "We couldn't check this link." };
  const via = probe.redirectCount > 0 && probe.finalUrl ? `Redirects to ${probe.finalUrl}, which returns ` : "";

  if (status >= 200 && status < 300) {
    return probe.redirectCount > 0 && probe.finalUrl
      ? { outcome: "redirect", reason: `Redirects to ${probe.finalUrl}` }
      : { outcome: "ok", reason: `OK (${status})` };
  }
  if (status >= 300 && status < 400) {
    return probe.redirectCount >= 5
      ? { outcome: "unverified", reason: "Too many redirects - we stopped following after 5." }
      : { outcome: "unverified", reason: `HTTP ${status} redirect with no destination, so we couldn't follow it.` };
  }
  if (status === 401 || status === 403 || status === 429) {
    const why =
      status === 429
        ? "the server rate-limited our check"
        : "the server refused our automated check, which many sites do to bots";
    return {
      outcome: "unverified",
      reason: `${via ? `${via}${status}: ` : `HTTP ${status}: `}${why}. It may work fine in a browser.`,
    };
  }
  if (status >= 400 && status < 600) {
    return { outcome: "broken", reason: via ? `${via}${statusLabel(status)}.` : `${statusLabel(status)}.` };
  }
  return { outcome: "unverified", reason: `Unusual response (HTTP ${status}), so we couldn't verify it.` };
}

const ORDER: Record<LinkOutcome, number> = { broken: 0, unverified: 1, redirect: 2, ok: 3 };

export function buildBrokenLinkReport(input: {
  url: string;
  finalUrl: string;
  httpStatus: number;
  links: ExtractedLink[];
  totalLinks: number;
  probes: LinkProbe[];
  timeoutSeconds: number;
}): BrokenLinkReport {
  const results: LinkCheckResult[] = input.links.map((link, i) => {
    const probe = input.probes[i] ?? { status: null, finalUrl: null, redirectCount: 0, error: NOT_CHECKED_TIME_LIMIT };
    return {
      ...link,
      status: probe.status,
      finalUrl: probe.finalUrl,
      redirectCount: probe.redirectCount,
      ...classifyLink(probe, input.timeoutSeconds),
    };
  });
  // Stable sort keeps document order within each group.
  results.sort((a, b) => ORDER[a.outcome] - ORDER[b.outcome]);

  const counts: Record<LinkOutcome, number> = { broken: 0, unverified: 0, redirect: 0, ok: 0 };
  for (const r of results) counts[r.outcome]++;
  const internalCount = results.filter((r) => r.internal).length;

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    totalLinks: input.totalLinks,
    checkedLinks: results.length,
    capped: input.totalLinks > results.length,
    internalCount,
    externalCount: results.length - internalCount,
    counts,
    results,
  };
}

/**
 * Run `check` over items with fixed concurrency and an overall time budget.
 * Items the budget doesn't reach - or whose check outlives it - get
 * `onTimeout(item)` instead, so one slow host can't stall the whole request.
 */
export async function mapWithBudget<T, R>(
  items: readonly T[],
  options: { concurrency: number; budgetMs: number; now?: () => number },
  check: (item: T) => Promise<R>,
  onTimeout: (item: T) => R,
): Promise<R[]> {
  const now = options.now ?? Date.now;
  const deadline = now() + options.budgetMs;
  const results = new Array<R>(items.length);
  let next = 0;

  const worker = async () => {
    for (;;) {
      const i = next++;
      if (i >= items.length) return;
      const remaining = deadline - now();
      if (remaining <= 0) {
        results[i] = onTimeout(items[i]);
        continue;
      }
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<R>((resolve) => {
        timer = setTimeout(() => resolve(onTimeout(items[i])), remaining);
      });
      try {
        results[i] = await Promise.race([check(items[i]), timeout]);
      } finally {
        clearTimeout(timer);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.max(1, Math.min(options.concurrency, items.length)) }, worker));
  return results;
}
