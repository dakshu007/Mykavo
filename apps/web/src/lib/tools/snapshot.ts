/**
 * Deterministic page snapshot extraction + comparison for the free
 * Website Change Detector (Phase 0). Regex-based extraction is sufficient
 * here; the production scanner (Phase 3) uses Playwright + a real DOM.
 */

import { normalizeUrl, resolveHref, isSameOrigin } from "@/lib/url";
import type { SafeFetchResult } from "@/lib/security/ssrf";

export interface ScriptInfo {
  src: string;
  domain: string;
  isThirdParty: boolean;
  service: string | null;
}

export interface PageToolSnapshot {
  url: string;
  finalUrl: string;
  fetchedAt: string;
  httpStatus: number;
  responseTimeMs: number;
  redirectChain: Array<{ url: string; status: number }>;
  pageWeightBytes: number;
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  h1Values: string[];
  internalLinkCount: number;
  externalLinkCount: number;
  scripts: ScriptInfo[];
}

const KNOWN_SERVICES: Array<[RegExp, string]> = [
  [/googletagmanager\.com/i, "Google Tag Manager"],
  [/google-analytics\.com|googleanalytics/i, "Google Analytics"],
  [/connect\.facebook\.net/i, "Meta Pixel"],
  [/js\.stripe\.com/i, "Stripe"],
  [/hotjar\.com/i, "Hotjar"],
  [/intercom(?:cdn)?\.(io|com)/i, "Intercom"],
  [/hs-scripts\.com|hubspot/i, "HubSpot"],
  [/clarity\.ms/i, "Microsoft Clarity"],
  [/plausible\.io/i, "Plausible"],
];

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function stripTags(s: string): string {
  return decodeEntities(s.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

export function extractSnapshot(fetched: SafeFetchResult, requestedUrl: string): PageToolSnapshot {
  const html = fetched.body;
  const base = fetched.finalUrl;

  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) || null : null;

  let metaDescription: string | null = null;
  let robotsMeta: string | null = null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attr(tag, "name")?.toLowerCase();
    if (name === "description" && metaDescription === null) {
      metaDescription = attr(tag, "content");
    } else if (name === "robots" && robotsMeta === null) {
      robotsMeta = attr(tag, "content");
    }
  }

  let canonicalUrl: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (attr(tag, "rel")?.toLowerCase() === "canonical") {
      canonicalUrl = attr(tag, "href");
      break;
    }
  }

  const h1Values = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) ?? [])
    .map((h) => stripTags(h.replace(/<\/?h1\b[^>]*>/gi, "")))
    .filter(Boolean)
    .slice(0, 10);

  const baseUrl = new URL(base);
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  for (const tag of html.match(/<a\b[^>]*>/gi) ?? []) {
    const href = attr(tag, "href");
    if (!href || href.startsWith("#") || /^(mailto:|tel:|javascript:)/i.test(href)) continue;
    const resolved = resolveHref(href, base);
    if (!resolved || (resolved.protocol !== "http:" && resolved.protocol !== "https:")) continue;
    if (isSameOrigin(resolved, baseUrl)) internalLinkCount++;
    else externalLinkCount++;
  }

  const scripts: ScriptInfo[] = [];
  const seenScripts = new Set<string>();
  for (const tag of html.match(/<script\b[^>]*>/gi) ?? []) {
    const src = attr(tag, "src");
    if (!src) continue;
    const resolved = resolveHref(src, base);
    if (!resolved) continue;
    const key = normalizeUrl(resolved, { stripAllParams: true });
    if (seenScripts.has(key)) continue;
    seenScripts.add(key);
    const service = KNOWN_SERVICES.find(([re]) => re.test(resolved.href))?.[1] ?? null;
    scripts.push({
      src: resolved.href,
      domain: resolved.hostname,
      isThirdParty: !isSameOrigin(resolved, baseUrl),
      service,
    });
  }

  return {
    url: requestedUrl,
    finalUrl: fetched.finalUrl,
    fetchedAt: new Date().toISOString(),
    httpStatus: fetched.status,
    responseTimeMs: fetched.responseTimeMs,
    redirectChain: fetched.redirectChain,
    pageWeightBytes: fetched.bodyBytes,
    title,
    metaDescription,
    canonicalUrl,
    robotsMeta,
    h1Values,
    internalLinkCount,
    externalLinkCount,
    scripts,
  };
}

/* ---------- Comparison ---------- */

export type DiffSeverity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

export interface SnapshotDiff {
  category: string;
  label: string;
  previous: string;
  current: string;
  severity: DiffSeverity;
}

function fmt(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === "") return "—";
  return String(v);
}

