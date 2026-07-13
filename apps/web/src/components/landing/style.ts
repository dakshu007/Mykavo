/**
 * Landing-page design system (stamped.io-inspired editorial style).
 *
 * The landing page deliberately runs on a FIXED dark palette — identical in
 * light and dark app themes — so it never routes through the `--fx-*` theme
 * tokens the dashboard uses. Every color lives here as a constant so the page
 * stays consistent; nothing else in the app should import this file.
 *
 * Fonts: Sora (body) + Instrument Serif (display) via next/font — both free
 * Google fonts, loaded only on routes that render the landing components.
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

/** Display serif utility (Instrument Serif) for the big editorial headlines. */
export const fontSerif = "[font-family:var(--font-landing-serif),Georgia,serif] font-normal";

/** Fixed landing palette (never theme-dependent). */
export const ink = "#0d0c0e"; // near-black canvas + ink on light panels
export const butter = "#faed99"; // butter-yellow panels & accents
export const lavender = "#e5d4f5";
export const periwinkle = "#c9d8f0";
export const cream = "#fbf3dd";

/** Letterspaced uppercase eyebrow label on dark sections. */
export const eyebrow = "text-[12px] font-medium uppercase tracking-[0.22em] text-white/50";

/** Dark card treatment used across the page (tiles, FAQ, integrations). */
export const darkCard = "rounded-3xl border border-white/10 bg-white/[0.04]";
