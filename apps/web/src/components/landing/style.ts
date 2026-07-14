/**
 * Landing-page design system (stamped.io-inspired editorial style on a light
 * canvas).
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

/** Display utility (Poppins) for the big editorial headlines. */
export const fontDisplay =
  "[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] font-semibold";

/** Fixed landing palette (never theme-dependent). */
export const canvas = "#ecf0ff"; // soft periwinkle-white page background
export const ink = "#0d0c0e"; // near-black text + black pill surfaces
export const primary = "#3556f4"; // dashboard royal blue — surfaces w/ WHITE text
export const primarySoft = "#8fa2ff"; // light tint for glyphs on DARK surfaces (e.g. black pricing card)
export const lavender = "#e5d4f5";
export const periwinkle = "#c9d8f0";
export const cream = "#fbf3dd";

/** Letterspaced uppercase eyebrow label on the light canvas. */
export const eyebrow = "text-[12px] font-medium uppercase tracking-[0.22em] text-[#0d0c0e]/50";

/** White card treatment used across the page (tiles, FAQ, feature cards). */
export const card =
  "rounded-3xl border border-[#0d0c0e]/[0.06] bg-white shadow-[0_16px_40px_rgba(38,54,115,0.10)]";
