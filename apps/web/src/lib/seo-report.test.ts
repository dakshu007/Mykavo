import { describe, expect, it } from "vitest";
import {
  buildSeoReport,
  calculateSeoScore,
  groupIssuesByCheck,
  parseH1Values,
  seoScoreBand,
  SEO_CHECK_META,
  SEO_CHECK_ORDER,
  type SeoSnapshotInput,
} from "./seo-report";

/** A page with nothing to complain about. */
function healthyPage(overrides: Partial<SeoSnapshotInput> = {}): SeoSnapshotInput {
  return {
    monitoredPageId: "page_1",
    url: "https://example.com/",
    httpStatus: 200,
    errorCode: null,
    title: "x".repeat(55),
    metaDescription: "y".repeat(140),
    canonicalUrl: "https://example.com/",
    robotsMeta: "index, follow",
    h1Values: ["Welcome"],
    ...overrides,
  };
}

describe("buildSeoReport - perfect input", () => {
  it("returns no issues and a score of 100", () => {
    const report = buildSeoReport([
      healthyPage(),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/pricing", title: "z".repeat(52) }),
    ]);
    expect(report.issues).toEqual([]);
    expect(report.score).toBe(100);
    expect(report.pagesAnalyzed).toBe(2);
    expect(report.pagesWithIssues).toBe(0);
    expect(report.counts).toEqual({ critical: 0, warning: 0, info: 0 });
  });

  it("handles an empty snapshot list", () => {
    const report = buildSeoReport([]);
    expect(report.issues).toEqual([]);
    expect(report.score).toBe(100);
    expect(report.pagesAnalyzed).toBe(0);
  });
});

describe("title checks", () => {
  it("flags a missing title as a warning", () => {
    const report = buildSeoReport([healthyPage({ title: null })]);
    const found = report.issues.find((i) => i.check === "missing-title");
    expect(found).toBeDefined();
    expect(found?.severity).toBe("warning");
    expect(found?.pageUrl).toBe("https://example.com/");
  });

  it("treats a whitespace-only title as missing, not as a length issue", () => {
    const report = buildSeoReport([healthyPage({ title: "   " })]);
    expect(report.issues.map((i) => i.check)).toEqual(["missing-title"]);
  });

  it("warns on titles shorter than 50 characters, carrying the value", () => {
    const report = buildSeoReport([healthyPage({ title: "Short" })]);
    const found = report.issues.find((i) => i.check === "title-length");
    expect(found?.severity).toBe("warning");
    expect(found?.value).toBe("Short");
    expect(found?.message).toContain("50–60");
  });

  it("warns on titles longer than 60 characters", () => {
    const report = buildSeoReport([healthyPage({ title: "x".repeat(61) })]);
    expect(report.issues.some((i) => i.check === "title-length")).toBe(true);
  });

  it("accepts 50 and 60 character titles (inclusive bounds)", () => {
    expect(buildSeoReport([healthyPage({ title: "x".repeat(50) })]).issues).toEqual([]);
    expect(buildSeoReport([healthyPage({ title: "x".repeat(60) })]).issues).toEqual([]);
  });
});

describe("meta description checks", () => {
  it("flags a missing description as a warning", () => {
    const report = buildSeoReport([healthyPage({ metaDescription: null })]);
    const found = report.issues.find((i) => i.check === "missing-description");
    expect(found?.severity).toBe("warning");
  });

  it("treats an empty-string description as missing", () => {
    const report = buildSeoReport([healthyPage({ metaDescription: "" })]);
    expect(report.issues.map((i) => i.check)).toEqual(["missing-description"]);
  });

  it("warns outside 120–160 characters and accepts the bounds", () => {
    expect(
      buildSeoReport([healthyPage({ metaDescription: "d".repeat(119) })]).issues.map(
        (i) => i.check,
      ),
    ).toEqual(["description-length"]);
    expect(
      buildSeoReport([healthyPage({ metaDescription: "d".repeat(161) })]).issues.map(
        (i) => i.check,
      ),
    ).toEqual(["description-length"]);
    expect(buildSeoReport([healthyPage({ metaDescription: "d".repeat(120) })]).issues).toEqual([]);
    expect(buildSeoReport([healthyPage({ metaDescription: "d".repeat(160) })]).issues).toEqual([]);
  });
});

