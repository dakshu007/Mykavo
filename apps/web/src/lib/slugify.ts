const MAX_SLUG_LENGTH = 96;

/**
 * Converts a title into a URL-safe slug: lowercase alphanumerics separated
 * by single hyphens (`^[a-z0-9]+(?:-[a-z0-9]+)*$`), diacritics stripped,
 * capped at a sane length. Returns "" when nothing usable remains.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/, "");
}
