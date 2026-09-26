/**
 * Small display rules for the public post page, kept pure so they are tested.
 */

/**
 * Tags readers see. Tags are meant to be topics ("WordPress", "SEO"); long
 * search phrases ("best free database 2026") belong in the keyword fields,
 * and shown as chips they read as keyword stuffing. Anything longer than a
 * short topic is left out of the visible list - it still reaches search
 * engines through the post's keywords - and at most four are shown.
 */
export function displayTags(tags: readonly string[]): string[] {
  return tags
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && t.length <= 24 && t.split(/\s+/).length <= 3)
    .slice(0, 4);
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether to show "Updated <date>": only when the post changed at least a
 * day after it was published. A typo fixed ten minutes after publishing is
 * not an update worth announcing.
 */
export function showUpdated(publishedAt: Date | null, updatedAt: Date): boolean {
  if (!publishedAt) return false;
  return updatedAt.getTime() - publishedAt.getTime() >= DAY_MS;
}
