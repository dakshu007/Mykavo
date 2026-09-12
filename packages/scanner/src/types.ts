import type { PlatformFingerprint, TechEntry } from "@mykavo/shared";

export type ElementImportance = "NORMAL" | "IMPORTANT" | "CRITICAL";

/** A conversion element to observe on the page (Phase 9). */
export interface MonitoredElementInput {
  /** The MonitoredElement id — used to match baseline vs current results. */
  id: string;
  name: string;
  selector: string;
  importance: ElementImportance;
  expectedExistence: boolean;
  expectedVisibility: boolean;
  expectedText: string | null;
  expectedHref: string | null;
}

/** The observed state of a monitored element on a single scan (Phase 9). */
export interface MonitoredElementCheck extends MonitoredElementInput {
  exists: boolean;
  visible: boolean;
  text: string | null;
  href: string | null;
}

export interface ScanPageOptions {
  /** Navigation timeout in ms. Default 30_000. */
  timeoutMs?: number;
  /** Post-load settle delay in ms after network quiet. Default 1_000. */
  postLoadDelayMs?: number;
  /** Storage key prefix for artifacts (e.g. "ws/<workspaceId>/scan/<scanId>"). */
  artifactPrefix: string;
  /**
   * Prefix for CONTENT-ADDRESSED screenshots, e.g. "ws/<workspaceId>/shot".
   * The object is stored at `<prefix>/<sha256>.jpg`, so a page that looks
   * identical from one scan to the next is stored once and referenced by
   * every snapshot rather than re-uploaded daily. Omit to keep the legacy
   * one-object-per-scan key under `artifactPrefix`.
   */
  screenshotPrefix?: string;
  /** Conversion elements to check on this page (Phase 9). */
  elements?: MonitoredElementInput[];
  /**
   * CSS selectors removed from the DOM before hashing/extraction and absent
   * from the screenshot — excluded from comparison entirely (spec §25).
   * Re-normalized defensively; invalid selectors are skipped per-selector.
   */
  ignoredSelectors?: string[];
  /**
   * CSS selectors covered with a solid block in the screenshot only —
   * content is still compared (spec §25). Invalid selectors are skipped.
   */
  screenshotMasks?: string[];
}

export interface ScannedLink {
  url: string;
  normalizedUrl: string;
  linkType: "INTERNAL" | "EXTERNAL";
}

export interface ScannedScript {
  src: string;
  domain: string;
  isThirdParty: boolean;
}

export interface PageScanResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
  responseTimeMs: number;
  htmlHash: string;
  domHash: string;
  textHash: string;
  screenshotStorageKey: string | null;
  screenshotHash: string | null;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Values: string[];
  structuredDataHash: string | null;
  pageWeightBytes: number;
  requestCount: number;
  links: ScannedLink[];
  scripts: ScannedScript[];
  /**
   * Plugins, theme and core version read off the page's asset URLs, so an
   * update can be named as the cause of a change. `platform: null` when the
   * page shows no sign of a platform we can read - which is a legitimate,
   * common answer, not a failure.
   */
  platformFingerprint: PlatformFingerprint;
  /**
   * What this page is built with - CMS, framework, host, analytics, payments,
   * support tooling. Unlike platformFingerprint this says something on every
   * site, not only WordPress ones.
   */
  technologies: TechEntry[];
  /** Observed state of each requested monitored element (Phase 9). */
  elements: MonitoredElementCheck[];
}

export class ScanPageError extends Error {
  constructor(
    public readonly code:
      | "UNSAFE_URL"
      | "DNS_FAILURE"
      | "NAVIGATION_TIMEOUT"
      | "NAVIGATION_FAILED"
      | "BROWSER_CRASH"
      | "SCREENSHOT_FAILED"
      | "STORAGE_FAILED",
    message: string,
  ) {
    super(message);
    this.name = "ScanPageError";
  }
}
