/**
 * Manual redirect-chain follower for the free Redirect Chain Checker.
 *
 * Security-critical: redirects are untrusted input, so EVERY hop's
 * destination is re-validated with the SSRF guard (assertSafeUrl) before
 * it is fetched. Automatic redirect following is disabled.
 *
 * Server-only at runtime (DNS lookups); clients may `import type` from here.
 */

import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";

export const MAX_REDIRECT_HOPS = 10;

export interface ChainStep {
  url: string;
  status: number;
}

export interface RedirectChainResult {
  /** Every response received, in order (terminal response included when reached). */
  steps: ChainStep[];
  /** Number of 3xx responses in the chain. */
  redirectCount: number;
  /** True when the walk ended on a non-redirect response. */
  completed: boolean;
  loopDetected: boolean;
  /** The URL that was about to be visited a second time. */
  loopUrl: string | null;
  exceededMaxHops: boolean;
  finalUrl: string | null;
  finalStatus: number | null;
  totalTimeMs: number;
}

export interface FollowOptions {
  maxHops?: number;
  timeoutMs?: number;
  userAgent?: string;
  /** Injectable for tests. */
  fetchImpl?: (url: string, init: RequestInit) => Promise<Response>;
  /** Injectable for tests. Defaults to the SSRF guard. */
  validateUrl?: (raw: string | URL) => Promise<URL>;
}

export async function followRedirectChain(
  rawUrl: string,
  options: FollowOptions = {},
): Promise<RedirectChainResult> {
  const {
    maxHops = MAX_REDIRECT_HOPS,
    timeoutMs = 10_000,
    userAgent = "MyKavoBot/0.1 (+https://mykavo.app/bot; redirect chain checker)",
    fetchImpl = fetch,
    validateUrl = assertSafeUrl,
  } = options;

  const startedAt = Date.now();
  const steps: ChainStep[] = [];
  const visited = new Set<string>();

  const result = (partial: Partial<RedirectChainResult>): RedirectChainResult => ({
    steps,
    redirectCount: steps.filter((s) => s.status >= 300 && s.status < 400).length,
    completed: false,
    loopDetected: false,
    loopUrl: null,
    exceededMaxHops: false,
    finalUrl: null,
    finalStatus: null,
    totalTimeMs: Date.now() - startedAt,
    ...partial,
  });

  let current = await validateUrl(rawUrl);
  let followed = 0;

  for (;;) {
    visited.add(current.href);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetchImpl(current.href, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "user-agent": userAgent,
          accept: "text/html,application/xhtml+xml,*/*;q=0.8",
        },
      });
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") {
        throw new UnsafeUrlError("TIMEOUT", "The request timed out.");
      }
      throw new UnsafeUrlError("FETCH_FAILED", "The request failed.");
    } finally {
      clearTimeout(timer);
    }

    // Statuses only - never read response bodies.
    void response.body?.cancel();
    steps.push({ url: current.href, status: response.status });

    if (response.status < 300 || response.status >= 400) {
      return result({ completed: true, finalUrl: current.href, finalStatus: response.status });
    }

    const location = response.headers.get("location");
    if (!location) {
      // 3xx without a Location header goes nowhere - treat as terminal.
      return result({ completed: true, finalUrl: current.href, finalStatus: response.status });
    }

    let next: URL;
    try {
      next = new URL(location, current.href);
    } catch {
      throw new UnsafeUrlError("INVALID_URL", "Redirect target could not be parsed.");
    }

    if (visited.has(next.href)) {
      return result({ loopDetected: true, loopUrl: next.href });
    }

    followed++;
    if (followed > maxHops) {
      return result({ exceededMaxHops: true });
    }

    // Re-validate EVERY hop destination before following it (SSRF guard).
    current = await validateUrl(next);
  }
}