describe("H1 checks", () => {
  it("flags zero H1s as a warning", () => {
    const report = buildSeoReport([healthyPage({ h1Values: [] })]);
    const found = report.issues.find((i) => i.check === "missing-h1");
    expect(found?.severity).toBe("warning");
  });

  it("flags multiple H1s as info with the values joined", () => {
    const report = buildSeoReport([healthyPage({ h1Values: ["One", "Two"] })]);
    const found = report.issues.find((i) => i.check === "multiple-h1");
    expect(found?.severity).toBe("info");
    expect(found?.value).toBe("One · Two");
    expect(found?.message).toContain("2 H1");
  });

  it("treats malformed h1Values Json (null, object, string) as no H1s", () => {
    for (const malformed of [null, {}, "not-an-array", 42]) {
      const report = buildSeoReport([healthyPage({ h1Values: malformed })]);
      expect(report.issues.map((i) => i.check)).toEqual(["missing-h1"]);
    }
  });

  it("ignores non-string entries inside an h1Values array", () => {
    const report = buildSeoReport([healthyPage({ h1Values: [1, "Real heading", null] })]);
    expect(report.issues).toEqual([]);
  });
});

describe("parseH1Values", () => {
  it("returns only string members of arrays and [] for everything else", () => {
    expect(parseH1Values(["a", 2, "b", null])).toEqual(["a", "b"]);
    expect(parseH1Values(null)).toEqual([]);
    expect(parseH1Values(undefined)).toEqual([]);
    expect(parseH1Values("a")).toEqual([]);
    expect(parseH1Values({ h1: "a" })).toEqual([]);
  });
});

describe("robots meta / indexability", () => {
  it("flags noindex as critical", () => {
    const report = buildSeoReport([healthyPage({ robotsMeta: "noindex, follow" })]);
    const found = report.issues.find((i) => i.check === "noindex");
    expect(found?.severity).toBe("critical");
    expect(found?.value).toBe("noindex, follow");
  });

  it("is case-insensitive about noindex", () => {
    const report = buildSeoReport([healthyPage({ robotsMeta: "NOINDEX" })]);
    expect(report.issues.some((i) => i.check === "noindex")).toBe(true);
  });

  it("does not flag a missing robots meta (defaults to indexable)", () => {
    expect(buildSeoReport([healthyPage({ robotsMeta: null })]).issues).toEqual([]);
  });

  it("does not flag nofollow without noindex", () => {
    expect(buildSeoReport([healthyPage({ robotsMeta: "nofollow" })]).issues).toEqual([]);
  });
});

describe("canonical check", () => {
  it("flags a missing canonical as info", () => {
    const report = buildSeoReport([healthyPage({ canonicalUrl: null })]);
    const found = report.issues.find((i) => i.check === "missing-canonical");
    expect(found?.severity).toBe("info");
  });
});

describe("page errors", () => {
  it("flags HTTP >= 400 as critical and skips content checks", () => {
    const report = buildSeoReport([
      healthyPage({ httpStatus: 404, title: null, metaDescription: null, h1Values: null }),
    ]);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].check).toBe("page-error");
    expect(report.issues[0].severity).toBe("critical");
    expect(report.issues[0].message).toContain("404");
  });

  it("flags an errorCode-only failure (null httpStatus) as critical", () => {
    const report = buildSeoReport([
      healthyPage({
        httpStatus: null,
        errorCode: "NAVIGATION_TIMEOUT",
        title: null,
        metaDescription: null,
        canonicalUrl: null,
        robotsMeta: null,
        h1Values: null,
      }),
    ]);
    expect(report.issues).toHaveLength(1);
    expect(report.issues[0].check).toBe("page-error");
    expect(report.issues[0].message).toContain("NAVIGATION_TIMEOUT");
  });

  it("flags a snapshot with neither status nor errorCode as a page error", () => {
    const report = buildSeoReport([healthyPage({ httpStatus: null })]);
    expect(report.issues.map((i) => i.check)).toEqual(["page-error"]);
  });

  it("prefers the HTTP status message when both status and errorCode exist", () => {
    const report = buildSeoReport([healthyPage({ httpStatus: 500, errorCode: "HTTP_ERROR" })]);
    expect(report.issues[0].message).toContain("HTTP 500");
  });

  it("excludes error pages from duplicate-title grouping", () => {
    const report = buildSeoReport([
      healthyPage({ title: "Same fifty-five character title here padded out xx" }),
      healthyPage({
        monitoredPageId: "page_2",
        url: "https://example.com/broken",
        httpStatus: 404,
        title: "Same fifty-five character title here padded out xx",
      }),
    ]);
    expect(report.issues.some((i) => i.check === "duplicate-title")).toBe(false);
  });

  it("still runs content checks on 3xx-free 200s while flagging 4xx siblings", () => {
    const report = buildSeoReport([
      healthyPage({ title: null }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/gone", httpStatus: 410 }),
    ]);
    expect(report.issues.map((i) => i.check).sort()).toEqual(["missing-title", "page-error"]);
  });
});

