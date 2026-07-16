/**
 * Landing-page design system v4 — "bright gold" edition.
 *
 * A mash-up of the best patterns from ballpark.ing (island nav, browser-chrome
 * product mock, giant footer wordmark), tryplayground.com (warm paper canvas,
 * huge headlines, category tab pills), v7labs.com (before/after stat pairs),
 * hydradb.com (monospace eyebrows + terminal scan logs), neon.com (numbered
 * workflow, feature trios) and retool.com (hairline bento cards) — rebuilt
 * around the MyKavo gold spark as the loud, single accent.
 *
 * The landing page deliberately runs on a FIXED palette — identical in light
 * and dark app themes — so it never routes through the `--fx-*` theme tokens
 * the dashboard uses. Every color lives here as a constant so the page stays
 * consistent; nothing else in the app should import this file.
 *
 * Fonts: Poppins (display headings) + "Google Sans" body. Both variables are
 * registered globally in app/layout.tsx: --font-poppins drives every h1/h2
 * site-wide (globals.css base rule), and Google Sans is Google's proprietary
 * font that can't be bundled — the body stack prefers a locally installed
 * "Google Sans" and otherwise renders DM Sans (--font-app-sans).
 */

/** Body font utility ("Google Sans" → DM Sans fallback). Apply on the landing root. */
export const fontSans =
  "[font-family:'Google_Sans',var(--font-app-sans),ui-sans-serif,system-ui,sans-serif]";

/**
 * Display utility (Poppins) for the big headlines — medium weight with tight
 * tracking for the bright, confident look.
 */
export const fontDisplay =
  "[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] font-medium tracking-[-0.02em]";

/** Fixed landing palette (never theme-dependent). Contrast-checked pairs only:
 *  ink/dim on canvas+paper+white; ink on gold; boneSoft/faint on ink bands. */
export const canvas = "#FBFAF3"; // warm bright paper — the page background
export const paper = "#F3F1E6"; // deeper paper for alternate panels
export const elevated = "#FFFFFF"; // white cards on the paper canvas
export const ink = "#151515"; // primary text + the dark drama bands
export const inkBand = "#151515"; // full-width dark section background
export const gold = "#FFD400"; // the spark — sole accent, ALWAYS with ink text
export const goldSoft = "#FFF3B0"; // pale gold tint for highlights/hover fills
export const dim = "#6B6B60"; // secondary text on light surfaces (≥4.5:1)
export const boneSoft = "#E9EBDF"; // primary text on ink bands
export const dimOnDark = "#9C9E93"; // secondary text on ink bands

/** Legacy alias kept for older imports — same value as `paper`. */
export const bone = "#F3F1E6";

/** Monospace hydradb-style eyebrow label on light surfaces. */
export const eyebrow =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]";

/** Eyebrow variant for the dark ink bands. */
export const eyebrowOnDark =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9C9E93]";

/** Hairline-bordered white card — the standard bento cell on the paper canvas. */
export const card = "rounded-2xl border border-black/10 bg-white";

/** Card with the crisp offset ink shadow — for hero-level objects only. */
export const cardPop =
  "rounded-2xl border border-[#151515] bg-white shadow-[6px_6px_0_#151515]";

/** Hairline border color used for grid dividers on light surfaces. */
export const hairline = "border-black/10";
