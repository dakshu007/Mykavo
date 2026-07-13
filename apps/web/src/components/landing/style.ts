/**
 * Landing-page design system (stamped.io-inspired editorial style).
 *
 * The landing page deliberately runs on a FIXED dark palette — identical in
 * light and dark app themes — so it never routes through the `--fx-*` theme
 * tokens the dashboard uses. Every color lives here as a constant so the page
 * stays consistent; nothing else in the app should import this file.
 *
 * Fonts: Sora (body, next/font) + PP Fragment (display serif). PP Fragment is
 * a commercial Pangram Pangram font — the licensed .woff2 files must be
 * dropped into apps/web/public/fonts/ (see the @font-face block in
 * app/page.tsx). Until they exist, Instrument Serif (free, next/font) renders
 * as the stand-in via the font stack's fallback.
 */

import { Instrument_Serif, Sora } from "next/font/google";

export const sora = Sora({
  variable: "--font-landing-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const instrumentSerif = Instrument_Serif({
  variable: "--font-landing-serif",
  subsets: ["latin"],
  weight: "400",
});

/** className for the landing root: registers both font variables. */
export const landingFontVars = `${sora.variable} ${instrumentSerif.variable}`;

/** Body font utility (Sora). Apply on the landing root. */
export const fontSans = "[font-family:var(--font-landing-sans),ui-sans-serif,system-ui,sans-serif]";

/**
 * Display serif utility for the big editorial headlines: PP Fragment first
 * (loads via the @font-face in app/page.tsx when the licensed files exist),
 * Instrument Serif as the always-available fallback.
 */
export const fontSerif =
  "[font-family:'PP_Fragment',var(--font-landing-serif),Georgia,serif] font-normal";

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
