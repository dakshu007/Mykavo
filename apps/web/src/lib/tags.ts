/**
 * Website tags — agency organization labels ("acme-corp", "retainer",
 * "team-alpha") attached to websites and used to filter the websites list.
 *
 * Canonical form: lowercase [a-z0-9-], 1–20 chars, max 5 per website.
 * Stored as a JSON array on Website.tags; everything reading that column
 * goes through parseTags so malformed values degrade to [] instead of
 * crashing a page.
 */

export const MAX_TAGS_PER_WEBSITE = 5;
export const MAX_TAG_LENGTH = 20;

/**
 * Normalizes raw user input into a canonical tag: trims, strips diacritics,
 * lowercases, collapses inner whitespace to "-", drops everything outside
 * [a-z0-9-], collapses hyphen runs, and caps at MAX_TAG_LENGTH without
 * leaving a trailing hyphen. Returns "" when nothing usable remains.
 */
export function normalizeTag(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip combining diacritics
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, MAX_TAG_LENGTH)
    .replace(/-+$/, "");
}

/**
 * Defensive Json? → string[] for the Website.tags column: keeps only string
 * entries that still normalize to a non-empty tag, dedupes, and caps at
 * MAX_TAGS_PER_WEBSITE. Non-array values yield [].
 */
export function parseTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const tags: string[] = [];
  for (const entry of value) {
    if (typeof entry !== "string") continue;
    const tag = normalizeTag(entry);
    if (tag && !tags.includes(tag)) tags.push(tag);
    if (tags.length === MAX_TAGS_PER_WEBSITE) break;
  }
  return tags;
}

/**
 * Validates adding `input` to `existing` tags. Returns the normalized tag on
 * success, or a friendly error message. Shared by the client editor and kept
 * in sync with the server-side sanitization in the website PATCH route.
 */
export function validateNewTag(
  input: string,
  existing: string[],
): { tag: string; error?: never } | { error: string; tag?: never } {
  const tag = normalizeTag(input);
  if (!tag) {
    return { error: "Tags need at least one letter or number." };
  }
  if (existing.includes(tag)) {
    return { error: `"${tag}" is already added.` };
  }
  if (existing.length >= MAX_TAGS_PER_WEBSITE) {
    return { error: `Up to ${MAX_TAGS_PER_WEBSITE} tags per website.` };
  }
  return { tag };
}

/**
 * Parses the websites-list `?tag=` searchParam. Accepts a comma list
 * ("?tag=acme,retainer") or repeated params; normalizes, dedupes, and caps
 * at MAX_TAGS_PER_WEBSITE so a hand-edited URL can't blow up the filter bar.
 */
export function parseTagFilterParam(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const parts = (Array.isArray(value) ? value : [value]).flatMap((v) =>
    v.split(","),
  );
  return parseTags(parts);
}

/**
 * Whether a website's tags satisfy the active filter. Multi-select narrows:
 * the site must carry every active tag. An empty filter matches everything.
 */
export function matchesTagFilter(siteTags: string[], activeTags: string[]): boolean {
  return activeTags.every((tag) => siteTags.includes(tag));
}
