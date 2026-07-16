/**
 * Landing-page design system v3 — retool.com-inspired: near-black canvas,
 * warm bone panels, hairline-bordered bento cards, and the MyKavo gold spark
 * as the single accent.
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
 * Display utility (Poppins) for the big headlines — regular weight with tight
 * tracking for the retool-style light editorial look.
 */
export const fontDisplay =
  "[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] font-normal tracking-[-0.02em]";

/** Fixed landing palette (never theme-dependent). Contrast-checked pairs only:
 *  bone/dim on canvas+elevated; ink on bone/gold; gold carries INK text. */
export const canvas = "#151515"; // near-black page background
export const elevated = "#242424"; // raised dark cards
export const bone = "#F7F8F4"; // warm off-white panels — ink text on top
export const boneSoft = "#E9EBDF"; // primary text on dark, softer bone fills
export const ink = "#151515"; // text on bone/gold surfaces
export const gold = "#FFD400"; // the spark — sole accent, ALWAYS with ink text
export const dim = "#9C9E93"; // secondary text on dark (≥4.5:1 on canvas)

/** Letterspaced uppercase eyebrow label on the dark canvas. */
export const eyebrow = "text-[12px] font-medium uppercase tracking-[0.22em] text-[#9C9E93]";

/** Hairline-bordered dark card — the bento cell treatment. */
export const card = "rounded-2xl border border-white/10 bg-[#242424]";

/** Hairline border color used for grid dividers. */
export const hairline = "border-white/10";
