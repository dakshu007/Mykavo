/**
 * Single-page scan (spec §14, §15, §17). Validates the URL through the
 * SSRF guard, navigates with stabilization, extracts a normalized snapshot,
 * and captures a deterministic full-page screenshot.
 */

import { createHash } from "node:crypto";
import type { Browser, Page } from "playwright";
import { assertSafeUrl, UnsafeUrlError, normalizeUrl, isSameOrigin } from "@fluxen/shared";
import { extractInPage, type InPageExtraction } from "./extract";
import type { ArtifactStorage } from "./storage";
import { ScanPageError, type PageScanResult, type ScanPageOptions } from "./types";

const VIEWPORT = { width: 1440, height: 900 };
const MAX_SCREENSHOT_HEIGHT = 8000;
const USER_AGENT =
  "Mozilla/5.0 (compatible; FluxenBot/0.1; +https://fluxen.app/bot) website change detection";

const STABILIZATION_CSS = `
  *, *::before, *::after {
    animation-duration: 0s !important;
    animation-delay: 0s !important;
    transition-duration: 0s !important;
    transition-delay: 0s !important;
    caret-color: transparent !important;
  }
  html { scroll-behavior: auto !important; }
`;

function sha256(data: string | Buffer): string {
  return createHash("sha256").update(data).digest("hex");
}

/** Bounded network-quiet wait: never blocks longer than maxWaitMs (spec §15). */
async function waitForNetworkQuiet(page: Page, maxWaitMs: number): Promise<void> {
  try {
    await page.waitForLoadState("networkidle", { timeout: maxWaitMs });
  } catch {
    // Busy pages never go idle — proceed after the bounded wait.
  }
}

export async function scanPage(
  browser: Browser,
  url: string,
  storage: ArtifactStorage,
  options: ScanPageOptions,
): Promise<PageScanResult> {
  const timeoutMs = options.timeoutMs ?? 30_000;
  const postLoadDelayMs = options.postLoadDelayMs ?? 1_000;

  // SSRF validation — every scanned URL, every time (spec §11).
  let target: URL;
  try {
    target = await assertSafeUrl(url);
  } catch (err) {
    if (err instanceof UnsafeUrlError) {
      throw new ScanPageError(
        err.code === "DNS_FAILURE" ? "DNS_FAILURE" : "UNSAFE_URL",
        err.message,
      );
    }
    throw err;
  }

  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    userAgent: USER_AGENT,
    reducedMotion: "reduce",
  });

  try {
    const page = await context.newPage();

    // Performance accounting via network events.
    let requestCount = 0;
    let pageWeightBytes = 0;
    page.on("request", () => {
      requestCount++;
    });
    page.on("response", (response) => {
      response
        .body()
        .then((body) => {
          pageWeightBytes += body.byteLength;
        })
        .catch(() => {});
    });

    const startedAt = Date.now();
    let response;
    try {
      response = await page.goto(target.href, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Navigation failed.";
      throw new ScanPageError(
        message.includes("Timeout") ? "NAVIGATION_TIMEOUT" : "NAVIGATION_FAILED",
        message.slice(0, 500),
      );
    }
    const responseTimeMs = Date.now() - startedAt;

    if (!response) {
      throw new ScanPageError("NAVIGATION_FAILED", "Navigation returned no response.");
    }

    // Stabilization (spec §15): fonts, bounded network quiet, settle delay,
    // animations disabled.
    await page.addStyleTag({ content: STABILIZATION_CSS }).catch(() => {});
    await page
      .evaluate(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready)
      .catch(() => {});
    await waitForNetworkQuiet(page, 5_000);
    await page.waitForTimeout(postLoadDelayMs);

    const rawHtml = await page.content();
    // tsx/esbuild wrap named functions with a `__name(fn, "name")` helper for
    // stack traces. Passing such a function to page.evaluate serializes those
    // calls into the browser, where `__name` is undefined. Inject the function
    // as source with a local `__name` shim so it resolves in-page.
    const extraction: InPageExtraction = await page.evaluate(
      `(() => { const __name = (fn) => fn; return (${extractInPage.toString()})(); })()`,
    );

    const finalUrl = page.url();
    const base = new URL(finalUrl);

    // Classify links/scripts outside the page context.
    const seenLinks = new Set<string>();
    const links = extraction.links.flatMap((l) => {
      try {
        const u = new URL(l.href);
        const normalized = normalizeUrl(u);
        if (seenLinks.has(normalized)) return [];
        seenLinks.add(normalized);
        return [
          {
            url: l.href,
            normalizedUrl: normalized,
            linkType: isSameOrigin(u, base) ? ("INTERNAL" as const) : ("EXTERNAL" as const),
          },
        ];
      } catch {
        return [];
      }
    });

    const seenScripts = new Set<string>();
    const scripts = extraction.scripts.flatMap((s) => {
      try {
        const u = new URL(s.src);
        const key = normalizeUrl(u, { stripAllParams: true });
        if (seenScripts.has(key)) return [];
        seenScripts.add(key);
        return [{ src: s.src, domain: u.hostname, isThirdParty: !isSameOrigin(u, base) }];
      } catch {
        return [];
      }
    });

    // Deterministic screenshot (spec §17), height-capped.
    let screenshotStorageKey: string | null = null;
    let screenshotHash: string | null = null;
    try {
      const bodyHeight = await page.evaluate(() => document.body?.scrollHeight ?? 0);
      const screenshot = await page.screenshot({
        type: "jpeg",
        quality: 80,
        ...(bodyHeight > MAX_SCREENSHOT_HEIGHT
          ? { clip: { x: 0, y: 0, width: VIEWPORT.width, height: MAX_SCREENSHOT_HEIGHT } }
          : { fullPage: true }),
      });
      screenshotHash = sha256(screenshot);
      screenshotStorageKey = `${options.artifactPrefix}/screenshot.jpg`;
      await storage.put(screenshotStorageKey, screenshot, "image/jpeg");
    } catch (err) {
      // Screenshot failure degrades the snapshot but doesn't void it.
      screenshotStorageKey = null;
      screenshotHash = null;
      if (err instanceof Error && err.message.includes("ENOSPC")) {
        throw new ScanPageError("STORAGE_FAILED", "Artifact storage is full.");
      }
    }

    return {
      url,
      finalUrl,
      httpStatus: response.status(),
      responseTimeMs,
      htmlHash: sha256(rawHtml),
      domHash: sha256(extraction.normalizedDom),
      textHash: sha256(extraction.visibleText),
      screenshotStorageKey,
      screenshotHash,
      title: extraction.title,
      metaDescription: extraction.metaDescription,
      canonicalUrl: extraction.canonicalUrl,
      robotsMeta: extraction.robotsMeta,
      h1Values: extraction.h1Values,
      structuredDataHash: extraction.structuredData ? sha256(extraction.structuredData) : null,
      pageWeightBytes,
      requestCount,
      links,
      scripts,
    };
  } finally {
    await context.close().catch(() => {});
  }
}
