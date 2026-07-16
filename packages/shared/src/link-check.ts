/**
 * Internal link status checking (spec §20). After a scan persists its
 * snapshots, the worker probes each unique internal link once and records the
 * HTTP status on the scan's PageLink rows; the comparison engine then reports
 * links that newly became broken.
 *
 * False-positive posture: only definite outcomes are recorded - an actual
 * HTTP response, or a hard network failure (DNS NXDOMAIN, connection refused,
 * TLS certificate failure) recorded as status 0. Indeterminate outcomes
 * (timeouts, SSRF-blocked targets, redirect loops) record NO status, so a
 * slow origin never reads as a broken link.
 */

import { assertSafeUrl, UnsafeUrlError } from "./ssrf";

/** Per-scan cap on network probes - link checking must stay cheap (spec §43). */
export const MAX_LINK_CHECKS_PER_SCAN = 150;

export interface LinkCheckPlan {
  /** Unique URLs that need a network probe, in first-seen order. */
  toCheck: string[];
  /** URLs whose status is already known (e.g. monitored pages in this scan). */
  reused: Map<string, number>;
  /** Unique URLs dropped by the per-scan cap. */
  dropped: number;
}

/**
 * Decide which link URLs actually need a probe: dedupe, reuse statuses we
 * already observed for free (monitored pages scanned in this scan), and cap
 * the remainder.
 */
export function planLinkChecks(
  urls: Iterable<string>,
  knownStatuses: Map<string, number>,
  cap: number = MAX_LINK_CHECKS_PER_SCAN,
): LinkCheckPlan {
  const seen = new Set<string>();
  const toCheck: string[] = [];
  const reused = new Map<string, number>();
  let dropped = 0;

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);
    const known = knownStatuses.get(url);
    if (known !== undefined) {
      reused.set(url, known);
    } else if (toCheck.length < cap) {
      toCheck.push(url);
    } else {
      dropped++;
    }
  }

  return { toCheck, reused, dropped };
}

export interface LinkProbeOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
}

export interface LinkProbeResult {
  /**
   * Terminal HTTP status, `0` for a definite network failure, or `null` when
   * the outcome is indeterminate and must not be recorded.
   */
  status: number | null;
  errorCode?: string;
}

const PROBE_DEFAULTS: Required<LinkProbeOptions> = {
  timeoutMs: 8_000,
  maxRedirects: 5,
  userAgent: "MyKavoBot/0.1 (+https://mykavo.app/bot; broken link check)",
};

/** Network failures where the link is definitively unreachable for visitors. */
const HARD_FAILURE_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "EHOSTUNREACH",
  "ENETUNREACH",
]);

function causeCode(err: unknown): string | null {
  if (err instanceof Error && err.cause && typeof err.cause === "object") {
    const code = (err.cause as { code?: unknown }).code;
    if (typeof code === "string") return code;
  }
  return null;
}

/**
 * Probe a link's HTTP status without downloading its body: HEAD first (GET
 * fallback for servers that reject HEAD), manual redirects with SSRF
 * revalidation on every hop - links come from scanned HTML and are untrusted
 * input (spec §11).
 */
export async function probeLinkStatus(
  rawUrl: string,
  options: LinkProbeOptions = {},
): Promise<LinkProbeResult> {
  const opts = { ...PROBE_DEFAULTS, ...options };

  let current: URL;
  try {
    current = await assertSafeUrl(rawUrl);
  } catch (err) {
    if (err instanceof UnsafeUrlError && err.code === "DNS_FAILURE") {
      return { status: 0, errorCode: err.code }; // host doesn't resolve - broken for visitors too
    }
    return { status: null, errorCode: err instanceof UnsafeUrlError ? err.code : "INVALID_URL" };
  }

  async function request(url: URL, method: "HEAD" | "GET"): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      return await fetch(url.href, {
        method,
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": opts.userAgent, accept: "*/*" },
      });
    } finally {
      clearTimeout(timer);
    }
  }

  for (let hop = 0; hop <= opts.maxRedirects; hop++) {
    let response: Response;
    try {
      response = await request(current, "HEAD");
      // Some servers reject HEAD outright - retry those with GET.
      if (response.status === 405 || response.status === 501) {
        response.body?.cancel();
        response = await request(current, "GET");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        return { status: null, errorCode: "TIMEOUT" };
      }
      const code = causeCode(err);
      if (code && (HARD_FAILURE_CODES.has(code) || /CERT|TLS/i.test(code))) {
        return { status: 0, errorCode: code };
      }
      return { status: null, errorCode: code ?? "FETCH_FAILED" };
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      response.body?.cancel();
      if (!location) return { status: response.status };
      let next: URL;
      try {
        next = new URL(location, current.href);
      } catch {
        return { status: null, errorCode: "INVALID_URL" };
      }
      try {
        // Re-validate every hop - redirects are untrusted input.
        current = await assertSafeUrl(next);
      } catch (err) {
        if (err instanceof UnsafeUrlError && err.code === "DNS_FAILURE") {
          return { status: 0, errorCode: err.code };
        }
        return {
          status: null,
          errorCode: err instanceof UnsafeUrlError ? err.code : "INVALID_URL",
        };
      }
      continue;
    }

    response.body?.cancel();
    return { status: response.status };
  }

  return { status: null, errorCode: "TOO_MANY_REDIRECTS" };
}

/** Bounded-concurrency map preserving input order (used by the worker). */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const index = cursor++;
      if (index >= items.length) return;
      results[index] = await fn(items[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}
