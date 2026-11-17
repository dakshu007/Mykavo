/**
 * Small, dependency-free color helpers. Every color that reaches a video is a
 * validated #rrggbb string, so the composer never writes user or page text
 * into CSS.
 */

export const HEX_COLOR = /^#[0-9a-f]{6}$/;

export function isHex(value: unknown): value is string {
  return typeof value === "string" && HEX_COLOR.test(value);
}

/** "rgb(12, 34, 56)", "rgba(..)", "#abc", "#aabbcc" -> "#aabbcc"; null when transparent or unreadable. */
export function toHex(input: string | null | undefined): string | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (HEX_COLOR.test(s)) return s;
  const short = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/.exec(s);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`;
  const m = /^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(s);
  if (!m) return null;
  if (m[4] !== undefined) {
    const alpha = m[4].endsWith("%") ? Number(m[4].slice(0, -1)) / 100 : Number(m[4]);
    if (!(alpha >= 0.5)) return null;
  }
  const part = (v: string) => Math.max(0, Math.min(255, Math.round(Number(v)))).toString(16).padStart(2, "0");
  return `#${part(m[1]!)}${part(m[2]!)}${part(m[3]!)}`;
}

export function rgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function channel(v: number): number {
  const c = v / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function isDark(hex: string): boolean {
  return luminance(hex) < 0.22;
}

/** 0 (grey) to 1 (fully saturated), HSL-style. */
export function saturation(hex: string): number {
  const [r, g, b] = rgb(hex).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === min) return 0;
  const l = (max + min) / 2;
  const d = max - min;
  return l > 0.5 ? d / (2 - max - min) : d / (max + min);
}

/** Linear mix: t=0 gives a, t=1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const ca = rgb(a);
  const cb = rgb(b);
  const out = ca.map((v, i) => Math.round(v + (cb[i]! - v) * t));
  return `#${out.map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Rough perceptual distance (redmean), 0 to ~765. */
export function distance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  const rm = (r1 + r2) / 2;
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  return Math.sqrt((2 + rm / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rm) / 256) * db * db);
}

/**
 * The text color for a background: the brand's own text color when it reads
 * well (4.5:1), else near-white or near-black, whichever reads better.
 */
export function readableOn(background: string, preferred?: string | null): string {
  if (preferred && isHex(preferred) && contrast(preferred, background) >= 4.5) return preferred;
  return contrast("#ffffff", background) >= contrast("#111111", background) ? "#ffffff" : "#111111";
}
