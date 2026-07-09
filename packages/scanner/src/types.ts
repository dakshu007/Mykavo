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
  /** Conversion elements to check on this page (Phase 9). */
  elements?: MonitoredElementInput[];
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
