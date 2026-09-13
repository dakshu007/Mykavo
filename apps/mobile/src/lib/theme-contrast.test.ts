import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  changeStatusColors,
  darkPalette,
  lightPalette,
  scanStatusColors,
  severityColors,
  websiteStatusColors,
  type FxPalette,
} from "./theme";

/**
 * WCAG contrast audit for the mobile palette - the counterpart of the web's
 * lib/theme-contrast.test.ts.
 *
 * This exists because of a real bug: MyKavo's brand gold (#ffd400) is a
 * BACKGROUND colour. As text on white it measures 1.39:1, nowhere near the
 * 4.5:1 AA floor, so every `palette.primary` used as a text or icon colour was
 * effectively invisible. `accent` is the text-safe gold; these assertions stop
 * the two from being confused again.
 */

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

const themes: [string, FxPalette][] = [
  ["light", lightPalette],
  ["dark", darkPalette],
];

/** [foreground, background, min ratio, what it is] */
function textPairs(p: FxPalette): [string, string, number, string][] {
  return [
    [p.ink, p.card, 4.5, "body text on a card"],
    [p.ink, p.canvas, 4.5, "body text on the canvas"],
    [p.ink, p.surface, 4.5, "body text on a surface"],
    [p.inkSecondary, p.card, 4.5, "secondary text on a card"],
    [p.inkSecondary, p.canvas, 4.5, "secondary text on the canvas"],
    // Faint text is metadata at >=13px, held to the AA large-text floor.
    [p.inkFaint, p.card, 3, "faint text on a card"],
    // Gold: ink ON gold is the button; accent is gold AS text.
    [p.primaryContrast, p.primary, 4.5, "button label on gold"],
    [p.accent, p.card, 4.5, "accent text on a card"],
    [p.accent, p.canvas, 4.5, "accent text on the canvas"],
    [p.accent, p.primarySoft, 4.5, "accent text on the soft-gold chip"],
    // Status text always sits on its own soft chip.
    [p.successStrong, p.successSoft, 4.5, "success text on its chip"],
    [p.warningStrong, p.warningSoft, 4.5, "warning text on its chip"],
    [p.orangeStrong, p.orangeSoft, 4.5, "orange text on its chip"],
    [p.criticalStrong, p.criticalSoft, 4.5, "critical text on its chip"],
    [p.info, p.infoSoft, 4.5, "info text on its chip"],
  ];
}

describe.each(themes)("%s palette text contrast", (_name, palette) => {
  it.each(textPairs(palette))(
    "%s on %s clears %s:1 (%s)",
    (fg, bg, min) => {
      expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min);
    },
  );
});

describe.each(themes)("%s badge label contrast", (_name, palette) => {
  it("every severity chip label is readable on its own chip", () => {
    for (const severity of ["INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"] as const) {
      const c = severityColors(palette, severity);
      expect(contrast(c.text, c.bg), `${severity} label`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("every scan-status chip label is readable on its own chip", () => {
    for (const status of ["QUEUED", "RUNNING", "COMPLETED", "PARTIAL", "FAILED"] as const) {
      const c = scanStatusColors(palette, status);
      expect(contrast(c.text, c.bg), `${status} label`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("every change-status chip label is readable on its own chip", () => {
    for (const status of ["NEW", "REVIEWED", "APPROVED", "RESOLVED", "IGNORED"] as const) {
      const c = changeStatusColors(palette, status);
      expect(contrast(c.text, c.bg), `${status} label`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("every website-status label is readable on a card", () => {
    // These render as coloured text on the card, with no chip behind them.
    for (const status of [
      "PENDING",
      "DISCOVERING",
      "BASELINING",
      "ACTIVE",
      "PAUSED",
      "ERROR",
    ] as const) {
      const c = websiteStatusColors(palette, status);
      // PAUSED is deliberately faint (inkFaint) - held to the large-text floor.
      const min = status === "PAUSED" ? 3 : 4.5;
      expect(contrast(c.text, palette.card), `${status} label`).toBeGreaterThanOrEqual(min);
    }
  });
});

describe("the always-dark panel", () => {
  it("carries white text in both themes", () => {
    // `panel` is #16181d in BOTH palettes (it is the dark sidebar/panel), so
    // the pairing to assert is white on it - not `inkInverse`, which is the
    // light-theme token and is itself near-black in dark mode.
    for (const [name, palette] of themes) {
      expect(contrast("#ffffff", palette.panel), name).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("gold is never used as a text colour", () => {
  it("brand gold would fail AA as text, which is why `accent` exists", () => {
    // The measurement that caused this whole split. If this ever passes,
    // `primary` became a text-safe colour and the rule below can relax.
    expect(contrast(lightPalette.primary, lightPalette.card)).toBeLessThan(4.5);
  });

  it("no screen passes palette.primary where a text or icon colour is expected", () => {
    // A source guard: the palette assertions above cannot see a screen that
    // hands `palette.primary` to a <Text color> or a lucide icon.
    const srcRoot = fileURLToPath(new URL("..", import.meta.url));
    const offenders: string[] = [];

    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === "node_modules") continue;
          walk(full);
          continue;
        }
        if (!entry.name.endsWith(".tsx")) continue;
        const source = readFileSync(full, "utf8")
          // Strip comments so prose about this rule never trips it.
          .replace(/\/\*[\s\S]*?\*\//g, "")
          .replace(/(^|[^:])\/\/.*$/gm, "$1");
        const patterns = [/color=\{palette\.primary\}/, /\bcolor:\s*palette\.primary\b/];
        if (patterns.some((re) => re.test(source))) {
          offenders.push(relative(srcRoot, full));
        }
      }
    };
    walk(srcRoot);

    // The walk must actually find files, or this guard proves nothing.
    expect(existsSync(join(srcRoot, "components", "ui.tsx"))).toBe(true);
    expect(offenders).toEqual([]);
  });
});
