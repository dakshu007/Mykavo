/**
 * Single-URL status checking for the free Bulk URL Status Checker.
 * HEAD first (cheap), falling back to GET when the server rejects HEAD.
 * Redirects are followed manually with SSRF re-validation on every hop;
 * response bodies are never read. Server-only at runtime (DNS lookups).
 */

import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";
import { parseUrlInput } from "@/lib/url";
import { SAFE_FETCH_USER_MESSAGES } from "./user-messages";

export const MAX_BULK_URLS = 20;
export const BULK_CONCURRENCY = 5;

export interface UrlStatusResult {
  /** The URL as the user entered it (trimmed). */
  url: string;
  status: number | null;
  finalUrl: string | null;
  redirectCount: number;
  responseTimeMs: number | null;
  /** User-safe error message when the check could not complete. */
  error: string | null;
}

export interface StatusCheckOptions {
  timeoutMs?: number;
  maxRedirects?: number;
  userAgent?: string;
  /** Injectable for tests. */
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  /** Injectable for tests. Defaults to the SSRF guard. */
  validateUrl?: (raw: string | URL) => Promise<URL>;
}

export async function checkUrlStatus(
  input: string,
  options: StatusCheckOptions = {},
): Promise<UrlStatusResult> {
  const {
    timeoutMs = 10_000,
    maxRedirects = 5,
    userAgent = "MyKavoBot/0.1 (+https://mykavo.app/bot; bulk url status checker)",
    fetchImpl = fetch,
    validateUrl = assertSafeUrl,
  } = options;

  const entered = input.trim();
  const fail = (error: string): UrlStatusResult => ({
    url: entered,
    status: null,
    finalUrl: null,
    redirectCount: 0,
    responseTimeMs: null,
    error,
  });

  const parsed = parseUrlInput(entered);
  if (!parsed) return fail(SAFE_FETCH_USER_MESSAGES.INVALID_URL);

  const startedAt = Date.now();
  try {
    let current = await validateUrl(parsed.href);
    let redirects = 0;

    for (;;) {
      let response = await fetchOnce(fetchImpl, current.href, "HEAD", timeoutMs, userAgent);
      // Some servers reject HEAD outright — retry with GET.
      if (response.status === 405 || response.status === 501) {
        response = await fetchOnce(fetchImpl, current.href, "GET", timeoutMs, userAgent);
      }
      void response.body?.cancel();

      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("location");
        if (location && redirects < maxRedirects) {
          let next: URL;
          try {
            next = new URL(location, current.href);
          } catch {
            return fail(SAFE_FETCH_USER_MESSAGES.INVALID_URL);
          }
          redirects++;
          // Re-validate every hop — redirects are untrusted input.
          current = await validateUrl(next);
          continue;
        }
      }

      return {
        url: entered,
        status: response.status,
        finalUrl: current.href,
        redirectCount: redirects,
        responseTimeMs: Date.now() - startedAt,
        error: null,
      };
    }
  } catch (err) {
    if (err instanceof UnsafeUrlError) return fail(SAFE_FETCH_USER_MESSAGES[err.code]);
    return fail(SAFE_FETCH_USER_MESSAGES.FETCH_FAILED);
  }
}

async function fetchOnce(
  fetchImpl: (url: string, init: RequestInit) => Promise<Response>,
  url: string,
  method: "HEAD" | "GET",
  timeoutMs: number,
  userAgent: string,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: { "user-agent": userAgent, accept: "*/*" },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new UnsafeUrlError("TIMEOUT", "The request timed out.");
    }
    throw new UnsafeUrlError("FETCH_FAILED", "The request failed.");
  } finally {
    clearTimeout(timer);
  }
}

/** Run an async mapper over items with a fixed concurrency limit, preserving order. */
export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, async () => {
    for (;;) {
      const i = nextIndex++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return results;
}
