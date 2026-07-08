export interface ScanPageOptions {
  /** Navigation timeout in ms. Default 30_000. */
  timeoutMs?: number;
  /** Post-load settle delay in ms after network quiet. Default 1_000. */
  postLoadDelayMs?: number;
  /** Storage key prefix for artifacts (e.g. "ws/<workspaceId>/scan/<scanId>"). */
  artifactPrefix: string;
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
