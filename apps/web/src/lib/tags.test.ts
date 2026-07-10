import { describe, expect, it } from "vitest";
import {
  MAX_TAGS_PER_WEBSITE,
  MAX_TAG_LENGTH,
  matchesTagFilter,
  normalizeTag,
  parseTagFilterParam,
  parseTags,
  validateNewTag,
} from "./tags";

describe("normalizeTag", () => {
  it("trims and lowercases", () => {
    expect(normalizeTag("  Acme  ")).toBe("acme");
    expect(normalizeTag("RETAINER")).toBe("retainer");
  });

  it("collapses inner whitespace to single hyphens", () => {
    expect(normalizeTag("acme corp")).toBe("acme-corp");
    expect(normalizeTag("team   alpha\tbeta")).toBe("team-alpha-beta");
  });

  it("strips characters outside [a-z0-9-]", () => {
    expect(normalizeTag("client: acme!")).toBe("client-acme");
    expect(normalizeTag("a/b_test")).toBe("abtest");
    expect(normalizeTag("50% off")).toBe("50-off");
  });

  it("strips diacritics instead of dropping the letters", () => {
    expect(normalizeTag("Café Régie")).toBe("cafe-regie");
  });

  it("drops non-latin unicode that has no ascii fallback", () => {
    expect(normalizeTag("日本語")).toBe("");
    expect(normalizeTag("acme 日本")).toBe("acme");
  });

  it("collapses hyphen runs and trims leading/trailing hyphens", () => {
    expect(normalizeTag("--acme -- corp--")).toBe("acme-corp");
    expect(normalizeTag(" - ")).toBe("");
  });

  it("caps at MAX_TAG_LENGTH without a trailing hyphen", () => {
    const long = normalizeTag("a".repeat(30));
    expect(long).toBe("a".repeat(MAX_TAG_LENGTH));
    // Cut lands on a hyphen boundary: "aaaaaaaaaaaaaaaaaaa-bbb" → no dangler.
    expect(normalizeTag(`${"a".repeat(MAX_TAG_LENGTH - 1)} bbb`)).toBe(
      "a".repeat(MAX_TAG_LENGTH - 1),
    );
  });

  it("returns empty string when nothing usable remains", () => {
    expect(normalizeTag("")).toBe("");
    expect(normalizeTag("   ")).toBe("");
    expect(normalizeTag("!!!***")).toBe("");
  });
});

describe("parseTags", () => {
  it("returns [] for non-array Json values", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags(undefined)).toEqual([]);
    expect(parseTags("acme")).toEqual([]);
    expect(parseTags({ 0: "acme" })).toEqual([]);
    expect(parseTags(42)).toEqual([]);
  });

  it("keeps only strings that normalize to non-empty tags", () => {
    expect(parseTags(["acme", 7, null, { t: "x" }, "!!!", " Retainer "])).toEqual([
      "acme",
      "retainer",
    ]);
  });

  it("dedupes after normalization", () => {
    expect(parseTags(["Acme", "acme", " ACME "])).toEqual(["acme"]);
  });

  it("caps at MAX_TAGS_PER_WEBSITE", () => {
    const many = ["a", "b", "c", "d", "e", "f", "g"];
    expect(parseTags(many)).toEqual(many.slice(0, MAX_TAGS_PER_WEBSITE));
  });
});

describe("validateNewTag", () => {
  it("returns the normalized tag on success", () => {
    expect(validateNewTag(" Acme Corp ", [])).toEqual({ tag: "acme-corp" });
  });

  it("rejects input that normalizes to nothing", () => {
    const result = validateNewTag("!!!", []);
    expect(result.error).toMatch(/letter or number/);
  });

  it("rejects duplicates (case/spacing-insensitive)", () => {
    const result = validateNewTag(" ACME ", ["acme"]);
    expect(result.error).toContain("already added");
  });

  it("rejects a sixth tag", () => {
    const existing = ["a", "b", "c", "d", "e"];
    const result = validateNewTag("f", existing);
    expect(result.error).toContain(`${MAX_TAGS_PER_WEBSITE}`);
  });
});

describe("parseTagFilterParam", () => {
  it("returns [] when the param is absent", () => {
    expect(parseTagFilterParam(undefined)).toEqual([]);
  });

  it("parses a comma list", () => {
    expect(parseTagFilterParam("acme,retainer")).toEqual(["acme", "retainer"]);
  });

  it("parses repeated params and mixed comma lists", () => {
    expect(parseTagFilterParam(["acme", "retainer,team-a"])).toEqual([
      "acme",
      "retainer",
      "team-a",
    ]);
  });

  it("normalizes, dedupes, and drops junk", () => {
    expect(parseTagFilterParam("Acme, acme ,!!!,")).toEqual(["acme"]);
  });

  it("caps runaway hand-edited URLs", () => {
    const value = Array.from({ length: 12 }, (_, i) => `t${i}`).join(",");
    expect(parseTagFilterParam(value)).toHaveLength(MAX_TAGS_PER_WEBSITE);
  });
});

describe("matchesTagFilter", () => {
  it("matches everything when no filter is active", () => {
    expect(matchesTagFilter([], [])).toBe(true);
    expect(matchesTagFilter(["acme"], [])).toBe(true);
  });

  it("requires every active tag (multi-select narrows)", () => {
    expect(matchesTagFilter(["acme", "retainer"], ["acme"])).toBe(true);
    expect(matchesTagFilter(["acme", "retainer"], ["acme", "retainer"])).toBe(true);
    expect(matchesTagFilter(["acme"], ["acme", "retainer"])).toBe(false);
  });

  it("never matches untagged sites while a filter is active", () => {
    expect(matchesTagFilter([], ["acme"])).toBe(false);
  });
});
