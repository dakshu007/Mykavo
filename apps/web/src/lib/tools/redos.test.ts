/**
 * Regression tests for regex backtracking on hostile HTML. Every free tool
 * parses a page anyone can write, so no parser may take more than a moment
 * on input built to make regexes rescan the rest of the page from every
 * unclosed "<!--", "<svg " or "//" (each of these used to take seconds to
 * minutes).
 */
import { describe, expect, it } from "vitest";
import { analyzeAnalyticsTags } from "./analytics-tags";
import { extractLinks } from "./broken-links";
import { extractHtmlCanonicals, isNoindex } from "./canonical";
import { extractEeatFacts } from "./eeat";
import { extractHeadings, extractTitle } from "./headings";
import { extractHreflangLinks } from "./hreflang";
import { extractMetaTags } from "./meta-tags";
import { extractRobotsMetas, readCanonical } from "./noindex";
import { extractResources } from "./page-size";
import { analyzeShopify } from "./shopify-detect";
import { extractScripts, extractSnapshot } from "./snapshot";
import { detectMicrodataAndRdfa, extractJsonLdTexts } from "./structured-data";
import { detectPlugins, detectThemes, detectWordPressSignals } from "./wordpress-detect";

const PAGE = "https://example.com/";

const PARSERS: Record<string, (html: string) => unknown> = {
  analyzeAnalyticsTags: (h) => analyzeAnalyticsTags(h),
  extractLinks: (h) => extractLinks(h, PAGE),
  extractHtmlCanonicals: (h) => extractHtmlCanonicals(h, PAGE),
  isNoindex: (h) => isNoindex(h, null),
  extractTitle: (h) => extractTitle(h),
  extractHeadings: (h) => extractHeadings(h),
  extractHreflangLinks: (h) => extractHreflangLinks(h),
  extractMetaTags: (h) => extractMetaTags(h),
  extractRobotsMetas: (h) => extractRobotsMetas(h),
  readCanonical: (h) => readCanonical(h),
  extractResources: (h) => extractResources(h, PAGE),
  analyzeShopify: (h) => analyzeShopify(h, PAGE),
  extractScripts: (h) => extractScripts(h, PAGE),
  extractSnapshot: (h) =>
    extractSnapshot(
      { finalUrl: PAGE, status: 200, headers: new Headers(), body: h, bodyBytes: h.length, redirectChain: [], responseTimeMs: 1 },
      PAGE,
    ),
  extractJsonLdTexts: (h) => extractJsonLdTexts(h),
  detectMicrodataAndRdfa: (h) => detectMicrodataAndRdfa(h),
  detectThemes: (h) => detectThemes(h, PAGE),
  detectPlugins: (h) => detectPlugins(h),
  detectWordPressSignals: (h) => detectWordPressSignals(h),
};

const HOSTILE: Record<string, string> = {
  "unclosed comments": "<!--".repeat(200_000),
  "unclosed svg tags": "<svg ".repeat(50_000),
  "a run of slashes": "/".repeat(200_000),
  "unclosed script tags": "<script ".repeat(50_000),
  "bare angle brackets": "<".repeat(200_000),
  "unclosed h1 elements": "<h1>".repeat(50_000),
  "unclosed title elements": "<title>".repeat(50_000),
  "unclosed meta tags": "<meta ".repeat(50_000),
  "unclosed anchors": "<a ".repeat(70_000),
  "gtag query strings": `<script>${"gtag/js?".repeat(60_000)}</script>`,
  "wp-content without a slug": "//x/wp-content/themes/".repeat(20_000),
  "generator metas": `<meta ${'name="generator"'.repeat(30_000)}`,
};

const BUDGET_MS = 500;

function timed(fn: () => unknown): number {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

describe("free-tool parsers finish quickly on hostile HTML", () => {
  for (const [label, html] of Object.entries(HOSTILE)) {
    it(label, () => {
      const slow: string[] = [];
      for (const [name, parse] of Object.entries(PARSERS)) {
        const ms = timed(() => parse(html));
        if (ms > BUDGET_MS) slow.push(`${name}: ${Math.round(ms)} ms`);
      }
      expect(slow).toEqual([]);
    });
  }

  it("E-E-A-T analysis stays bounded on large and hostile pages", () => {
    // node-html-parser is slower per byte than the scanners above, so it gets
    // a looser budget; the cap is what keeps it bounded.
    const big = "<p>hello <a href='/x'>x</a> <!-- c --> <script>var a=1</script></p>\n".repeat(40_000);
    for (const html of [big, HOSTILE["unclosed comments"], HOSTILE["unclosed svg tags"], HOSTILE["unclosed anchors"]]) {
      expect(timed(() => extractEeatFacts(PAGE, html))).toBeLessThan(5_000);
    }
  });
});
