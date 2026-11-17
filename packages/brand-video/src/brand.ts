import { z } from "zod";
import { distance, isDark, isHex, mix, readableOn, saturation, toHex } from "./color";

/**
 * The brand kit: what a website looks and sounds like, read off its homepage
 * by the scanner (packages/scanner/src/brand.ts) with no AI, then editable by
 * the owner. Everything here is plain data; images are storage keys.
 */

export const hexColor = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^#[0-9a-f]{6}$/, "Use a color like #1a73e8.");

export const brandColors = z.object({
  primary: hexColor,
  accent: hexColor,
  background: hexColor,
  surface: hexColor,
  text: hexColor,
});
export type BrandColors = z.infer<typeof brandColors>;

export const valuePoint = z.object({
  title: z.string().trim().min(1).max(80),
  text: z.string().trim().max(160).default(""),
});
export type ValuePoint = z.infer<typeof valuePoint>;

export const statItem = z.object({
  value: z.string().trim().min(1).max(16),
  label: z.string().trim().max(60).default(""),
});
export type StatItem = z.infer<typeof statItem>;

/**
 * Font family names go into CSS and a Google Fonts URL, so only letters,
 * digits, spaces and hyphens are allowed - never quotes, semicolons or
 * anything that could close a CSS string.
 */
export const fontName = z
  .string()
  .trim()
  .max(60)
  .regex(/^[A-Za-z0-9][A-Za-z0-9 -]*$/, "Use a font name like Inter or Playfair Display.");

const httpUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => {
    try {
      const u = new URL(v);
      return u.protocol === "https:" || u.protocol === "http:";
    } catch {
      return false;
    }
  }, "Use a full web address starting with https://");

/** What the owner can change in the brand kit editor. */
export const brandKitEdit = z.object({
  name: z.string().trim().min(1).max(60),
  headline: z.string().trim().max(160).nullable(),
  description: z.string().trim().max(300).nullable(),
  ctaText: z.string().trim().max(40).nullable(),
  ctaUrl: httpUrl.nullable(),
  valuePoints: z.array(valuePoint).max(8),
  stats: z.array(statItem).max(4),
  services: z.array(z.string().trim().min(1).max(40)).max(12),
  colors: brandColors,
  headingFont: fontName.nullable(),
  bodyFont: fontName.nullable(),
});
export type BrandKitEdit = z.infer<typeof brandKitEdit>;

/**
 * Exactly what the scanner hands over. Mirrors packages/scanner's
 * RawBrandCapture structurally so this package needs no scanner dependency.
 */
export interface RawBrandCapture {
  url: string;
  siteName: string | null;
  title: string | null;
  headline: string | null;
  description: string | null;
  ctas: Array<{ text: string; href: string | null; background: string | null; color: string | null; area: number }>;
  navItems: string[];
  valuePoints: Array<{ title: string; text: string }>;
  stats: Array<{ value: string; label: string }>;
  /** Background colors weighted by visible area, biggest first. */
  backgrounds: Array<{ color: string; weight: number }>;
  /** Colors of headings, links and icons, weighted. */
  foregrounds: Array<{ color: string; weight: number }>;
  bodyBackground: string | null;
  textColor: string | null;
  headingFont: string | null;
  bodyFont: string | null;
  logoBackground: string | null;
}

/** What gets saved to brand_kit from a capture (images are added by the caller). */
export interface NormalizedBrand {
  name: string;
  headline: string | null;
  description: string | null;
  ctaText: string | null;
  ctaUrl: string | null;
  valuePoints: ValuePoint[];
  stats: StatItem[];
  services: string[];
  colors: BrandColors;
  palette: string[];
  headingFont: string | null;
  bodyFont: string | null;
  logoBackground: string | null;
}

const GENERIC_FONTS = new Set([
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "helvetica neue",
  "helvetica",
  "arial",
  "roboto fallback",
  "inherit",
  "initial",
]);

