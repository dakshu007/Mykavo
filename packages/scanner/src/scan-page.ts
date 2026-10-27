/**
 * Single-page scan (spec §14, §15, §17). Validates the URL through the
 * SSRF guard, navigates with stabilization, extracts a normalized snapshot,
 * and captures a deterministic full-page screenshot.
 *
 * Egress (spec §11) is enforced in three layers:
 *  1. context.route checks every request the page makes (scheme + guard,
 *     DNS cached per scan) and aborts the unsafe ones. Playwright only calls
 *     the handler for the FIRST url of a redirect chain, so this layer alone
 *     does not cover redirects.
 *  2. The browser's egress proxy (egress-proxy.ts, set by BrowserPool) sees
 *     every connection, redirects and WebSockets included, and connects only
 *     to vetted addresses - this closes the redirect and DNS-rebinding gaps.
 *  3. The final document URL is revalidated before anything is stored.
 */

import { createHash } from "node:crypto";
import type { Browser, Locator, Page } from "playwright";
import {
  assertSafeUrl,
  createSafeHostResolver,
  UnsafeUrlError,
  normalizeUrl,
  fingerprintPlatform,
  detectTechnologies,
  PROBED_GLOBALS,
  PROBED_SELECTORS,
  isSameOrigin,
  parseSelectorList,
} from "@mykavo/shared";
import {
  extractInPage,
  checkElementsInPage,
  removeElementsInPage,
  filterValidSelectorsInPage,
  type InPageExtraction,
  type ElementObservation,
} from "./extract";
import type { ArtifactStorage } from "./storage";
import {
  ScanPageError,
  type PageResourceLimit,
  type PageScanResult,
  type ScanPageOptions,
  type MonitoredElementCheck,
} from "./types";

const VIEWPORT = { width: 1440, height: 900 };
/**
 * Per-page resource budget (spec §43, §60). Past either limit every further
 * request is aborted and the result records which limit was hit. A real
 * page sits far below both; the budget exists for pages that never stop
 * loading (infinite feeds, media loops) or are built to burn our bandwidth.
 */
export const MAX_REQUESTS_PER_PAGE = 300;
export const MAX_PAGE_BYTES = 25 * 1024 * 1024;
const MAX_SCREENSHOT_HEIGHT = 8000;
/**
 * Stored screenshot budget (spec §60).
 *
 * Every monitored page writes one of these on every scan that changes it, so
 * the figure multiplies by pages x scans x customers - it is the main lever
 * on storage cost. 150KB is comfortably enough for a legible full-page
 * screenshot at these dimensions and roughly a third of what an unconstrained
 * Playwright JPEG of a long, image-heavy page produces.
 */
export const MAX_SCREENSHOT_BYTES = 150 * 1024;

/**
 * Total pixels a stored screenshot may cover.
 *
 * Quality alone cannot rescue a 1440x8000 page: at 11.5 megapixels even
 * aggressive JPEG lands in the megabytes, which is where the 2MB objects in
 * the bucket came from. Past this, the image is scaled down as a whole, which
 * costs detail evenly rather than blurring everything.
 */
const MAX_SCREENSHOT_PIXELS = 1440 * 2600;

/**
 * The quality/scale ladder, tried in order until one lands under budget.
 *
 * Quality first, because re-encoding preserves layout and text position -
 * what the visual diff actually compares. Scale is the later resort, since
 * halving the width halves the pixels a diff can see.
 */
const COMPRESSION_LADDER: { quality: number; width?: number }[] = [
  { quality: 72 },
  { quality: 62 },
  { quality: 52 },
  { quality: 44 },
  { quality: 60, width: 1280 },
  { quality: 52, width: 1080 },
  { quality: 46, width: 900 },
  { quality: 40, width: 720 },
];

