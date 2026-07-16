import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * WCAG contrast audit for the design tokens in app/globals.css.
 *
 * Parses the real stylesheet (no duplicated palette to drift), extracts the
 * light (:root) and dark (:root[data-theme="dark"]) token blocks, and asserts
 * AA contrast on every meaningful foreground/background pairing. Also asserts
 * the two dark blocks (attribute override + prefers-color-scheme) stay
 * identical.
 */

const css = readFileSync(
  fileURLToPath(new URL("../app/globals.css", import.meta.url)),
  "utf8",
);

type Tokens = Record<string, string>;

/** Selectors must start at the beginning of a line, so mentions of the same
 * selectors inside the header comment are never matched. */
function extractBlock(selectorStart: string): string {
  const start = css.indexOf(`\n${selectorStart}`);
  if (start === -1) throw new Error(`selector not found: ${selectorStart}`);
  const open = css.indexOf("{", start);
  const close = css.indexOf("}", open);
  return css.slice(open + 1, close);
}

function parseTokens(block: string): Tokens {
  const tokens: Tokens = {};
  for (const match of block.matchAll(/--fx-([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens[match[1]] = match[2].toLowerCase();
  }
  return tokens;
}

const light = parseTokens(extractBlock(":root {"));
const dark = parseTokens(extractBlock(':root[data-theme="dark"] {'));
const darkMedia = parseTokens(extractBlock('  :root:not([data-theme="light"]) {'));

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  const [r, g, b] = [channel(1), channel(3), channel(5)];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** [foreground token, background token, minimum ratio] */
const TEXT_PAIRS: [string, string, number][] = [
  // Body text on every surface.
  ["ink", "card", 7],
  ["ink", "surface", 7],
  ["ink", "canvas", 7],
  ["ink-secondary", "card", 4.5],
  ["ink-secondary", "surface", 4.5],
  ["ink-secondary", "canvas", 4.5],
  // Inverted pills/buttons (bg-ink text-ink-inverse).
  ["ink-inverse", "ink", 4.5],
  ["ink-inverse", "ink-hover", 4.5],
  // Links and primary buttons.
  ["primary", "card", 4.5],
  ["primary", "surface", 4.5],
  ["primary", "canvas", 4.5],
  ["primary", "primary-soft", 4.5],
  ["primary-contrast", "primary", 4.5],
  ["primary-contrast", "primary-hover", 4.5],
  // Status text on -soft chips and on cards.
  ["success-strong", "success-soft", 4.5],
  ["success-strong", "card", 4.5],
  ["warning-strong", "warning-soft", 4.5],
  ["warning-strong", "card", 4.5],
  ["critical-strong", "critical-soft", 4.5],
  ["critical-strong", "card", 4.5],
  ["orange-strong", "orange-soft", 4.5],
  ["orange-strong", "card", 4.5],
  ["info", "info-soft", 4.5],
  ["info", "card", 4.5],
];

/** Non-text UI (status dots, chart lines) - WCAG 1.4.11 needs 3:1. In light
 * mode the amber/orange dots are brand colors that predate this audit and are
 * always paired with a text label, so they get a documented lower floor. */
const GRAPHIC_PAIRS_DARK: [string, string, number][] = [
  ["success", "card", 3],
  ["warning", "card", 3],
  ["critical", "card", 3],
  ["orange", "card", 3],
  ["chart-amber", "card", 3],
  ["chart-violet", "card", 3],
];
const GRAPHIC_PAIRS_LIGHT: [string, string, number][] = [
  ["success", "card", 3],
  ["warning", "card", 2],
  ["critical", "card", 3],
  ["orange", "card", 2.5],
  ["chart-amber", "card", 3],
  ["chart-violet", "card", 3],
];

describe("globals.css token blocks", () => {
  it("parses light and dark palettes", () => {
    expect(Object.keys(light).length).toBeGreaterThan(20);
    expect(Object.keys(dark).length).toBeGreaterThan(20);
  });

  it("keeps the explicit-choice and media-query dark blocks identical", () => {
    expect(darkMedia).toEqual(dark);
  });

  it("defines the same tokens in light and dark", () => {
    expect(Object.keys(dark).sort()).toEqual(Object.keys(light).sort());
  });

  it("keeps the always-dark panel readable under white text in both themes", () => {
    expect(contrast("#ffffff", light.panel)).toBeGreaterThanOrEqual(4.5);
    expect(contrast("#ffffff", dark.panel)).toBeGreaterThanOrEqual(4.5);
  });
});

describe.each([
  ["light", light, GRAPHIC_PAIRS_LIGHT],
  ["dark", dark, GRAPHIC_PAIRS_DARK],
] as const)("%s theme contrast", (_name, tokens, graphicPairs) => {
  it.each(TEXT_PAIRS)("%s on %s ≥ %s (text)", (fg, bg, min) => {
    expect(tokens[fg], `token ${fg} missing`).toBeDefined();
    expect(tokens[bg], `token ${bg} missing`).toBeDefined();
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });

  it.each(graphicPairs)("%s on %s ≥ %s (non-text)", (fg, bg, min) => {
    expect(contrast(tokens[fg], tokens[bg])).toBeGreaterThanOrEqual(min);
  });
});
