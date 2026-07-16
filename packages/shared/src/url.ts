/**
 * Centralized URL normalization (spec §12).
 * This module migrates to packages/shared in Phase 2 - keep it dependency-free.
 */

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
  "msclkid",
  "mc_cid",
  "mc_eid",
  "ref",
]);

export interface NormalizeOptions {
  /** Remove known tracking query parameters. Default true. */
  stripTrackingParams?: boolean;
  /** Remove ALL query parameters. Default false. */
  stripAllParams?: boolean;
}

/**
 * Parse user input into a URL, tolerating a missing scheme ("example.com").
 * Returns null for unparseable input. Does NOT validate safety - see ssrf.ts.
 */
export function parseUrlInput(input: string): URL | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  const candidate = /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    return new URL(candidate);
  } catch {
    return null;
  }
}

/**
 * Normalize a URL for deduplication and comparison:
 * lowercase host, drop fragment, drop default port, sort query params,
 * strip tracking params, collapse trailing slash on non-root paths.
 * Canonical URLs from page metadata are NOT applied here - they are metadata.
 */
export function normalizeUrl(url: URL | string, opts: NormalizeOptions = {}): string {
  const { stripTrackingParams = true, stripAllParams = false } = opts;
  const u = typeof url === "string" ? new URL(url) : new URL(url.href);

  u.hostname = u.hostname.toLowerCase();
  u.hash = "";
  u.username = "";
  u.password = "";

  if (
    (u.protocol === "https:" && u.port === "443") ||
    (u.protocol === "http:" && u.port === "80")
  ) {
    u.port = "";
  }

  if (stripAllParams) {
    u.search = "";
  } else {
    const params = [...u.searchParams.entries()]
      .filter(([key]) => !stripTrackingParams || !TRACKING_PARAMS.has(key.toLowerCase()))
      .sort(([a], [b]) => a.localeCompare(b));
    u.search = "";
    for (const [k, v] of params) u.searchParams.append(k, v);
  }

  if (u.pathname !== "/" && u.pathname.endsWith("/")) {
    u.pathname = u.pathname.replace(/\/+$/, "");
  }

  return u.href;
}

/** Resolve a possibly-relative href against a base document URL. Null if unresolvable. */
export function resolveHref(href: string, base: string): URL | null {
  try {
    return new URL(href, base);
  } catch {
    return null;
  }
}

export function isSameOrigin(a: URL, b: URL): boolean {
  return a.protocol === b.protocol && a.hostname === b.hostname && a.port === b.port;
}
