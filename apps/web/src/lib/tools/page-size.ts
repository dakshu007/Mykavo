import { attr } from "./html";
import { siteHost } from "./broken-links";

/**
 * Static page-weight analysis for the free Page Size Checker.
 *
 * This reads the delivered HTML only - it is not a browser. It sees the
 * resources the HTML references directly (scripts, stylesheets, images,
 * preloaded fonts, iframes) but not files that CSS or JavaScript load later,
 * so real request counts and weight are usually higher. The MyKavo scanner
 * measures the real thing in Playwright; this tool is the honest lightweight
 * version.
 */

/** Resources whose size we download per request (cost + time cap). */
export const MAX_RESOURCES_MEASURED = 40;
/** Per-resource download cap. */
export const MAX_RESOURCE_BYTES = 5 * 1024 * 1024;

const TOO_LARGE_NOTE = "Larger than 5 MB, not fully downloaded";

export type ResourceType = "script" | "stylesheet" | "image" | "font" | "iframe";

export const RESOURCE_TYPES: readonly ResourceType[] = ["script", "stylesheet", "image", "font", "iframe"];

export interface ExtractedResource {
  /** Absolute URL, fragment removed - the dedupe key. */
  url: string;
  type: ResourceType;
  /** Same site as the page (www and subdomains of the page's host count). */
  firstParty: boolean;
}

/** First URL in a srcset ("a.jpg 1x, b.jpg 2x" -> "a.jpg"). */
export function firstSrcsetCandidate(srcset: string): string | null {
  const first = srcset.split(",")[0]?.trim().split(/\s+/)[0];
  return first ? first : null;
}

const PRELOAD_AS: Record<string, ResourceType> = {
  script: "script",
  style: "stylesheet",
  image: "image",
  font: "font",
};

function isFirstParty(resource: URL, pageHost: string): boolean {
  const host = siteHost(resource);
  return host === pageHost || host.endsWith(`.${pageHost}`);
}

/**
 * Every external resource the HTML references directly, deduped by URL in
 * document order. Inline data: URIs are skipped - their bytes are already
 * part of the HTML size.
 */
export function extractResources(html: string, pageUrl: string): ExtractedResource[] {
  const pageHost = siteHost(new URL(pageUrl));
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
  let base = pageUrl;
  const baseHref = baseTag ? attr(baseTag, "href") : null;
  if (baseHref) {
    try {
      base = new URL(baseHref, pageUrl).href;
    } catch {
      // keep page URL
    }
  }
  const clean = html.replace(/<!--[\s\S]*?-->/g, " ");

  const byUrl = new Map<string, ExtractedResource>();
  const add = (raw: string | null, type: ResourceType) => {
    const value = raw?.trim();
    if (!value) return;
    let u: URL;
    try {
      u = new URL(value, base);
    } catch {
      return;
    }
    if (u.protocol !== "http:" && u.protocol !== "https:") return;
    u.hash = "";
    if (!byUrl.has(u.href)) byUrl.set(u.href, { url: u.href, type, firstParty: isFirstParty(u, pageHost) });
  };

  for (const m of clean.matchAll(/<(script|link|img|iframe)\b[^>]*>/gi)) {
    const tag = m[0];
    switch (m[1].toLowerCase()) {
      case "script":
        add(attr(tag, "src"), "script");
        break;
      case "iframe":
        add(attr(tag, "src"), "iframe");
        break;
      case "img": {
        const src = attr(tag, "src");
        const srcset = attr(tag, "srcset");
        add(src && !src.startsWith("data:") ? src : srcset ? firstSrcsetCandidate(srcset) : null, "image");
        break;
      }
      case "link": {
        const rel = attr(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
        const href = attr(tag, "href");
        if (rel.includes("stylesheet")) add(href, "stylesheet");
        else if (rel.includes("modulepreload")) add(href, "script");
        else if (rel.includes("preload")) {
          const as = PRELOAD_AS[attr(tag, "as")?.toLowerCase() ?? ""];
          if (!as) break;
          const imagesrcset = attr(tag, "imagesrcset");
          add(href ?? (imagesrcset ? firstSrcsetCandidate(imagesrcset) : null), as);
        }
        break;
      }
    }
  }
  return [...byUrl.values()];
}

/** Outcome of measuring one resource. */
export type ResourceSize =
  | { kind: "measured"; bytes: number; status: number }
  | { kind: "too-large" }
  | { kind: "failed"; reason: string }
  | { kind: "not-measured" };

export interface ResourceResult extends ExtractedResource {
  /** Uncompressed size in bytes, null when unknown. */
  bytes: number | null;
  note: string | null;
}

export interface TypeBreakdown {
  type: ResourceType;
  count: number;
  firstParty: number;
  thirdParty: number;
  /** Sum of the measured sizes of this type. */
  knownBytes: number;
  unknown: number;
}

export interface Guidance {
  id: "html" | "total" | "requests" | "single";
  ok: boolean;
  label: string;
  detail: string;
}

export interface PageSizeReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  html: {
    /** Uncompressed HTML size. */
    bytes: number;
    /** Compressed bytes on the wire, when the server said (content-encoding + content-length). */
    transferBytes: number | null;
    encoding: string | null;
  };
  /** HTML document + every referenced resource. */
  requests: number;
  firstPartyRequests: number;
  thirdPartyRequests: number;
  /** HTML + all measured resources (uncompressed). */
  knownBytes: number;
  measured: number;
  unknown: number;
  /** Resources beyond MAX_RESOURCES_MEASURED were counted but not downloaded. */
  capped: boolean;
  byType: TypeBreakdown[];
  heaviest: ResourceResult[];
  resources: ResourceResult[];
  guidance: Guidance[];
}

