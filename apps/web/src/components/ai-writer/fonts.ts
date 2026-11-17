import { Bodoni_Moda } from "next/font/google";
import localFont from "next/font/local";

/**
 * Display faces for the AI Writer pages only (the sky hero and its echoes).
 * League Spartan: a heavy geometric sans for the giant yellow words, solid
 * and outlined. Bodoni Moda italic: a high-contrast serif for the accent line
 * and the oval ring. Loaded here, not in the root layout, so no other page
 * pays for them.
 */
// Self-hosted (OFL): League Spartan is a variable font, so Google serves one
// file for both weights, and next/font/google intermittently failed the
// build on that duplicate ("queries have exactly one entry"). This is the
// same latin file, read from the repo: no network at build time.
export const spartan = localFont({
  src: [{ path: "./fonts/league-spartan-latin.woff2", weight: "700 800", style: "normal" }],
  display: "swap",
  variable: "--font-spartan",
});

export const bodoni = Bodoni_Moda({
  subsets: ["latin"],
  style: ["italic", "normal"],
  weight: ["400", "500"],
  display: "swap",
  // The serif lines are small and secondary: let the giant Spartan words
  // (the LCP element) take the early bandwidth instead.
  preload: false,
  variable: "--font-bodoni",
});

export const fontGiant = "[font-family:var(--font-spartan),ui-sans-serif,system-ui,sans-serif]";
export const fontSerif = "[font-family:var(--font-bodoni),ui-serif,Georgia,serif]";
