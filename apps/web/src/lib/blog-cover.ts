/**
 * The palette a post's cover uses, picked from its slug so a page of covers
 * varies. Shared by the cover route (which draws it) and the blog index
 * (which fills the space around a letterboxed cover with the same colour).
 */
export const COVER_PALETTES = [
  { bg: "#151515", fg: "#FFD400", sub: "#9C9E93", card: "#232323", line: "#3A3A38", edge: "#3A3A38" },
  { bg: "#FFD400", fg: "#151515", sub: "#5C5000", card: "#FFE680", line: "#E0BA00", edge: "#151515" },
  { bg: "#FBFAF3", fg: "#151515", sub: "#6B6B60", card: "#FFFFFF", line: "#E6E3D6", edge: "#151515" },
] as const;

export function coverPalette(slug: string) {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return COVER_PALETTES[h % COVER_PALETTES.length];
}

/** Topic font size that fits beside the motif at 1200px wide. */
export function coverTopicSize(topic: string): number {
  if (topic.length <= 5) return 140;
  if (topic.length <= 8) return 110;
  if (topic.length <= 11) return 88;
  return 70;
}