export const THRESHOLDS = {
  htmlBytes: 100 * 1024,
  totalBytes: 3 * 1024 * 1024,
  requests: 80,
  singleBytes: 1024 * 1024,
} as const;

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function toResult(r: ExtractedResource, size: ResourceSize | undefined): ResourceResult {
  switch (size?.kind) {
    case "measured":
      return size.status >= 200 && size.status < 300
        ? { ...r, bytes: size.bytes, note: null }
        : { ...r, bytes: null, note: `Returned HTTP ${size.status}` };
    case "too-large":
      return { ...r, bytes: null, note: TOO_LARGE_NOTE };
    case "failed":
      return { ...r, bytes: null, note: size.reason };
    default:
      return { ...r, bytes: null, note: "Not measured" };
  }
}

export function buildPageSizeReport(input: {
  url: string;
  finalUrl: string;
  httpStatus: number;
  htmlBytes: number;
  contentEncoding: string | null;
  contentLength: string | null;
  resources: ExtractedResource[];
  /** Same order as `resources`; shorter when the list was capped. */
  sizes: ResourceSize[];
}): PageSizeReport {
  const encoding = input.contentEncoding?.trim().toLowerCase() || null;
  const length = input.contentLength ? Number(input.contentLength) : NaN;
  const transferBytes =
    encoding && encoding !== "identity" && Number.isFinite(length) && length > 0 ? length : null;

  const resources = input.resources.map((r, i) => toResult(r, input.sizes[i]));
  const measured = resources.filter((r) => r.bytes !== null);

  const byType: TypeBreakdown[] = RESOURCE_TYPES.map((type) => {
    const ofType = resources.filter((r) => r.type === type);
    return {
      type,
      count: ofType.length,
      firstParty: ofType.filter((r) => r.firstParty).length,
      thirdParty: ofType.filter((r) => !r.firstParty).length,
      knownBytes: ofType.reduce((sum, r) => sum + (r.bytes ?? 0), 0),
      unknown: ofType.filter((r) => r.bytes === null).length,
    };
  }).filter((t) => t.count > 0);

  const knownBytes = input.htmlBytes + measured.reduce((sum, r) => sum + (r.bytes ?? 0), 0);
  const requests = 1 + resources.length;
  const firstPartyRequests = 1 + resources.filter((r) => r.firstParty).length;
  const heaviest = [...measured].sort((a, b) => (b.bytes ?? 0) - (a.bytes ?? 0)).slice(0, 10);
  const tooLarge = resources.filter((r) => r.note === TOO_LARGE_NOTE).length;
  const largest = heaviest[0];

  const guidance: Guidance[] = [
    {
      id: "html",
      ok: input.htmlBytes <= THRESHOLDS.htmlBytes,
      label: `HTML document: ${formatBytes(input.htmlBytes)}`,
      detail:
        input.htmlBytes <= THRESHOLDS.htmlBytes
          ? "Under 100 KB uncompressed, a common rule of thumb for a lean HTML document."
          : "Over 100 KB uncompressed. Large inline scripts, styles, SVGs or embedded data are the usual cause.",
    },
    {
      id: "total",
      ok: knownBytes <= THRESHOLDS.totalBytes && tooLarge === 0,
      label: `Measured weight: ${formatBytes(knownBytes)}`,
      detail:
        knownBytes <= THRESHOLDS.totalBytes && tooLarge === 0
          ? "Under 3 MB for what we could measure. Files loaded later by CSS or JavaScript aren't included."
          : "Over 3 MB, a rough point where pages start to feel slow on mobile connections. Images are the usual place to start.",
    },
    {
      id: "requests",
      ok: requests <= THRESHOLDS.requests,
      label: `Requests in the HTML: ${requests}`,
      detail:
        requests <= THRESHOLDS.requests
          ? "Under about 80. A real browser makes more once CSS and scripts load their own files."
          : "Over about 80 before CSS and scripts load anything themselves. Combining or removing files helps.",
    },
    {
      id: "single",
      ok: !largest || ((largest.bytes ?? 0) <= THRESHOLDS.singleBytes && tooLarge === 0),
      label: largest ? `Largest file: ${formatBytes(largest.bytes ?? 0)}` : "Largest file: none measured",
      detail:
        !largest || ((largest.bytes ?? 0) <= THRESHOLDS.singleBytes && tooLarge === 0)
          ? "No single measured file is over 1 MB."
          : "At least one file is over 1 MB. For images, resizing and modern formats like WebP or AVIF usually cut this sharply.",
    },
  ];

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    html: { bytes: input.htmlBytes, transferBytes, encoding },
    requests,
    firstPartyRequests,
    thirdPartyRequests: requests - firstPartyRequests,
    knownBytes,
    measured: measured.length,
    unknown: resources.length - measured.length,
    capped: resources.length > input.sizes.length,
    byType,
    heaviest,
    resources,
    guidance,
  };
}
