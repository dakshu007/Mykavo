/**
 * Landing-page design system (stamped.io-inspired editorial style).
 *
 * The landing page deliberately runs on a FIXED dark palette — identical in
 * light and dark app themes — so it never routes through the `--fx-*` theme
 * tokens the dashboard uses. Every color lives here as a constant so the page
 * stays consistent; nothing else in the app should import this file.
 *
 * Fonts: Poppins (display headings, next/font) + "Google Sans" body. Google
 * Sans is Google's proprietary font and can't be bundled — the body stack
 * prefers a locally installed "Google Sans" and otherwise renders DM Sans,
 * the site-wide fallback loaded in app/layout.tsx (--font-app-sans).
 */

import { Poppins } from "next/font/google";

export const poppins = Poppins({
  variable: "--font-landing-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

/** className for the landing root: registers the display font variable. */
export const landingFontVars = poppins.variable;

/** Body font utility ("Google Sans" → DM Sans fallback). Apply on the landing root. */
export const fontSans =
  "[font-family:'Google_Sans',var(--font-app-sans),ui-sans-serif,system-ui,sans-serif]";

/** Display utility (Poppins) for the big editorial headlines. */
export const fontDisplay =
  "[font-family:var(--font-landing-display),ui-sans-serif,system-ui,sans-serif] font-semibold";

/** Fixed landing palette (never theme-dependent). */
export const ink = "#0d0c0e"; // near-black canvas + ink on light panels
export const primary = "#3556f4"; // dashboard royal blue — surfaces w/ WHITE text
export const primarySoft = "#8fa2ff"; // lighter tint for small glyphs on the dark canvas
export const lavender = "#e5d4f5";
export const periwinkle = "#c9d8f0";
export const cream = "#fbf3dd";

/** Letterspaced uppercase eyebrow label on dark sections. */
export const eyebrow = "text-[12px] font-medium uppercase tracking-[0.22em] text-white/50";

/** Dark card treatment used across the page (tiles, FAQ, integrations). */
export const darkCard = "rounded-3xl border border-white/10 bg-white/[0.04]";