describe("duplicate titles", () => {
  const title = "Aurora Outdoor - Tents & Camping Gear for Serious Hikers";

  it("emits one warning per page in a duplicate group, carrying the title", () => {
    const report = buildSeoReport([
      healthyPage({ title }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title }),
      healthyPage({ monitoredPageId: "page_3", url: "https://example.com/b", title }),
    ]);
    const duplicates = report.issues.filter((i) => i.check === "duplicate-title");
    expect(duplicates).toHaveLength(3);
    expect(duplicates.every((i) => i.severity === "warning")).toBe(true);
    expect(duplicates.every((i) => i.value === title)).toBe(true);
    expect(duplicates[0].message).toContain("2 other monitored pages");
  });

  it("uses singular phrasing for a pair", () => {
    const report = buildSeoReport([
      healthyPage({ title }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title }),
    ]);
    const duplicates = report.issues.filter((i) => i.check === "duplicate-title");
    expect(duplicates[0].message).toContain("1 other monitored page.");
  });

  it("matches titles after trimming surrounding whitespace", () => {
    const report = buildSeoReport([
      healthyPage({ title: `  ${title}` }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title: `${title} ` }),
    ]);
    expect(report.issues.filter((i) => i.check === "duplicate-title")).toHaveLength(2);
  });

  it("does not group distinct or missing titles", () => {
    const report = buildSeoReport([
      healthyPage({ title: null }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title: null }),
      healthyPage({ monitoredPageId: "page_3", url: "https://example.com/b", title: "b".repeat(55) }),
    ]);
    expect(report.issues.some((i) => i.check === "duplicate-title")).toBe(false);
  });
});

describe("broken internal links", () => {
  it("flags a broken link once per unique URL with its page reach", () => {
    const report = buildSeoReport([
      healthyPage({
        links: [
          { normalizedUrl: "https://example.com/gone", statusCode: 404 },
          { normalizedUrl: "https://example.com/ok", statusCode: 200 },
        ],
      }),
      healthyPage({
        monitoredPageId: "page_2",
        url: "https://example.com/about",
        title: "z".repeat(52),
        links: [{ normalizedUrl: "https://example.com/gone", statusCode: 404 }],
      }),
    ]);
    const broken = report.issues.filter((i) => i.check === "broken-link");
    expect(broken).toHaveLength(1);
    expect(broken[0].severity).toBe("warning");
    expect(broken[0].value).toBe("https://example.com/gone");
    expect(broken[0].message).toContain("HTTP 404");
    expect(broken[0].message).toContain("linked from 2 pages");
  });

  it("labels unreachable links and skips unchecked or healthy statuses", () => {
    const report = buildSeoReport([
      healthyPage({
        links: [
          { normalizedUrl: "https://example.com/dead", statusCode: 0 },
          { normalizedUrl: "https://example.com/unchecked", statusCode: null },
          { normalizedUrl: "https://example.com/login", statusCode: 403 },
        ],
      }),
    ]);
    const broken = report.issues.filter((i) => i.check === "broken-link");
    expect(broken).toHaveLength(1);
    expect(broken[0].message).toContain("unreachable");
  });

  it("ignores links on errored pages and counts a repeated link on one page once", () => {
    const report = buildSeoReport([
      healthyPage({
        httpStatus: 500,
        links: [{ normalizedUrl: "https://example.com/gone", statusCode: 404 }],
      }),
      healthyPage({
        monitoredPageId: "page_2",
        url: "https://example.com/about",
        title: "z".repeat(52),
        links: [
          { normalizedUrl: "https://example.com/gone", statusCode: 404 },
          { normalizedUrl: "https://example.com/gone", statusCode: 404 },
        ],
      }),
    ]);
    const broken = report.issues.filter((i) => i.check === "broken-link");
    expect(broken).toHaveLength(1);
    expect(broken[0].message).not.toContain("linked from");
  });
});

