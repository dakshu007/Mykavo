import { describe, expect, it } from "vitest";
import {
  compareBrokenLinks,
  isBrokenLinkStatus,
  type PageLinkObservations,
} from "./links";

function page(pageUrl: string, links: Array<[string, number | null, ("INTERNAL" | "EXTERNAL")?]>): PageLinkObservations {
  return {
    pageUrl,
    links: links.map(([normalizedUrl, statusCode, linkType]) => ({
      normalizedUrl,
      statusCode,
      linkType: linkType ?? "INTERNAL",
    })),
  };
}

describe("isBrokenLinkStatus", () => {
  it("treats unreachable, 404, 410 and 5xx as broken", () => {
    expect(isBrokenLinkStatus(0)).toBe(true);
    expect(isBrokenLinkStatus(404)).toBe(true);
    expect(isBrokenLinkStatus(410)).toBe(true);
    expect(isBrokenLinkStatus(500)).toBe(true);
    expect(isBrokenLinkStatus(503)).toBe(true);
  });

  it("never flags unchecked, auth-gated, or rate-limited links", () => {
    expect(isBrokenLinkStatus(null)).toBe(false);
    expect(isBrokenLinkStatus(200)).toBe(false);
    expect(isBrokenLinkStatus(301)).toBe(false);
    expect(isBrokenLinkStatus(401)).toBe(false);
    expect(isBrokenLinkStatus(403)).toBe(false);
    expect(isBrokenLinkStatus(429)).toBe(false);
  });
});

describe("compareBrokenLinks", () => {
  it("returns null when nothing is broken", () => {
    const result = compareBrokenLinks(
      [page("https://a.com/", [["https://a.com/x", 200]])],
      [page("https://a.com/", [["https://a.com/x", 200]])],
    );
    expect(result).toBeNull();
  });

  it("groups a newly broken link across pages into one signal", () => {
    const result = compareBrokenLinks(
      [],
      [
        page("https://a.com/", [["https://a.com/gone", 404], ["https://a.com/ok", 200]]),
        page("https://a.com/about", [["https://a.com/gone", 404]]),
      ],
    );
    expect(result).toEqual({
      kind: "broken_links",
      count: 1,
      totalChecked: 2,
      samples: [{ url: "https://a.com/gone", status: 404, pages: 2 }],
    });
  });

  it("skips links that were already broken in the baseline", () => {
    const result = compareBrokenLinks(
      [page("https://a.com/", [["https://a.com/gone", 404]])],
      [page("https://a.com/", [["https://a.com/gone", 404]])],
    );
    expect(result).toBeNull();
  });

  it("still fires when the baseline never recorded statuses (legacy baselines)", () => {
    const result = compareBrokenLinks(
      [page("https://a.com/", [["https://a.com/gone", null]])],
      [page("https://a.com/", [["https://a.com/gone", 404]])],
    );
    expect(result?.count).toBe(1);
  });

  it("ignores external links and unchecked links", () => {
    const result = compareBrokenLinks(
      [],
      [
        page("https://a.com/", [
          ["https://other.com/gone", 404, "EXTERNAL"],
          ["https://a.com/unchecked", null],
        ]),
      ],
    );
    expect(result).toBeNull();
  });

  it("excludes monitored-page URLs (covered by availability events)", () => {
    const result = compareBrokenLinks(
      [],
      [page("https://a.com/", [["https://a.com/pricing", 404]])],
      { excludeUrls: new Set(["https://a.com/pricing"]) },
    );
    expect(result).toBeNull();
  });

  it("sorts samples by page reach and respects maxSamples", () => {
    const result = compareBrokenLinks(
      [],
      [
        page("https://a.com/1", [["https://a.com/everywhere", 404], ["https://a.com/rare", 500]]),
        page("https://a.com/2", [["https://a.com/everywhere", 404]]),
        page("https://a.com/3", [["https://a.com/everywhere", 404], ["https://a.com/dead", 0]]),
      ],
      { maxSamples: 2 },
    );
    expect(result?.count).toBe(3);
    expect(result?.samples).toHaveLength(2);
    expect(result?.samples[0]).toEqual({ url: "https://a.com/everywhere", status: 404, pages: 3 });
  });

  it("counts totalChecked over unique checked links only", () => {
    const result = compareBrokenLinks(
      [],
      [
        page("https://a.com/1", [["https://a.com/x", 200], ["https://a.com/y", null]]),
        page("https://a.com/2", [["https://a.com/x", 200], ["https://a.com/gone", 404]]),
      ],
    );
    expect(result?.totalChecked).toBe(2); // x + gone; y was never checked
  });
});
