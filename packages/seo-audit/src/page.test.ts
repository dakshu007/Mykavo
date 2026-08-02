import { describe, expect, it } from "vitest";
import { extractFacts, pageIssues } from "./page";
import { AUDIT_CHECKS } from "./registry";
import { aggregateIssues } from "./crawl";

function facts(html: string, overrides: Partial<Parameters<typeof extractFacts>[0]> = {}) {
  return extractFacts({
    url: "https://example.com/page",
    status: 200,
    html,
    fetchMs: 200,
    headers: { contentEncoding: "br", cacheControl: "max-age=60", hsts: true },
    ...overrides,
  });
}

const GOOD_PAGE = `<!doctype html><html lang="en"><head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>A perfectly reasonable page title here</title>
  <meta name="description" content="${"A useful description of the page that is comfortably inside the recommended length band.".slice(0, 120)}">
  <link rel="canonical" href="https://example.com/page">
  <link rel="icon" href="/favicon.ico">
  <meta property="og:title" content="t"><meta property="og:description" content="d"><meta property="og:image" content="https://example.com/og.png">
  <meta name="twitter:card" content="summary_large_image">
  <script type="application/ld+json">{"@type":"WebSite"}</script>
  </head><body>
  <h1>The main heading of this page</h1><h2>Sub</h2>
  <p>${"real words ".repeat(120)}</p>
  <img src="/a.png" alt="thing" width="10" height="10">
  <a href="/other">A descriptive link to the other page</a>
  </body></html>`;

describe("pageIssues on a healthy page", () => {
  it("raises no issues", () => {
    expect(pageIssues(facts(GOOD_PAGE))).toEqual([]);
  });
});

