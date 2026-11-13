import { describe, expect, it } from "vitest";
import { brandTermsFor, findStrikingDistance, typicalCtr, type QueryPageRow } from "./striking-distance";

const row = (over: Partial<QueryPageRow>): QueryPageRow => ({
  query: "website change monitoring",
  page: "https://example.com/a",
  clicks: 2,
  impressions: 400,
  ctr: 0.005,
  position: 11,
  ...over,
});

describe("findStrikingDistance", () => {
  it("keeps positions 8 to 20 with enough impressions", () => {
    const result = findStrikingDistance([
      row({ query: "too high", position: 3 }),
      row({ query: "on the edge", position: 7.6 }),
      row({ query: "page two", position: 15 }),
      row({ query: "last of page two", position: 20.4 }),
      row({ query: "too low", position: 21 }),
      row({ query: "too quiet", impressions: 5 }),
    ]);
    expect(result.map((r) => r.query).sort()).toEqual(["last of page two", "on the edge", "page two"]);
  });

  it("lists each query once, against the page with the most impressions", () => {
    const [only, ...rest] = findStrikingDistance([
      row({ page: "https://example.com/a", impressions: 100, position: 14 }),
      row({ page: "https://example.com/b", impressions: 300, position: 12 }),
      row({ page: "https://example.com/c", impressions: 50, position: 45 }),
    ]);
    expect(rest).toHaveLength(0);
    expect(only?.page).toBe("https://example.com/b");
    // /c ranks too far down to count as competition.
    expect(only?.competingPages).toEqual(["https://example.com/a"]);
    expect(only?.reason).toMatch(/Another of your pages also ranks/);
  });

  it("skips searches for the site's own name", () => {
    const result = findStrikingDistance(
      [row({ query: "mykavo pricing" }), row({ query: "my kavo login" }), row({ query: "seo monitoring" })],
      { brandTerms: brandTermsFor("https://www.mykavo.app/") },
    );
    expect(result.map((r) => r.query)).toEqual(["seo monitoring"]);
  });

  it("ranks by estimated extra clicks and never estimates below zero", () => {
    const result = findStrikingDistance([
      row({ query: "small", impressions: 100, ctr: 0 }),
      row({ query: "big", impressions: 1000, ctr: 0.01 }),
      row({ query: "already clicky", impressions: 900, ctr: 0.2 }),
    ]);
    expect(result.map((r) => r.query)).toEqual(["big", "small", "already clicky"]);
    expect(result[0]?.estimatedExtraClicks).toBe(Math.round(1000 * (typicalCtr(4) - 0.01)));
    expect(result[2]?.estimatedExtraClicks).toBe(0);
  });

  it("suggests improving the page near page one and a supporting post further down", () => {
    const [near] = findStrikingDistance([row({ position: 9 })]);
    const [far] = findStrikingDistance([row({ position: 17 })]);
    expect(near?.action).toBe("improve_page");
    expect(near?.reason).toMatch(/already on page one/);
    expect(far?.action).toBe("supporting_post");
    expect(far?.reason).toMatch(/page two/);
  });

  it("is deterministic for the same input", () => {
    const rows = [row({ query: "b" }), row({ query: "a" }), row({ query: "c", impressions: 900 })];
    expect(findStrikingDistance(rows)).toEqual(findStrikingDistance([...rows].reverse()));
  });
});

describe("brandTermsFor", () => {
  it("uses the main hostname label, ignoring short ones and bad URLs", () => {
    expect(brandTermsFor("https://www.mykavo.app/pricing")).toEqual(["mykavo"]);
    expect(brandTermsFor("https://bbc.co.uk")).toEqual([]);
    expect(brandTermsFor("not a url")).toEqual([]);
  });
});