describe("score formula (100 − 25·critical − 5·warning − 1·info)", () => {
  it("deducts per severity", () => {
    expect(calculateSeoScore({ critical: 0, warning: 0, info: 0 })).toBe(100);
    expect(calculateSeoScore({ critical: 1, warning: 0, info: 0 })).toBe(75);
    expect(calculateSeoScore({ critical: 0, warning: 2, info: 3 })).toBe(87);
    expect(calculateSeoScore({ critical: 1, warning: 1, info: 1 })).toBe(69);
  });

  it("clamps at zero", () => {
    expect(calculateSeoScore({ critical: 5, warning: 0, info: 0 })).toBe(0);
    expect(calculateSeoScore({ critical: 100, warning: 100, info: 100 })).toBe(0);
  });

  it("is wired into buildSeoReport", () => {
    const report = buildSeoReport([
      healthyPage({ robotsMeta: "noindex" }), // critical (25)
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title: "Short" }), // warning (5)
      healthyPage({
        monitoredPageId: "page_3",
        url: "https://example.com/b",
        title: "b".repeat(55),
        canonicalUrl: null,
      }), // info (1)
    ]);
    expect(report.counts).toEqual({ critical: 1, warning: 1, info: 1 });
    expect(report.score).toBe(69);
    expect(report.pagesWithIssues).toBe(3);
  });
});

describe("seoScoreBand", () => {
  it("bands with labels always attached", () => {
    expect(seoScoreBand(100)).toEqual({ label: "Healthy", tone: "success" });
    expect(seoScoreBand(90)).toEqual({ label: "Healthy", tone: "success" });
    expect(seoScoreBand(89)).toEqual({ label: "Needs attention", tone: "warning" });
    expect(seoScoreBand(70)).toEqual({ label: "Needs attention", tone: "warning" });
    expect(seoScoreBand(69)).toEqual({ label: "At risk", tone: "critical" });
    expect(seoScoreBand(0)).toEqual({ label: "At risk", tone: "critical" });
  });
});

describe("grouping and ordering", () => {
  it("groups issues by check in SEO_CHECK_ORDER", () => {
    const report = buildSeoReport([
      healthyPage({ canonicalUrl: null }),
      healthyPage({ monitoredPageId: "page_2", url: "https://example.com/a", title: null }),
      healthyPage({ monitoredPageId: "page_3", url: "https://example.com/b", httpStatus: 503 }),
    ]);
    const groups = groupIssuesByCheck(report.issues);
    expect(groups.map((g) => g.check)).toEqual(["page-error", "missing-title", "missing-canonical"]);
    expect(groups.every((g) => g.issues.length > 0)).toBe(true);
  });

  it("sorts issues by check order, then page URL", () => {
    const report = buildSeoReport([
      healthyPage({ url: "https://example.com/z", canonicalUrl: null }),
      healthyPage({
        monitoredPageId: "page_2",
        url: "https://example.com/a",
        title: "a".repeat(55),
        canonicalUrl: null,
      }),
    ]);
    expect(report.issues.map((i) => i.pageUrl)).toEqual([
      "https://example.com/a",
      "https://example.com/z",
    ]);
  });

  it("has display metadata for every check id", () => {
    for (const check of SEO_CHECK_ORDER) {
      expect(SEO_CHECK_META[check].title.length).toBeGreaterThan(0);
      expect(SEO_CHECK_META[check].why.length).toBeGreaterThan(0);
    }
  });
});

describe("multiple issues on one page", () => {
  it("reports each failed check and counts the page once", () => {
    const report = buildSeoReport([
      healthyPage({
        title: null,
        metaDescription: null,
        canonicalUrl: null,
        h1Values: [],
      }),
    ]);
    expect(report.issues.map((i) => i.check).sort()).toEqual([
      "missing-canonical",
      "missing-description",
      "missing-h1",
      "missing-title",
    ]);
    expect(report.pagesWithIssues).toBe(1);
    // 3 warnings (5 each) + 1 info = 84
    expect(report.score).toBe(84);
  });
});