/** The first real family in a CSS font-family list, or null. */
export function firstFontFamily(stack: string | null | undefined): string | null {
  if (!stack) return null;
  for (const raw of stack.split(",")) {
    const name = raw.trim().replace(/^["']|["']$/g, "").trim();
    if (!name || GENERIC_FONTS.has(name.toLowerCase())) continue;
    // next/font and similar build tools emit "__Inter_abc123" or "Inter Fallback".
    const cleaned = name
      .replace(/^__/, "")
      .replace(/_[0-9a-f]{4,}$/i, "")
      .replace(/_/g, " ")
      .replace(/\s+fallback$/i, "")
      .trim();
    if (!cleaned || GENERIC_FONTS.has(cleaned.toLowerCase())) continue;
    const parsed = fontName.safeParse(cleaned);
    if (parsed.success) return parsed.data;
  }
  return null;
}

function clean(text: string | null | undefined, max: number): string | null {
  if (!text) return null;
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return null;
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space > max * 0.6 ? cut.slice(0, space) : cut).replace(/[,;:.\-\s]+$/, "");
}

/** "Acme | Fast invoicing" -> "Acme"; prefers og:site_name. */
export function brandNameFrom(raw: Pick<RawBrandCapture, "siteName" | "title" | "url">): string {
  const site = clean(raw.siteName, 60);
  if (site) return site;
  const title = clean(raw.title, 200);
  if (title) {
    const parts = title.split(/\s+[|\-–—·:]\s+/).map((p) => p.trim()).filter(Boolean);
    // The brand is usually the shortest part, and usually first or last.
    const candidates = [parts[0], parts[parts.length - 1]].filter((p): p is string => Boolean(p));
    const best = candidates.sort((a, b) => a.length - b.length)[0];
    if (best && best.length <= 40) return best;
  }
  try {
    const host = new URL(raw.url).hostname.replace(/^www\./, "");
    const label = host.split(".")[0] ?? host;
    return label.charAt(0).toUpperCase() + label.slice(1);
  } catch {
    return "Your brand";
  }
}

/** Collapse a weighted color list: merge near-duplicates, drop transparent. */
function weighted(list: Array<{ color: string; weight: number }>): Array<{ color: string; weight: number }> {
  const out: Array<{ color: string; weight: number }> = [];
  for (const item of list) {
    const hex = toHex(item.color);
    if (!hex || !(item.weight > 0)) continue;
    const near = out.find((o) => distance(o.color, hex) < 28);
    if (near) near.weight += item.weight;
    else out.push({ color: hex, weight: item.weight });
  }
  return out.sort((a, b) => b.weight - a.weight);
}

function isBrandy(hex: string, background: string): boolean {
  return saturation(hex) >= 0.28 && distance(hex, background) > 90 && !(isDark(hex) && saturation(hex) < 0.4);
}

/**
 * Turn a raw capture into a brand kit. Deterministic: the same page gives the
 * same kit. Colors: the background is what covers the most area; the primary
 * is the main button's color when it is a real color, else the most used
 * saturated color; the accent is the next clearly different one.
 */
export function normalizeCapture(raw: RawBrandCapture): NormalizedBrand {
  const backgrounds = weighted(raw.backgrounds);
  const foregrounds = weighted(raw.foregrounds);
  const background = toHex(raw.bodyBackground) ?? backgrounds[0]?.color ?? "#ffffff";
  const text = readableOn(background, toHex(raw.textColor));

  const ctas = [...raw.ctas].sort((a, b) => b.area - a.area);
  const ctaColors = ctas
    .map((c) => toHex(c.background))
    .filter((c): c is string => c !== null && isBrandy(c, background));

  const pool = weighted([
    ...ctaColors.map((color, i) => ({ color, weight: 1e7 / (i + 1) })),
    ...foregrounds.map((f) => ({ color: f.color, weight: f.weight * 2 })),
    ...backgrounds.slice(1).map((b) => ({ color: b.color, weight: b.weight })),
  ]).filter((c) => isBrandy(c.color, background));

  const primary = pool[0]?.color ?? (isDark(background) ? "#f5f5f5" : "#111827");
  const accent =
    pool.find((c) => distance(c.color, primary) > 120)?.color ??
    mix(primary, isDark(primary) ? "#ffffff" : "#000000", 0.35);
  const surface = mix(background, text, isDark(background) ? 0.08 : 0.04);

  const palette = [
    ...new Set([...pool.map((p) => p.color), ...backgrounds.map((b) => b.color), ...foregrounds.map((f) => f.color)]),
  ].slice(0, 10);

  const mainCta = ctas.find((c) => clean(c.text, 40));
  const ctaUrl = (() => {
    if (!mainCta?.href) return null;
    try {
      const u = new URL(mainCta.href, raw.url);
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString().slice(0, 500) : null;
    } catch {
      return null;
    }
  })();

  const seenPoints = new Set<string>();
  const valuePoints: ValuePoint[] = [];
  for (const p of raw.valuePoints) {
    const title = clean(p.title, 80);
    if (!title || seenPoints.has(title.toLowerCase())) continue;
    seenPoints.add(title.toLowerCase());
    valuePoints.push({ title, text: clean(p.text, 160) ?? "" });
    if (valuePoints.length >= 8) break;
  }

  const stats: StatItem[] = [];
  for (const s of raw.stats) {
    const value = clean(s.value, 16);
    if (!value || stats.some((x) => x.value === value)) continue;
    stats.push({ value, label: clean(s.label, 60) ?? "" });
    if (stats.length >= 4) break;
  }

  const name = brandNameFrom(raw);
  const services = [
    ...new Set(
      raw.navItems
        .map((n) => clean(n, 40))
        // The logo link's own text is the brand name, not a service.
        .filter((n): n is string => n !== null && n.length >= 2 && n.toLowerCase() !== name.toLowerCase()),
    ),
  ].slice(0, 12);

  const logoBackground = toHex(raw.logoBackground);

  return {
    name,
    headline: clean(raw.headline, 160),
    description: clean(raw.description, 300),
    ctaText: clean(mainCta?.text, 40),
    ctaUrl,
    valuePoints,
    stats,
    services,
    colors: { primary, accent, background, surface, text },
    palette,
    headingFont: firstFontFamily(raw.headingFont),
    bodyFont: firstFontFamily(raw.bodyFont),
    logoBackground: logoBackground && isHex(logoBackground) ? logoBackground : null,
  };
}

/** A curated list of Google Fonts offered in the editor (any other name still works). */
export const SUGGESTED_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Lato",
  "Montserrat",
  "Poppins",
  "Raleway",
  "Nunito",
  "Work Sans",
  "DM Sans",
  "Manrope",
  "Plus Jakarta Sans",
  "Outfit",
  "Space Grotesk",
  "Sora",
  "Rubik",
  "Karla",
  "Figtree",
  "Lexend",
  "Archivo",
  "Barlow",
  "Oswald",
  "Bebas Neue",
  "Playfair Display",
  "Merriweather",
  "Lora",
  "DM Serif Display",
  "Fraunces",
  "Libre Baskerville",
  "Source Serif 4",
] as const;
