// TEMPORARY benchmark harness (deleted after measuring).
import { it } from "vitest";
import { appendFileSync } from "node:fs";
import { analyzeAnalyticsTags } from "./analytics-tags";
import { extractLinks } from "./broken-links";
import { extractHtmlCanonicals, isNoindex } from "./canonical";
import { extractTitle, extractHeadings } from "./headings";
import { extractHreflangLinks } from "./hreflang";
import { extractMetaTags } from "./meta-tags";
import { extractRobotsMetas, readCanonical } from "./noindex";
import { extractResources } from "./page-size";
import { analyzeShopify } from "./shopify-detect";
import { extractScripts, extractSnapshot } from "./snapshot";
import { extractJsonLdTexts, detectMicrodataAndRdfa } from "./structured-data";
import { detectThemes, detectPlugins, detectWordPressSignals } from "./wordpress-detect";
import { extractEeatFacts } from "./eeat";

const U = "https://example.com/";
const INPUTS: Record<string, () => string> = {
  comment: () => "<!--".repeat(200000),
  svg: () => "<svg ".repeat(50000),
  slash: () => "/".repeat(200000),
  script: () => "<script ".repeat(50000),
  lt: () => "<".repeat(200000),
  h1: () => "<h1>".repeat(50000),
  title: () => "<title>".repeat(50000),
  meta: () => "<meta ".repeat(50000),
  a: () => "<a ".repeat(70000),
  big: () => ("<p>hello <a href='/x'>x</a> <!-- c --> <script>var a=1</script></p>\n").repeat(40000),
};
const FNS: Record<string, (h: string) => unknown> = {
  analytics: (h) => analyzeAnalyticsTags(h),
  links: (h) => extractLinks(h, U),
  canonicals: (h) => extractHtmlCanonicals(h, U),
  noindexCanon: (h) => isNoindex(h, null),
  title: (h) => extractTitle(h),
  headings: (h) => extractHeadings(h),
  hreflang: (h) => extractHreflangLinks(h),
  meta: (h) => extractMetaTags(h),
  robots: (h) => extractRobotsMetas(h),
  readCanonical: (h) => readCanonical(h),
  resources: (h) => extractResources(h, U),
  shopify: (h) => analyzeShopify(h, U),
  scripts: (h) => extractScripts(h, U),
  snapshot: (h) => extractSnapshot({ finalUrl: U, status: 200, headers: new Headers(), body: h, bodyBytes: h.length, redirectChain: [], responseTimeMs: 1 }, U),
  jsonld: (h) => extractJsonLdTexts(h),
  microdata: (h) => detectMicrodataAndRdfa(h),
  themes: (h) => detectThemes(h, U),
  plugins: (h) => detectPlugins(h),
  wpSignals: (h) => detectWordPressSignals(h),
  eeat: (h) => extractEeatFacts(U, h),
};
it("bench", () => {
  const inputs = (process.env.BENCH_INPUT ?? Object.keys(INPUTS).join(",")).split(",");
  const fns = (process.env.BENCH_FN ?? Object.keys(FNS).join(",")).split(",");
  for (const i of inputs) {
    const h = INPUTS[i]();
    for (const f of fns) {
      const t = performance.now();
      FNS[f](h);
      appendFileSync(process.env.BENCH_OUT ?? "/dev/null", `BENCH ${i} ${f} ${Math.round(performance.now() - t)}ms\n`);
    }
  }
}, 3_600_000);
