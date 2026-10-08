import { BRAND_MARKS, type BrandSlug } from "@/components/brand/brand-marks";

/**
 * A third party's real mark in its owner's official colour, from the same
 * vendored set the homepage "works with" strip uses (brand-marks.ts). Shown
 * nominatively - to say what MyKavo works with - and never recoloured, which
 * is why these always sit on a white tile (see integration-icons.tsx).
 */
export function BrandGlyph({ slug, className = "size-5" }: { slug: BrandSlug; className?: string }) {
  const mark = BRAND_MARKS[slug];
  return (
    <svg viewBox="0 0 24 24" className={className} role="img" aria-label={mark.title} focusable="false">
      <path fill={mark.hex} d={mark.path} />
    </svg>
  );
}

/** Platforms that have an official mark. Everything else keeps MyKavo's gold tile. */
export const BRANDED_PLATFORM_MARK = {
  wordpress: "wordpress",
  android: "android",
  shopify: "shopify",
} as const satisfies Record<string, BrandSlug>;

export type BrandedPlatformId = keyof typeof BRANDED_PLATFORM_MARK;

export function isBrandedPlatform(id: string): id is BrandedPlatformId {
  return id in BRANDED_PLATFORM_MARK;
}
