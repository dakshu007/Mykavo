import { describe, expect, it } from "vitest";
import {
  buildCanonicalReport,
  canonicalTargetToCheck,
  extractHtmlCanonicals,
  parseLinkHeader,
  type CanonicalPageInput,
  type CanonicalTargetFetch,
} from "./canonical";

const page = (over: Partial<CanonicalPageInput>): CanonicalPageInput => ({
  url: "https://e.com/a",
  finalUrl: "https://e.com/a",
  httpStatus: 200,
  redirectCount: 0,
  html: "",
  linkHeader: null,
  xRobotsTag: null,
  ...over,
});

const target = (over: Partial<CanonicalTargetFetch>): CanonicalTargetFetch => ({
  url: "https://e.com/b",
  finalUrl: "https://e.com/b",
  status: 200,
  redirectCount: 0,
  html: `<link rel="canonical" href="https://e.com/b">`,
  linkHeader: null,
  xRobotsTag: null,
  error: null,
  ...over,
});

const messages = (r: { issues: Array<{ message: string }> }) => r.issues.map((i) => i.message).join("\n");

describe("parseLinkHeader", () => {
  it("parses several links with quoted params and commas inside quotes", () => {
    expect(
      parseLinkHeader(`<https://e.com/a>; rel="canonical", <https://e.com/de/>; rel="alternate"; hreflang="de", <https://e.com/x>; title="a, b"; rel=preload`),
    ).toEqual([
      { url: "https://e.com/a", params: { rel: "canonical" } },
      { url: "https://e.com/de/", params: { rel: "alternate", hreflang: "de" } },
      { url: "https://e.com/x", params: { title: "a, b", rel: "preload" } },
    ]);
    expect(parseLinkHeader(null)).toEqual([]);
  });
});

describe("extractHtmlCanonicals", () => {
  it("finds every canonical, resolves relative hrefs against <base>, and spots tags in <body>", () => {
    const html = `<head><base href="https://cdn.e.com/x/"><link rel="canonical" href="a"><!-- <link rel="canonical" href="/ignored"> --></head><body><link href="/b" rel="Canonical"></body>`;
    const found = extractHtmlCanonicals(html, "https://e.com/page");
    expect(found).toHaveLength(2);
    expect(found[0]).toMatchObject({ resolved: "https://cdn.e.com/x/a", relative: true, inBody: false });
    expect(found[1]).toMatchObject({ resolved: "https://cdn.e.com/b", inBody: true });
  });
});

describe("buildCanonicalReport", () => {
  it("self-referencing canonical, ignoring the fragment", () => {
    const r = buildCanonicalReport(page({ html: `<link rel="canonical" href="https://e.com/a">` }), null);
    expect(r.verdict).toBe("self");
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
    expect(canonicalTargetToCheck(page({ html: `<link rel="canonical" href="https://e.com/a#top">` }))).toBeNull();
  });

  it("missing canonical is a warning", () => {
    const r = buildCanonicalReport(page({ html: "<title>x</title>" }), null);
    expect(r.verdict).toBe("missing");
    expect(r.issues[0].level).toBe("warning");
  });

  it("multiple different canonicals are conflicting", () => {
    const r = buildCanonicalReport(page({ html: `<link rel="canonical" href="/a"><link rel="canonical" href="/b">` }), null);
    expect(r.verdict).toBe("conflicting");
    expect(messages(r)).toContain("Google ignores all of them");
  });

  it("header that disagrees with HTML is conflicting; agreeing header is fine", () => {
    const html = `<link rel="canonical" href="https://e.com/a">`;
    expect(buildCanonicalReport(page({ html, linkHeader: `<https://e.com/z>; rel="canonical"` }), null).verdict).toBe("conflicting");
    expect(buildCanonicalReport(page({ html, linkHeader: `<https://e.com/a>; rel="canonical"` }), null).verdict).toBe("self");
    expect(buildCanonicalReport(page({ linkHeader: `<https://e.com/a>; rel=canonical` }), null).verdict).toBe("self");
  });

  it("flags relative, http on https, other host, query and trailing slash", () => {
    const rel = buildCanonicalReport(page({ html: `<link rel="canonical" href="/a">` }), null);
    expect(rel.verdict).toBe("self");
    expect(rel.issues.find((i) => i.message.includes("relative"))?.level).toBe("warning");

    const insecure = buildCanonicalReport(page({ html: `<link rel="canonical" href="http://www.e.com/a/?p=1">` }), target({ url: "http://www.e.com/a/?p=1", finalUrl: "http://www.e.com/a/?p=1", html: `<link rel="canonical" href="http://www.e.com/a/?p=1">` }));
    expect(insecure.verdict).toBe("other");
    const text = messages(insecure);
    expect(text).toContain("http://");
    expect(text).toContain("www and non-www");
    expect(text).toContain("query string");

    const slash = buildCanonicalReport(page({ html: `<link rel="canonical" href="https://e.com/a/">` }), target({ url: "https://e.com/a/", finalUrl: "https://e.com/a/", html: `<link rel="canonical" href="https://e.com/a/">` }));
    expect(messages(slash)).toContain("trailing slash");
  });

  it("checks the target: healthy target has no errors", () => {
    const p = page({ html: `<link rel="canonical" href="https://e.com/b">` });
    expect(canonicalTargetToCheck(p)).toBe("https://e.com/b");
    const r = buildCanonicalReport(p, target({}));
    expect(r.verdict).toBe("other");
    expect(r.target).toMatchObject({ status: 200, canonicalState: "self", noindex: false });
    expect(r.issues.filter((i) => i.level === "error")).toEqual([]);
  });

  it("flags a target that redirects, 404s, is noindex or chains", () => {
    const p = page({ html: `<link rel="canonical" href="https://e.com/b">` });
    expect(messages(buildCanonicalReport(p, target({ finalUrl: "https://e.com/c", redirectCount: 1 })))).toContain("redirects");
    expect(messages(buildCanonicalReport(p, target({ status: 404 })))).toContain("HTTP 404");
    expect(messages(buildCanonicalReport(p, target({ xRobotsTag: "noindex" })))).toContain("noindex");
    expect(messages(buildCanonicalReport(p, target({ html: `<link rel="canonical" href="https://e.com/c">` })))).toContain("canonical chain");
    expect(messages(buildCanonicalReport(p, target({ html: `<link rel="canonical" href="https://e.com/a">` })))).toContain("loop");
    const failed = buildCanonicalReport(p, target({ status: null, finalUrl: null, error: "The request timed out." }));
    expect(failed.target?.error).toBe("The request timed out.");
  });

  it("canonical inside <body> is reported as an error", () => {
    const r = buildCanonicalReport(page({ html: `<head></head><body><link rel="canonical" href="https://e.com/a"></body>` }), null);
    expect(r.issues.some((i) => i.level === "error" && i.message.includes("<body>"))).toBe(true);
  });
});
