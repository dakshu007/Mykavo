/**
 * Per-page fact extraction + checks. `extractFacts` parses fetched HTML once
 * into a plain PageFacts object; `pageIssues` maps facts to check ids. Both
 * are pure so every check is unit-testable with an HTML string.
 */

import { createHash } from "node:crypto";
import { parse, type HTMLElement } from "node-html-parser";

export interface PageFacts {
  url: string;
  status: number;
  fetchMs: number;
  htmlBytes: number;
  contentEncoding: string | null;
  cacheControl: string | null;
  hsts: boolean;
  redirectedFrom: string[] | null;

  titles: string[];
  descriptions: string[];
  canonicals: string[];
  noindex: boolean;
  h1s: string[];
  emptyHeadings: number;
  headingSkips: number;
  wordCount: number;
  loremIpsum: boolean;
  textHash: string;
  lang: string | null;
  charset: boolean;
  doctype: boolean;
  viewport: boolean;
  favicon: boolean;

  imagesTotal: number;
  imagesMissingAlt: number;
  imagesMissingDims: number;
  imagesEagerCount: number;
  imageUrls: string[];

  internalLinks: string[];
  externalLinks: string[];
  nofollowInternal: number;
  metaRefresh: boolean;
  totalAnchors: number;
  emptyAnchors: number;
  genericAnchors: number;
  jsOnlyLinks: number;
  externalHttpLinks: number;

  ogTitle: boolean;
  ogDescription: boolean;
  ogImage: boolean;
  twitterCard: boolean;

  jsonLdBlocks: number;
  jsonLdInvalid: number;

  mixedContent: number;
  insecureForms: number;
  inlineBytes: number;
  deprecatedTags: number;

  hreflangs: { lang: string; href: string }[];
  a11yEmptyControls: number;
  inputsWithoutLabel: number;
}

const GENERIC_ANCHORS = new Set([
  "click here", "here", "read more", "more", "learn more", "link", "this page",
]);
const DEPRECATED_TAGS = ["center", "font", "marquee", "blink", "big", "strike"];
const HREFLANG_PATTERN = /^([a-z]{2,3})(-[a-z0-9]{2,8})?$|^x-default$/i;

function attr(el: HTMLElement, name: string): string {
  return (el.getAttribute(name) ?? "").trim();
}

/** Resolve + classify an anchor href against the page. Returns null for
 *  non-navigational hrefs (mailto:, tel:, fragments…). */
function resolveHref(href: string, base: URL): URL | null {
  const trimmed = href.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    url.hash = "";
    return url;
  } catch {
    return null;
  }
}