/** Deterministic, severity-hinted comparison — mirrors spec §19/§21/§22 rules. */
export function diffSnapshots(prev: PageToolSnapshot, curr: PageToolSnapshot): SnapshotDiff[] {
  const diffs: SnapshotDiff[] = [];
  const add = (
    category: string,
    label: string,
    previous: string,
    current: string,
    severity: DiffSeverity,
  ) => diffs.push({ category, label, previous, current, severity });

  // Availability
  if (prev.httpStatus !== curr.httpStatus) {
    const wasOk = prev.httpStatus >= 200 && prev.httpStatus < 300;
    const nowBroken = curr.httpStatus >= 400;
    add(
      "Availability",
      "HTTP status",
      fmt(prev.httpStatus),
      fmt(curr.httpStatus),
      wasOk && nowBroken ? "CRITICAL" : "HIGH",
    );
  }
  if (normalizeUrl(prev.finalUrl) !== normalizeUrl(curr.finalUrl)) {
    add("Availability", "Final URL", prev.finalUrl, curr.finalUrl, "HIGH");
  } else if (prev.redirectChain.length === 0 && curr.redirectChain.length > 0) {
    add(
      "Availability",
      "Redirect behavior",
      "No redirect",
      `${curr.redirectChain.length} redirect(s)`,
      "MEDIUM",
    );
  }

  // SEO
  if ((prev.title ?? "") !== (curr.title ?? "")) {
    add("SEO", "Title", fmt(prev.title), fmt(curr.title), curr.title ? "MEDIUM" : "HIGH");
  }
  if ((prev.metaDescription ?? "") !== (curr.metaDescription ?? "")) {
    add(
      "SEO",
      "Meta description",
      fmt(prev.metaDescription),
      fmt(curr.metaDescription),
      curr.metaDescription ? "LOW" : "MEDIUM",
    );
  }
  if ((prev.canonicalUrl ?? "") !== (curr.canonicalUrl ?? "")) {
    add("SEO", "Canonical URL", fmt(prev.canonicalUrl), fmt(curr.canonicalUrl), "HIGH");
  }
  if ((prev.robotsMeta ?? "") !== (curr.robotsMeta ?? "")) {
    const becameNoindex =
      !/noindex/i.test(prev.robotsMeta ?? "") && /noindex/i.test(curr.robotsMeta ?? "");
    add(
      "SEO",
      "Robots meta",
      fmt(prev.robotsMeta),
      fmt(curr.robotsMeta),
      becameNoindex ? "CRITICAL" : "MEDIUM",
    );
  }
  if (prev.h1Values.join("|") !== curr.h1Values.join("|")) {
    add(
      "SEO",
      "H1 headings",
      prev.h1Values.join(" · ") || "—",
      curr.h1Values.join(" · ") || "—",
      curr.h1Values.length === 0 ? "HIGH" : "MEDIUM",
    );
  }

  // Links
  if (prev.internalLinkCount !== curr.internalLinkCount) {
    const dropped = curr.internalLinkCount < prev.internalLinkCount;
    const delta = Math.abs(curr.internalLinkCount - prev.internalLinkCount);
    const bigDrop = dropped && delta / Math.max(prev.internalLinkCount, 1) > 0.3;
    add(
      "Links",
      "Internal links",
      fmt(prev.internalLinkCount),
      fmt(curr.internalLinkCount),
      bigDrop ? "HIGH" : "INFO",
    );
  }
  if (prev.externalLinkCount !== curr.externalLinkCount) {
    add("Links", "External links", fmt(prev.externalLinkCount), fmt(curr.externalLinkCount), "INFO");
  }

  // Scripts
  const prevScripts = new Map(prev.scripts.map((s) => [s.domain + s.src, s]));
  const currScripts = new Map(curr.scripts.map((s) => [s.domain + s.src, s]));
  for (const [key, s] of prevScripts) {
    if (!currScripts.has(key)) {
      const important = s.service !== null;
      add(
        "Scripts",
        s.service ? `${s.service} script removed` : "Script removed",
        s.domain,
        "—",
        important ? "HIGH" : "LOW",
      );
    }
  }
  for (const [key, s] of currScripts) {
    if (!prevScripts.has(key)) {
      add(
        "Scripts",
        s.service ? `${s.service} script added` : "Script added",
        "—",
        s.domain,
        s.isThirdParty && !s.service ? "MEDIUM" : "LOW",
      );
    }
  }

  // Performance
  const weightDelta =
    prev.pageWeightBytes > 0
      ? (curr.pageWeightBytes - prev.pageWeightBytes) / prev.pageWeightBytes
      : 0;
  if (Math.abs(weightDelta) > 0.2) {
    add(
      "Performance",
      "Page weight (HTML)",
      `${Math.round(prev.pageWeightBytes / 1024)} KB`,
      `${Math.round(curr.pageWeightBytes / 1024)} KB`,
      weightDelta > 0.5 ? "HIGH" : "MEDIUM",
    );
  }

  const order: DiffSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
  return diffs.sort((a, b) => order.indexOf(a.severity) - order.indexOf(b.severity));
}
