/**
 * Lighthouse performance audit driven by Playwright's bundled Chromium.
 *
 * `lighthouse` and `chrome-launcher` are ESM-only, so they're loaded via
 * dynamic import (safe regardless of how tsx/tsc treat this file). chrome-launcher
 * launches Playwright's Chromium binary on a debugging port; Lighthouse attaches
 * to that port over CDP — pinning the Chromium version avoids protocol mismatch.
 *
 * Audits are heavyweight (~10–40s, hundreds of MB) — callers must run them
 * one-at-a-time. Cost/§22: this is on-demand, never per-scan.
 */

import { chromium } from "playwright";

/** Parsed, storage-ready audit result. Scores are 0–100; vitals are ms (CLS unitless). */
export interface LighthouseResult {
  performanceScore: number | null;
  accessibilityScore: number | null;
  bestPracticesScore: number | null;
  seoScore: number | null;
  lcpMs: number | null;
  fcpMs: number | null;
  tbtMs: number | null;
  ttiMs: number | null;
  speedIndexMs: number | null;
  cls: number | null;
}

/** Minimal structural shape of the Lighthouse Result (LHR) fields we read. */
interface Lhr {
  categories?: Record<string, { score?: number | null } | undefined>;
  audits?: Record<string, { numericValue?: number | null } | undefined>;
}

/** Pure mapping from an LHR object to our stored fields — unit-tested. */
export function parseLighthouseResult(lhr: Lhr): LighthouseResult {
  const score = (id: string): number | null => {
    const s = lhr.categories?.[id]?.score;
    return s === null || s === undefined ? null : Math.round(s * 100);
  };
  const ms = (id: string): number | null => {
    const v = lhr.audits?.[id]?.numericValue;
    return v === null || v === undefined ? null : Math.round(v);
  };
  const clsRaw = lhr.audits?.["cumulative-layout-shift"]?.numericValue;

  return {
    performanceScore: score("performance"),
    accessibilityScore: score("accessibility"),
    // Category id is hyphenated.
    bestPracticesScore: score("best-practices"),
    seoScore: score("seo"),
    lcpMs: ms("largest-contentful-paint"),
    fcpMs: ms("first-contentful-paint"),
    tbtMs: ms("total-blocking-time"),
    ttiMs: ms("interactive"),
    speedIndexMs: ms("speed-index"),
    cls: clsRaw === null || clsRaw === undefined ? null : Math.round(clsRaw * 1000) / 1000,
  };
}

export class LighthouseError extends Error {
  constructor(
    public readonly code: "AUDIT_TIMEOUT" | "AUDIT_FAILED" | "NO_RESULT",
    message: string,
  ) {
    super(message);
    this.name = "LighthouseError";
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<T>((_, reject) => {
    timer = setTimeout(
      () => reject(new LighthouseError("AUDIT_TIMEOUT", "Audit timed out.")),
      ms,
    );
  });
  // Clear the timer once the race settles so it never outlives the result.
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export interface RunLighthouseOptions {
  /** Hard cap on the whole audit. Default 90_000. */
  timeoutMs?: number;
}

/** Run a Lighthouse audit and return parsed scores + Core Web Vitals. */
export async function runLighthouse(
  url: string,
  options: RunLighthouseOptions = {},
): Promise<LighthouseResult> {
  const timeoutMs = options.timeoutMs ?? 90_000;
  const [{ default: lighthouse }, chromeLauncher] = await Promise.all([
    import("lighthouse"),
    import("chrome-launcher"),
  ]);

  // SECURITY: keep Chrome's OS sandbox ENABLED — the audited URL is untrusted
  // and this process holds DB/storage credentials. Flags mirror the page
  // scanner (browser-pool.ts), which runs the same bundled Chromium sandboxed.
  // Never add --no-sandbox here; if a container truly can't sandbox, isolate
  // the worker (seccomp/user-ns/low-priv container) instead. (docs/SECURITY_MODEL.md)
  //
  // NOTE: this launches its own Chromium outside the BrowserPool's concurrency
  // accounting; a scan running on the same host simultaneously will contend for
  // CPU. Acceptable for an on-demand, rate-limited feature — audits are rare.
  const chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless=new", "--disable-gpu", "--disable-dev-shm-usage"],
  });

  try {
    const runnerResult = await withTimeout(
      lighthouse(url, {
        port: chrome.port,
        output: "json",
        logLevel: "error",
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      }),
      timeoutMs,
    );
    if (!runnerResult) {
      throw new LighthouseError("NO_RESULT", "Lighthouse returned no result.");
    }
    return parseLighthouseResult(runnerResult.lhr as unknown as Lhr);
  } catch (err) {
    if (err instanceof LighthouseError) throw err;
    throw new LighthouseError(
      "AUDIT_FAILED",
      err instanceof Error ? err.message.slice(0, 500) : "Lighthouse audit failed.",
    );
  } finally {
    // Always terminate Chrome + clean its temp profile, even on throw/timeout.
    // kill() may return void or a promise depending on chrome-launcher version —
    // await either, and never let cleanup mask the real result/error.
    try {
      await chrome.kill();
    } catch {
      /* ignore cleanup failure */
    }
  }
}
