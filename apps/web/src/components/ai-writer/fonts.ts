import { Bodoni_Moda, League_Spartan } from "next/font/google";

/**
 * Display faces for the AI Writer pages only (the sky hero and its echoes).
 * League Spartan: a heavy geometric sans for the giant yellow words, solid
 * and outlined. Bodoni Moda italic: a high-contrast serif for the accent line
 * and the oval ring. Loaded here, not in the root layout, so no other page
 * pays for them.
 */
export const spartan = League_Spartan({
  subsets: ["latin"],
  weight: ["700", "800"],
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
