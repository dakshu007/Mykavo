import { describe, expect, it } from "vitest";
import {
  MAX_SELECTOR_LENGTH,
  MAX_STABILIZATION_SELECTORS,
  isPlausibleSelector,
  parseSelectorList,
  selectorLines,
  validateSelectorLines,
} from "./stabilization";

describe("isPlausibleSelector", () => {
  it("accepts common CSS selectors", () => {
    for (const s of [
      ".cookie-banner",
      "#ad-slot",
      "header nav > .badge",
      '[data-testid="user-count"]',
      "div.a, div.b",
      ":is(.a, .b) .c",
    ]) {
      expect(isPlausibleSelector(s), s).toBe(true);
    }
  });

  it("rejects empty, over-long, braces, and newlines", () => {
    expect(isPlausibleSelector("")).toBe(false);
    expect(isPlausibleSelector("a".repeat(MAX_SELECTOR_LENGTH + 1))).toBe(false);
    expect(isPlausibleSelector(".a { color: red }")).toBe(false);
    expect(isPlausibleSelector(".a\n.b")).toBe(false);
    expect(isPlausibleSelector(".a\r\n.b")).toBe(false);
  });

  it("accepts a selector exactly at the length cap", () => {
    expect(isPlausibleSelector("a".repeat(MAX_SELECTOR_LENGTH))).toBe(true);
  });
});

describe("parseSelectorList", () => {
  it("returns [] for non-array values (null, objects, strings)", () => {
    expect(parseSelectorList(null)).toEqual([]);
    expect(parseSelectorList(undefined)).toEqual([]);
    expect(parseSelectorList(".a")).toEqual([]);
    expect(parseSelectorList({ 0: ".a" })).toEqual([]);
    expect(parseSelectorList(42)).toEqual([]);
  });

  it("keeps only trimmed, non-empty string entries", () => {
    expect(
      parseSelectorList([" .banner ", "", "   ", 7, null, { s: ".x" }, "#ads"]),
    ).toEqual([".banner", "#ads"]);
  });

  it("drops implausible selectors without failing the rest", () => {
    expect(
      parseSelectorList([".ok", ".bad { display: none }", ".also-ok", "a\nb"]),
    ).toEqual([".ok", ".also-ok"]);
    expect(parseSelectorList([".ok", "x".repeat(MAX_SELECTOR_LENGTH + 1)])).toEqual([
      ".ok",
    ]);
  });

  it("deduplicates after trimming", () => {
    expect(parseSelectorList([".a", " .a", ".a ", ".b"])).toEqual([".a", ".b"]);
  });

  it("caps the list at the maximum", () => {
    const many = Array.from({ length: 30 }, (_, i) => `.sel-${i}`);
    const parsed = parseSelectorList(many);
    expect(parsed).toHaveLength(MAX_STABILIZATION_SELECTORS);
    expect(parsed[0]).toBe(".sel-0");
    expect(parsed[MAX_STABILIZATION_SELECTORS - 1]).toBe(
      `.sel-${MAX_STABILIZATION_SELECTORS - 1}`,
    );
  });
});

describe("selectorLines", () => {
  it("splits on newlines, trims, and drops blank lines", () => {
    expect(selectorLines(" .a \n\n  #b\n\t.c  \n")).toEqual([".a", "#b", ".c"]);
  });

  it("deduplicates lines", () => {
    expect(selectorLines(".a\n.a\n.b")).toEqual([".a", ".b"]);
  });

  it("returns [] for empty input", () => {
    expect(selectorLines("")).toEqual([]);
    expect(selectorLines("  \n \n")).toEqual([]);
  });

  it("keeps invalid entries so validation can surface them", () => {
    expect(selectorLines(".a { color: red }")).toEqual([".a { color: red }"]);
  });
});

describe("validateSelectorLines", () => {
  it("accepts a valid list", () => {
    expect(validateSelectorLines([".a", "#b", '[data-x="1"]'])).toBeNull();
    expect(validateSelectorLines([])).toBeNull();
  });

  it("rejects too many selectors", () => {
    const many = Array.from({ length: MAX_STABILIZATION_SELECTORS + 1 }, (_, i) => `.s${i}`);
    expect(validateSelectorLines(many)).toMatch(/Maximum 20/);
  });

  it("rejects over-long selectors", () => {
    expect(validateSelectorLines(["x".repeat(MAX_SELECTOR_LENGTH + 1)])).toMatch(
      /200 characters/,
    );
  });

  it("rejects braces (pasted CSS rules)", () => {
    expect(validateSelectorLines([".a { display: none }"])).toMatch(/can't contain/);
  });
});