/**
 * Re-encode a screenshot down to the storage budget.
 *
 * Returns the original untouched when it is already small enough. Otherwise
 * it walks the ladder and returns the FIRST result under budget, so a page
 * that only slightly overshoots keeps almost all of its quality.
 *
 * The previous version stopped at one fixed downscale and, if that still
 * overshot, stored whatever it had - which is how multi-megabyte objects got
 * into the bucket despite a budget being nominally in force. It now also
 * scales anything with an absurd pixel count before encoding, and reports
 * whether it actually succeeded so the caller can say so out loud rather
 * than quietly banking the cost.
 */
export async function compressScreenshot(
  raw: Buffer,
): Promise<{ buffer: Buffer; withinBudget: boolean }> {
  if (raw.length <= MAX_SCREENSHOT_BYTES) return { buffer: raw, withinBudget: true };

  // sharp is ESM/worker-side only - dynamic import keeps web bundles clean.
  const { default: sharp } = await import("sharp");

  // One decode of the source, reused for every rung of the ladder.
  const metadata = await sharp(raw).metadata();
  const pixels = (metadata.width ?? 0) * (metadata.height ?? 0);
  const pixelCapWidth =
    pixels > MAX_SCREENSHOT_PIXELS && metadata.width && metadata.height
      ? Math.max(640, Math.round(metadata.width * Math.sqrt(MAX_SCREENSHOT_PIXELS / pixels)))
      : undefined;

  let smallest = raw;
  for (const rung of COMPRESSION_LADDER) {
    // The pixel cap applies to every rung, and a rung's own width only
    // narrows it further - never widens it back past the cap.
    const width = pixelCapWidth
      ? Math.min(pixelCapWidth, rung.width ?? pixelCapWidth)
      : rung.width;

    let pipeline = sharp(raw);
    if (width) pipeline = pipeline.resize({ width, withoutEnlargement: true });
    const out = await pipeline.jpeg({ quality: rung.quality, mozjpeg: true }).toBuffer();

    if (out.length < smallest.length) smallest = out;
    if (out.length <= MAX_SCREENSHOT_BYTES) return { buffer: out, withinBudget: true };
  }

  // Everything overshot. Store the smallest we managed rather than losing the
  // screenshot entirely - a snapshot without an image cannot be compared at
  // all - but tell the truth about it.
  return { buffer: smallest, withinBudget: smallest.length <= MAX_SCREENSHOT_BYTES };
}
// Solid block painted over masked elements (spec §25). A fixed opaque color
// keeps masked regions byte-identical between scans regardless of content.
const MASK_COLOR = "#0f172a";
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyKavoBot/0.1; +https://mykavo.app/bot) website change detection";

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
    // Busy pages never go idle - proceed after the bounded wait.
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

  // SSRF validation - every scanned URL, every time (spec §11).
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
    // Nothing a scanned page offers is ever saved to the worker's disk.
    acceptDownloads: false,
    // Service-worker fetches bypass context.route; a monitoring snapshot
    // never needs one.
    serviceWorkers: "block",
  });

  // One DNS answer per host for the whole page scan: a page with 150
  // requests to 6 hosts costs 6 lookups, not 150.
  const resolver = createSafeHostResolver();
  const isSafe = async (candidate: string): Promise<boolean> => {
    try {
      await assertSafeUrl(candidate, { resolver });
      return true;
    } catch {
      return false;
    }
  };
  const unsafeDestination = (): ScanPageError =>
    new ScanPageError(
      "UNSAFE_URL",
      "The page redirected to an address MyKavo does not connect to (a private, local or reserved network).",
    );

  // Performance accounting and the per-page budget.
  let requestCount = 0;
  let pageWeightBytes = 0;
  let resourceLimit: PageResourceLimit | null = null;
  let page: Page | null = null;
  let blockedMainNavigation = false;

  const addBytes = (bytes: number) => {
    if (!(bytes > 0)) return;
    pageWeightBytes += bytes;
    if (pageWeightBytes > MAX_PAGE_BYTES && resourceLimit === null) resourceLimit = "BYTES";
  };
  const isMainFrameNavigation = (request: { isNavigationRequest(): boolean; frame(): unknown }): boolean => {
    try {
      return request.isNavigationRequest() && page !== null && request.frame() === page.mainFrame();
    } catch {
      // Service-worker requests have no frame.
      return false;
    }
  };

  try {
    // Layer 1: every request the page starts (documents, frames,
    // subresources, fetch/XHR) is checked before it leaves the browser.
    await context.route("**/*", async (route) => {
      const request = route.request();
      const requestUrl = request.url();
      // data: and blob: never touch the network.
      if (requestUrl.startsWith("data:") || requestUrl.startsWith("blob:")) {
        await route.continue().catch(() => {});
        return;
      }
      if (!(await isSafe(requestUrl))) {
        if (isMainFrameNavigation(request)) blockedMainNavigation = true;
        await route.abort("blockedbyclient").catch(() => {});
        return;
      }
      if (resourceLimit === null && requestCount >= MAX_REQUESTS_PER_PAGE) resourceLimit = "REQUESTS";
      if (resourceLimit !== null) {
        await route.abort("blockedbyclient").catch(() => {});
        return;
      }
      requestCount++;
      await route.continue().catch(() => {});
    });

    const activePage = await context.newPage();
    page = activePage;

    // Page weight from decoded bytes as they arrive (Network.dataReceived),
    // so nothing is buffered just to be measured and the byte budget trips
    // while a huge response is still streaming. Falls back to transfer
    // sizes if the CDP session is unavailable.
    let countingViaCdp = false;
    try {
      const cdp = await context.newCDPSession(activePage);
      await cdp.send("Network.enable");
      cdp.on("Network.dataReceived", (event) => addBytes(event.dataLength));
      countingViaCdp = true;
    } catch {
      countingViaCdp = false;
    }
    if (!countingViaCdp) {
      activePage.on("requestfinished", (request) => {
        request
          .sizes()
          .then((sizes) => addBytes(sizes.responseBodySize))
          .catch(() => {});
      });
    }

    // The last main-frame navigation that failed, to tell "the egress proxy
    // refused a redirect hop" apart from an ordinary network failure.
    let failedNavigationUrl: string | null = null;
    activePage.on("requestfailed", (request) => {
      if (isMainFrameNavigation(request)) failedNavigationUrl = request.url();
    });

    const startedAt = Date.now();
    let response;
    try {
      response = await activePage.goto(target.href, {
        waitUntil: "domcontentloaded",
        timeout: timeoutMs,
      });
    } catch (err) {
      if (blockedMainNavigation || (failedNavigationUrl !== null && !(await isSafe(failedNavigationUrl)))) {
        throw unsafeDestination();
      }
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

    // Layer 3: the document we are about to read must itself be on a safe
    // address. A plain-HTTP redirect to an internal host comes back from the
    // proxy as a 403 "response", so the URL is what gives it away.
    if (!(await isSafe(response.url()))) throw unsafeDestination();

    // Response headers identify the host and CDN, which no amount of reading
    // the HTML can. Playwright already lowercases the keys. Wrapped because a
    // response whose body never arrived can throw here, and a missing header
    // must degrade the stack report, not fail the scan.
    let responseHeaders: Record<string, string> = {};
    try {
      responseHeaders = response.headers();
    } catch {
      responseHeaders = {};
    }

    // Stabilization (spec §15): fonts, bounded network quiet, settle delay,
    // animations disabled.
    await activePage.addStyleTag({ content: STABILIZATION_CSS }).catch(() => {});
    await activePage
      .evaluate(() => (document as Document & { fonts: { ready: Promise<unknown> } }).fonts.ready)
      .catch(() => {});
    await waitForNetworkQuiet(activePage, 5_000);
    await activePage.waitForTimeout(postLoadDelayMs);

    const rawHtml = await activePage.content();

    // Ignored selectors (spec §25/§36): remove matching elements from the
    // live DOM after stabilization and BEFORE extraction, so they are
    // excluded from DOM/text hashing, link/script extraction, element checks,
    // and the screenshot. Removal (vs visibility:hidden) also collapses
    // variable-height noise - a rotating banner can't shift layout between
    // scans. htmlHash above intentionally still covers the raw page. Invalid
    // selectors are skipped per-selector in-page; a failed evaluate degrades
    // to "nothing removed" rather than failing the scan.
    const ignoredSelectors = parseSelectorList(options.ignoredSelectors);
    if (ignoredSelectors.length > 0) {
      await activePage
        .evaluate(
          `(() => { const __name = (fn) => fn; const selectors = ${JSON.stringify(ignoredSelectors)}; return (${removeElementsInPage.toString()})(selectors); })()`,
        )
        .catch(() => {});
    }

    // tsx/esbuild wrap named functions with a `__name(fn, "name")` helper for
    // stack traces. Passing such a function to page.evaluate serializes those
    // calls into the browser, where `__name` is undefined. Inject the function
    // as source with a local `__name` shim so it resolves in-page.
    const extraction: InPageExtraction = await activePage.evaluate(
      `(() => { const __name = (fn) => fn; return (${extractInPage.toString()})(` +
        `${JSON.stringify(PROBED_GLOBALS)}, ${JSON.stringify(PROBED_SELECTORS)}); })()`,
    );

    // Conversion element checks (spec §23, Phase 9). Evaluated on the same
    // stabilized page, injected as source with the __name shim like extraction.
    const elementInputs = options.elements ?? [];
    let elements: MonitoredElementCheck[] = [];
    if (elementInputs.length > 0) {
      const probes = elementInputs.map((e) => ({ id: e.id, selector: e.selector }));
      const observed: ElementObservation[] = await activePage.evaluate(
        `(() => { const __name = (fn) => fn; const probes = ${JSON.stringify(probes)}; return (${checkElementsInPage.toString()})(probes); })()`,
      );
      const byId = new Map(observed.map((o) => [o.id, o]));
      elements = elementInputs.map((e) => {
        const o = byId.get(e.id);
        return {
          ...e,
          exists: o?.exists ?? false,
          visible: o?.visible ?? false,
          text: o?.text ?? null,
          href: o?.href ?? null,
        };
      });
    }

    // Revalidated again here: client-side navigation during stabilization
    // can move the page after goto returned.
    const finalUrl = activePage.url();
    if (!(await isSafe(finalUrl))) throw unsafeDestination();
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

    // Platform fingerprint: which plugins, theme and core version the page is
    // built on, read off the asset URLs. Stylesheets are included because the
    // theme's version lives in one and nowhere else; they are used here and
    // then discarded - only the derived fingerprint is stored, which is a few
    // dozen bytes against hundreds of rows of asset URLs.
    const platformFingerprint = fingerprintPlatform({
      assetUrls: [
        ...extraction.scripts.map((s) => s.src),
        ...extraction.stylesheets.map((l) => l.href),
      ],
      generators: extraction.generators,
      comments: extraction.versionComments,
    });

    // What is this site built with? Broader than the WordPress fingerprint
    // above, and the only one of the two that says anything on the ~57% of the
    // web that is not WordPress.
    const technologies = detectTechnologies({
      assetUrls: [
        ...extraction.scripts.map((s) => s.src),
        ...extraction.stylesheets.map((l) => l.href),
      ],
      generators: extraction.generators,
      globals: extraction.presentGlobals,
      selectors: extraction.matchedSelectors,
      headers: responseHeaders,
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

    // Screenshot masks (spec §25/§36): cover matching elements with a solid
    // block in the screenshot only - content is still compared. Playwright's
    // native `mask` option is used (with a fixed maskColor) because it tracks
    // element geometry at capture time - correct through full-page scroll
    // stitching and fixed/sticky positioning, which hand-placed absolute
    // overlays get wrong - and cleans up after itself. Selectors are
    // pre-filtered in-page so invalid user CSS never throws at capture.
    const maskSelectors = parseSelectorList(options.screenshotMasks);
    let maskLocators: Locator[] = [];
    if (maskSelectors.length > 0) {
      const validMaskSelectors = await activePage
        .evaluate<string[]>(
          `(() => { const __name = (fn) => fn; const selectors = ${JSON.stringify(maskSelectors)}; return (${filterValidSelectorsInPage.toString()})(selectors); })()`,
        )
        .catch((): string[] => []);
      maskLocators = validMaskSelectors.map((selector) => activePage.locator(selector));
    }

    // Deterministic screenshot (spec §17), height-capped. Stored artifacts
    // are compressed to ≤200 KB (storage cost control, spec §60) - the hash
    // is computed on the FINAL stored bytes so baseline and current always
    // compare through the identical encode pipeline.
    let screenshotStorageKey: string | null = null;
    let screenshotHash: string | null = null;
    try {
      const bodyHeight = await activePage.evaluate(() => document.body?.scrollHeight ?? 0);
      const raw = await activePage.screenshot({
        type: "jpeg",
        quality: 80,
        ...(maskLocators.length > 0 ? { mask: maskLocators, maskColor: MASK_COLOR } : {}),
        ...(bodyHeight > MAX_SCREENSHOT_HEIGHT
          ? { clip: { x: 0, y: 0, width: VIEWPORT.width, height: MAX_SCREENSHOT_HEIGHT } }
          : { fullPage: true }),
      });
      const compressed = await compressScreenshot(raw);
      const screenshot = compressed.buffer;
      if (!compressed.withinBudget) {
        // Worth a line in the log: it means a page defeated the whole ladder,
        // and storage is being spent that the budget says should not be.
        console.warn(
          `[scan-page] screenshot over budget after compression: ${screenshot.length} bytes for ${url}`,
        );
      }
      screenshotHash = sha256(screenshot);

      if (options.screenshotPrefix) {
        // CONTENT-ADDRESSED: the key IS the hash of the stored bytes, so two
        // scans of an unchanged page resolve to the same object. Most
        // monitored pages look identical for weeks at a time, and storing
        // each of those days separately was the single largest storage cost
        // in the product - a year of daily scans kept 365 copies of one
        // unchanging pricing page.
        //
        // Many snapshot rows may now reference one object, so deletion is
        // reference-counted in the retention sweep. Never delete an object
        // here on the assumption it belongs to this scan alone.
        screenshotStorageKey = `${options.screenshotPrefix}/${screenshotHash}.jpg`;
        // A miss costs one redundant upload; never a lost screenshot.
        if (!(await storage.exists(screenshotStorageKey))) {
          await storage.put(screenshotStorageKey, screenshot, "image/jpeg");
        }
      } else {
        // Legacy one-object-per-scan layout, kept so existing callers and the
        // objects already in the bucket keep working unchanged.
        screenshotStorageKey = `${options.artifactPrefix}/screenshot.jpg`;
        await storage.put(screenshotStorageKey, screenshot, "image/jpeg");
      }
    } catch (err) {
      // Screenshot failure degrades the snapshot but doesn't void it.
      screenshotStorageKey = null;
      screenshotHash = null;
      if (err instanceof Error && err.message.includes("ENOSPC")) {
        throw new ScanPageError("STORAGE_FAILED", "Artifact storage is full.");
      }
    }

    if (resourceLimit !== null) {
      console.warn(
        `[scan-page] resource budget hit (${resourceLimit}): ${requestCount} requests, ${pageWeightBytes} bytes for ${url}`,
      );
    }

    return {
      url,
      finalUrl,
      httpStatus: response.status(),
      responseTimeMs,
      htmlHash: sha256(rawHtml),
      domHash: sha256(extraction.normalizedDom),
      textHash: sha256(extraction.visibleText),
      visibleLines: extraction.visibleLines,
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
      resourceLimit,
      links,
      scripts,
      platformFingerprint,
      technologies,
      elements,
    };
  } finally {
    await context.close().catch(() => {});
  }
}