describe("pageIssues detections", () => {
  it("flags missing title, description, H1, viewport, canonical, favicon", () => {
    const ids = pageIssues(facts("<html><head></head><body><p>hi</p></body></html>")).map((i) => i.checkId);
    for (const expected of [
      "title-missing", "desc-missing", "h1-missing", "mobile-no-viewport",
      "canonical-missing", "favicon-missing", "html-no-doctype", "html-no-charset",
      "lang-missing", "content-thin", "soft-404", "schema-missing",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("flags length problems with the offending measurements", () => {
    const html = GOOD_PAGE
      .replace(/<title>.*<\/title>/, `<title>${"x".repeat(80)}</title>`)
      .replace(/content="A useful[^"]*"/, `content="${"y".repeat(200)}"`);
    const issues = pageIssues(facts(html));
    expect(issues.find((i) => i.checkId === "title-long")?.detail).toBe("80 chars");
    expect(issues.find((i) => i.checkId === "desc-long")?.detail).toBe("200 chars");
  });

  it("returns ONLY the status issue for 4xx/5xx pages", () => {
    expect(pageIssues(facts("<html></html>", { status: 404 }))).toEqual([
      { checkId: "http-4xx", url: "https://example.com/page", detail: "HTTP 404" },
    ]);
    expect(pageIssues(facts("<html></html>", { status: 503 }))[0].checkId).toBe("http-5xx");
  });

  it("flags security problems on https pages", () => {
    const html = GOOD_PAGE.replace(
      "<img src=\"/a.png\" alt=\"thing\" width=\"10\" height=\"10\">",
      '<img src="http://cdn.example.com/a.png" alt="thing" width="10" height="10"><form action="http://example.com/submit"><label for="e">E</label><input id="e"></form>',
    );
    const ids = pageIssues(facts(html, { headers: { contentEncoding: "br", cacheControl: "x", hsts: false } })).map((i) => i.checkId);
    expect(ids).toContain("sec-mixed-content");
    expect(ids).toContain("sec-insecure-form");
    expect(ids).toContain("sec-no-hsts");
  });

  it("flags meta refresh and nofollowed internal links", () => {
    const html = GOOD_PAGE
      .replace("</head>", '<meta http-equiv="refresh" content="0;url=/new"></head>')
      .replace("</body>", '<a href="/promo" rel="nofollow">internal promo</a></body>');
    const issues = pageIssues(facts(html));
    const ids = issues.map((i) => i.checkId);
    expect(ids).toContain("meta-refresh");
    expect(issues.find((i) => i.checkId === "link-internal-nofollow")?.detail).toBe("1 links");
  });

  it("flags lorem ipsum as an error and counts words", () => {
    const html = GOOD_PAGE.replace("real words", "Lorem ipsum dolor ");
    const ids = pageIssues(facts(html)).map((i) => i.checkId);
    expect(ids).toContain("content-lorem");
  });

  it("flags accessibility and link-quality problems", () => {
    const html = GOOD_PAGE.replace(
      "</body>",
      `<a href="/x"></a><a href="#">menu</a><input type="text"><button></button>
       ${'<a href="/y">click here</a>'.repeat(3)}</body>`,
    );
    const ids = pageIssues(facts(html)).map((i) => i.checkId);
    for (const expected of [
      "link-empty-anchor", "link-js-only", "link-generic-anchor",
      "a11y-input-no-label", "a11y-empty-link",
    ]) {
      expect(ids).toContain(expected);
    }
  });

  it("classifies internal vs external links and URL shape issues", () => {
    const f = facts(GOOD_PAGE.replace("</body>", '<a href="https://other.com/x">ext http site</a><a href="http://other.com/y">plain</a></body>'), {
      url: "https://example.com/Some_Path?id=3",
    });
    expect(f.externalLinks).toHaveLength(2);
    const ids = pageIssues(f).map((i) => i.checkId);
    expect(ids).toContain("url-uppercase");
    expect(ids).toContain("url-underscore");
    expect(ids).toContain("url-params");
    expect(ids).toContain("link-external-http");
    expect(ids).toContain("canonical-other");
  });
});

describe("registry integrity", () => {
  it("every check id emitted by pageIssues exists in the registry", () => {
    const html = "<html><body><p>x</p></body></html>";
    for (const issue of pageIssues(facts(html))) {
      expect(AUDIT_CHECKS[issue.checkId], issue.checkId).toBeDefined();
    }
  });

  it("every registry entry has explain + fix copy for the tooltips", () => {
    for (const [id, def] of Object.entries(AUDIT_CHECKS)) {
      expect(def.explain.length, id).toBeGreaterThan(20);
      expect(def.fix.length, id).toBeGreaterThan(20);
    }
  });
});

describe("aggregateIssues foundOn", () => {
  const ctx = {
    linkSources: new Map([
      ["https://ex.com/old-page", ["https://ex.com/", "https://ex.com/blog", "https://ex.com/about", "https://ex.com/extra"]],
    ]),
    sitemapUrlSet: new Set(["https://ex.com/sitemap-only"]),
    sitemapLocation: "https://ex.com/sitemap.xml",
  };

  it("attaches up to 3 linking pages to redirect/4xx issues", () => {
    const groups = aggregateIssues(
      [
        { checkId: "http-redirect", url: "https://ex.com/old-page", detail: "→ /new" },
        { checkId: "http-4xx", url: "https://ex.com/sitemap-only", detail: "HTTP 404" },
      ],
      ctx,
    );
    const redirect = groups.find((g) => g.checkId === "http-redirect")!;
    expect(redirect.urls[0].foundOn).toEqual([
      "https://ex.com/",
      "https://ex.com/blog",
      "https://ex.com/about",
    ]);
    const notFound = groups.find((g) => g.checkId === "http-4xx")!;
    expect(notFound.urls[0].foundOn).toEqual(["https://ex.com/sitemap.xml"]);
  });

  it("does NOT attach foundOn to page-level issues, and dedupes counting", () => {
    const groups = aggregateIssues(
      [
        { checkId: "title-missing", url: "https://ex.com/old-page" },
        { checkId: "title-missing", url: "https://ex.com/old-page" },
        { checkId: "title-missing", url: "https://ex.com/other" },
      ],
      ctx,
    );
    const titles = groups.find((g) => g.checkId === "title-missing")!;
    expect(titles.count).toBe(2);
    expect(titles.urls[0].foundOn).toBeUndefined();
  });

  it("omits foundOn when the destination has no known source", () => {
    const groups = aggregateIssues(
      [{ checkId: "http-5xx", url: "https://ex.com/mystery", detail: "HTTP 500" }],
      ctx,
    );
    expect(groups[0].urls[0].foundOn).toBeUndefined();
  });
});
