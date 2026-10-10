import { describe, expect, it } from "vitest";
import { buildNoindexReport, extractRobotsMetas, hasNoindex, parseXRobotsTag } from "./noindex";

const robotsTxt = { checked: true, status: 200, blocked: false, rule: null, note: null };
const base = { url: "https://e.com/a", finalUrl: "https://e.com/a", httpStatus: 200, redirectCount: 0, xRobotsTag: null, robotsTxt };

describe("noindex", () => {
  it("reads robots and googlebot meta tags in any attribute order", () => {
    const html = `<meta content="noindex,follow" name="robots"><meta name="googlebot" content="nosnippet"><meta name="viewport" content="x">`;
    expect(extractRobotsMetas(html)).toEqual([
      { source: "meta", agent: "robots", value: "noindex,follow" },
      { source: "meta", agent: "googlebot", value: "nosnippet" },
    ]);
  });

  it("splits X-Robots-Tag by agent without confusing max-snippet values", () => {
    expect(parseXRobotsTag("max-snippet: 50, noarchive, googlebot: noindex, nofollow")).toEqual([
      { source: "header", agent: "*", value: "max-snippet: 50, noarchive" },
      { source: "header", agent: "googlebot", value: "noindex, nofollow" },
    ]);
    expect(parseXRobotsTag(null)).toEqual([]);
  });

  it("treats none as noindex", () => {
    expect(hasNoindex("none")).toBe(true);
    expect(hasNoindex("index, follow")).toBe(false);
  });

  it("verdicts: indexable, meta noindex, header noindex, other-bot only, non-200", () => {
    expect(buildNoindexReport({ ...base, html: "<title>x</title>" }).verdict).toBe("indexable");
    const meta = buildNoindexReport({ ...base, html: `<meta name="robots" content="noindex">` });
    expect(meta.verdict).toBe("noindex");
    expect(meta.reasons[0]).toContain("noindex");
    expect(buildNoindexReport({ ...base, html: "", xRobotsTag: "googlebot: none" }).verdict).toBe("noindex");
    expect(buildNoindexReport({ ...base, html: "", xRobotsTag: "bingbot: noindex" }).verdict).toBe("indexable");
    expect(buildNoindexReport({ ...base, html: "", httpStatus: 404 }).verdict).toBe("not-200");
  });

  it("flags a canonical pointing at another page but not a trailing-slash variant", () => {
    const other = buildNoindexReport({ ...base, html: `<link rel="canonical" href="/b">` });
    expect(other.canonicalPointsElsewhere).toBe(true);
    expect(other.canonicalUrl).toBe("https://e.com/b");
    expect(buildNoindexReport({ ...base, html: `<link href="https://e.com/a/" rel="canonical">` }).canonicalPointsElsewhere).toBe(false);
  });
});