export function extractFacts(input: {
  url: string;
  status: number;
  html: string;
  fetchMs: number;
  headers: { contentEncoding?: string | null; cacheControl?: string | null; hsts?: boolean };
  redirectedFrom?: string[] | null;
}): PageFacts {
  const base = new URL(input.url);
  const root = parse(input.html, { blockTextElements: { script: true, style: true, noscript: true } });
  const head = root.querySelector("head");

  const titles = root.querySelectorAll("title").map((t) => t.text.trim());
  const descriptions = root
    .querySelectorAll('meta[name="description" i]')
    .map((m) => attr(m, "content"));
  const canonicals = root
    .querySelectorAll('link[rel="canonical" i]')
    .map((l) => attr(l, "href"))
    .filter(Boolean);
  const robotsMeta = root
    .querySelectorAll('meta[name="robots" i], meta[name="googlebot" i]')
    .map((m) => attr(m, "content").toLowerCase())
    .join(",");

  // Headings + outline
  const headings = root.querySelectorAll("h1,h2,h3,h4,h5,h6");
  let emptyHeadings = 0;
  let headingSkips = 0;
  let prevLevel = 0;
  for (const h of headings) {
    const level = Number(h.tagName[1]);
    if (!h.text.trim() && !h.querySelector("img[alt]")) emptyHeadings++;
    if (prevLevel > 0 && level > prevLevel + 1) headingSkips++;
    prevLevel = level;
  }
  const h1s = root.querySelectorAll("h1").map((h) => h.text.trim()).filter(Boolean);

  // Visible text
  const bodyText = (root.querySelector("body")?.text ?? root.text).replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;

  // Images
  const images = root.querySelectorAll("img");
  let imagesMissingAlt = 0;
  let imagesMissingDims = 0;
  let imagesEagerCount = 0;
  const imageUrls: string[] = [];
  for (const img of images) {
    if (!img.hasAttribute("alt")) imagesMissingAlt++;
    if (!attr(img, "width") || !attr(img, "height")) imagesMissingDims++;
    if (attr(img, "loading").toLowerCase() !== "lazy") imagesEagerCount++;
    const resolved = resolveHref(attr(img, "src"), base);
    if (resolved) imageUrls.push(resolved.href);
  }

  // Links
  const anchors = root.querySelectorAll("a");
  const internalLinks: string[] = [];
  const externalLinks: string[] = [];
  let emptyAnchors = 0;
  let genericAnchors = 0;
  let jsOnlyLinks = 0;
  let externalHttpLinks = 0;
  let nofollowInternal = 0;
  for (const a of anchors) {
    const href = attr(a, "href");
    const rel = attr(a, "rel").toLowerCase();
    const text = a.text.replace(/\s+/g, " ").trim().toLowerCase();
    const hasLabel = Boolean(text || attr(a, "aria-label") || a.querySelector("img[alt]"));
    if (href && !hasLabel) emptyAnchors++;
    if (text && GENERIC_ANCHORS.has(text)) genericAnchors++;
    if (href === "#" || /^javascript:/i.test(href)) {
      jsOnlyLinks++;
      continue;
    }
    const resolved = resolveHref(href, base);
    if (!resolved) continue;
    if (resolved.host === base.host) {
      internalLinks.push(resolved.href);
      if (/\bnofollow\b/.test(rel)) nofollowInternal++;
    } else {
      externalLinks.push(resolved.href);
      if (resolved.protocol === "http:") externalHttpLinks++;
    }
  }

  // Social
  const metaProp = (p: string) =>
    Boolean(root.querySelector(`meta[property="${p}" i]`)?.getAttribute("content")?.trim());
  const twitterCard = Boolean(
    root.querySelector('meta[name="twitter:card" i]')?.getAttribute("content")?.trim(),
  );

  // Structured data
  const ldBlocks = root.querySelectorAll('script[type="application/ld+json" i]');
  let jsonLdInvalid = 0;
  for (const block of ldBlocks) {
    try {
      JSON.parse(block.text);
    } catch {
      jsonLdInvalid++;
    }
  }

  // Security-in-markup (only meaningful on https pages)
  const isHttps = base.protocol === "https:";
  let mixedContent = 0;
  if (isHttps) {
    for (const el of root.querySelectorAll("img[src], script[src], link[href], iframe[src]")) {
      const src = attr(el, "src") || attr(el, "href");
      if (/^http:\/\//i.test(src)) mixedContent++;
    }
  }
  let insecureForms = 0;
  for (const form of root.querySelectorAll("form[action]")) {
    if (/^http:\/\//i.test(attr(form, "action"))) insecureForms++;
  }

  // Inline bloat + deprecated tags
  let inlineBytes = 0;
  for (const el of root.querySelectorAll("style, script:not([src])")) inlineBytes += el.text.length;
  let deprecatedTags = 0;
  for (const tag of DEPRECATED_TAGS) deprecatedTags += root.querySelectorAll(tag).length;

  // hreflang
  const hreflangs = root
    .querySelectorAll('link[rel="alternate" i][hreflang]')
    .map((l) => ({ lang: attr(l, "hreflang"), href: attr(l, "href") }));

  // Accessibility basics
  let a11yEmptyControls = 0;
  for (const b of root.querySelectorAll("button")) {
    if (!b.text.trim() && !attr(b, "aria-label") && !b.querySelector("img[alt], svg[aria-label]"))
      a11yEmptyControls++;
  }
  const labelFor = new Set(
    root.querySelectorAll("label[for]").map((l) => attr(l, "for")).filter(Boolean),
  );
  let inputsWithoutLabel = 0;
  for (const input of root.querySelectorAll("input, select, textarea")) {
    const type = attr(input, "type").toLowerCase();
    if (["hidden", "submit", "button", "image", "reset"].includes(type)) continue;
    const id = attr(input, "id");
    const labelled =
      (id && labelFor.has(id)) ||
      attr(input, "aria-label") ||
      attr(input, "aria-labelledby") ||
      input.closest("label");
    if (!labelled) inputsWithoutLabel++;
  }

  return {
    url: input.url,
    status: input.status,
    fetchMs: input.fetchMs,
    htmlBytes: Buffer.byteLength(input.html),
    contentEncoding: input.headers.contentEncoding ?? null,
    cacheControl: input.headers.cacheControl ?? null,
    hsts: input.headers.hsts ?? false,
    redirectedFrom: input.redirectedFrom ?? null,
    titles,
    descriptions,
    canonicals,
    noindex: /noindex/.test(robotsMeta),
    h1s,
    emptyHeadings,
    headingSkips,
    wordCount,
    loremIpsum: /lorem ipsum/i.test(bodyText),
    textHash: createHash("sha1").update(bodyText.toLowerCase()).digest("hex"),
    lang: root.querySelector("html")?.getAttribute("lang")?.trim() || null,
    charset: Boolean(head?.querySelector("meta[charset]")) ||
      /charset=/i.test(attr(head?.querySelector('meta[http-equiv="content-type" i]') ?? parse("<i/>"), "content")),
    doctype: /^\s*<!doctype html/i.test(input.html),
    viewport: Boolean(root.querySelector('meta[name="viewport" i]')),
    favicon: Boolean(root.querySelector('link[rel~="icon" i], link[rel="shortcut icon" i]')),
    imagesTotal: images.length,
    imagesMissingAlt,
    imagesMissingDims,
    imagesEagerCount,
    imageUrls: imageUrls.slice(0, 50),
    internalLinks,
    externalLinks,
    nofollowInternal,
    metaRefresh: Boolean(root.querySelector('meta[http-equiv="refresh" i]')),
    totalAnchors: anchors.length,
    emptyAnchors,
    genericAnchors,
    jsOnlyLinks,
    externalHttpLinks,
    ogTitle: metaProp("og:title"),
    ogDescription: metaProp("og:description"),
    ogImage: metaProp("og:image"),
    twitterCard,
    jsonLdBlocks: ldBlocks.length,
    jsonLdInvalid,
    mixedContent,
    insecureForms,
    inlineBytes,
    deprecatedTags,
    hreflangs,
    a11yEmptyControls,
    inputsWithoutLabel,
  };
}

export interface PageIssue {
  checkId: string;
  url: string;
  /** Short human detail, e.g. the offending value or a count. */
  detail?: string;
}

/** Checks that need only this page's facts (cross-page checks live in site.ts). */
export function pageIssues(f: PageFacts): PageIssue[] {
  const issues: PageIssue[] = [];
  const add = (checkId: string, detail?: string) => issues.push({ checkId, url: f.url, detail });
  const isHttps = f.url.startsWith("https://");
  const path = new URL(f.url).pathname + new URL(f.url).search;

  // Only audit content of successful HTML responses.
  if (f.status >= 500) return [{ checkId: "http-5xx", url: f.url, detail: `HTTP ${f.status}` }];
  if (f.status >= 400) return [{ checkId: "http-4xx", url: f.url, detail: `HTTP ${f.status}` }];

  // Titles
  if (f.titles.length === 0) add("title-missing");
  else {
    if (f.titles.length > 1) add("title-multiple", `${f.titles.length} title tags`);
    const title = f.titles[0];
    if (!title) add("title-empty");
    else {
      if (title.length > 60) add("title-long", `${title.length} chars`);
      else if (title.length < 15) add("title-short", `${title.length} chars`);
      if (f.h1s[0] && title === f.h1s[0]) add("title-h1-same");
    }
  }

  // Meta description
  if (f.descriptions.length === 0) add("desc-missing");
  else {
    if (f.descriptions.length > 1) add("desc-multiple", `${f.descriptions.length} tags`);
    const desc = f.descriptions[0];
    if (!desc) add("desc-empty");
    else if (desc.length > 165) add("desc-long", `${desc.length} chars`);
    else if (desc.length < 50) add("desc-short", `${desc.length} chars`);
  }

  // Canonical
  if (f.canonicals.length === 0) add("canonical-missing");
  else if (f.canonicals.length > 1) add("canonical-multiple", `${f.canonicals.length} canonicals`);
  else {
    const canonical = f.canonicals[0];
    if (!/^https?:\/\//i.test(canonical)) add("canonical-relative", canonical);
    else {
      try {
        const c = new URL(canonical);
        const self = new URL(f.url);
        if (c.href.replace(/\/$/, "") !== self.href.replace(/\/$/, ""))
          add("canonical-other", canonical);
      } catch {
        add("canonical-relative", canonical);
      }
    }
  }
  if (f.noindex) add("noindex-page");
  if (f.metaRefresh) add("meta-refresh");

  // Headings
  if (f.h1s.length === 0) add("h1-missing");
  else {
    if (f.h1s.length > 1) add("h1-multiple", `${f.h1s.length} H1 tags`);
    if (f.h1s[0].length > 70) add("h1-long", `${f.h1s[0].length} chars`);
  }
  if (f.emptyHeadings > 0) add("heading-empty", `${f.emptyHeadings} empty`);
  if (f.headingSkips > 0) add("heading-skip", `${f.headingSkips} skipped`);

  // Content
  if (f.loremIpsum) add("content-lorem");
  if (f.wordCount < 100 && !f.noindex) add("content-thin", `${f.wordCount} words`);
  if (f.wordCount < 20 && f.status === 200) add("soft-404", `${f.wordCount} words`);

  // Images
  if (f.imagesMissingAlt > 0) add("img-missing-alt", `${f.imagesMissingAlt} of ${f.imagesTotal}`);
  if (f.imagesMissingDims > 2) add("img-missing-dims", `${f.imagesMissingDims} of ${f.imagesTotal}`);
  if (f.imagesTotal >= 10 && f.imagesEagerCount === f.imagesTotal)
    add("img-no-lazy", `${f.imagesTotal} eager images`);

  // Links
  if (f.emptyAnchors > 0) add("link-empty-anchor", `${f.emptyAnchors} links`);
  if (f.genericAnchors > 2) add("link-generic-anchor", `${f.genericAnchors} links`);
  if (f.jsOnlyLinks > 0) add("link-js-only", `${f.jsOnlyLinks} links`);
  if (f.nofollowInternal > 0) add("link-internal-nofollow", `${f.nofollowInternal} links`);
  if (f.totalAnchors > 300) add("link-too-many", `${f.totalAnchors} links`);
  if (f.externalHttpLinks > 0) add("link-external-http", `${f.externalHttpLinks} links`);

  // URL shape
  if (f.url.length > 115) add("url-long", `${f.url.length} chars`);
  if (/[A-Z]/.test(path)) add("url-uppercase");
  if (/_/.test(new URL(f.url).pathname)) add("url-underscore");
  if (/(sessionid|sid|phpsessid|jsessionid)=/i.test(f.url)) add("url-session-id");
  else if (new URL(f.url).search) add("url-params");

  // Social
  if (!f.ogTitle || !f.ogDescription || !f.ogImage) add("og-incomplete");
  if (!f.twitterCard) add("twitter-missing");
  if (!f.favicon) add("favicon-missing");

  // Structured data
  if (f.jsonLdInvalid > 0) add("schema-invalid-json", `${f.jsonLdInvalid} blocks`);
  else if (f.jsonLdBlocks === 0) add("schema-missing");

  // Security
  if (!isHttps) add("sec-http-page");
  if (f.mixedContent > 0) add("sec-mixed-content", `${f.mixedContent} resources`);
  if (f.insecureForms > 0) add("sec-insecure-form", `${f.insecureForms} forms`);
  if (isHttps && !f.hsts) add("sec-no-hsts");

  // Performance
  if (f.fetchMs > 1500) add("perf-slow-ttfb", `${Math.round(f.fetchMs)} ms`);
  if (f.htmlBytes > 300_000) add("perf-large-html", `${Math.round(f.htmlBytes / 1024)} KB`);
  if (!f.contentEncoding) add("perf-no-compression");
  if (!f.cacheControl) add("perf-no-caching");
  if (f.inlineBytes > 50_000) add("perf-inline-bloat", `${Math.round(f.inlineBytes / 1024)} KB inline`);

  // Mobile / international / hygiene
  if (!f.viewport) add("mobile-no-viewport");
  if (!f.lang) add("lang-missing");
  if (!f.doctype) add("html-no-doctype");
  if (!f.charset) add("html-no-charset");
  if (f.deprecatedTags > 0) add("html-deprecated-tags", `${f.deprecatedTags} tags`);

  // hreflang
  if (f.hreflangs.length > 0) {
    const invalid = f.hreflangs.filter((h) => !HREFLANG_PATTERN.test(h.lang));
    if (invalid.length > 0) add("hreflang-invalid", invalid[0].lang);
    const self = f.hreflangs.some((h) => {
      try {
        return new URL(h.href).href.replace(/\/$/, "") === f.url.replace(/\/$/, "");
      } catch {
        return false;
      }
    });
    if (!self) add("hreflang-no-self");
  }

  // Accessibility
  if (f.a11yEmptyControls + f.emptyAnchors > 0 && f.a11yEmptyControls > 0)
    add("a11y-empty-link", `${f.a11yEmptyControls} controls`);
  if (f.inputsWithoutLabel > 0) add("a11y-input-no-label", `${f.inputsWithoutLabel} inputs`);

  return issues;
}
