/**
 * Blog scheduling without a schedule job.
 *
 * A scheduled post is simply a PUBLISHED post whose publishedAt is in the
 * future. Every public surface (the post page, the index, the RSS feed, the
 * sitemap, llms.txt, related posts) only shows posts whose publishedAt has
 * passed, and all of them render on request - so a scheduled post goes live
 * at its time on its own, with no cron, no worker and no database change.
 *
 * Use `livePostWhere()` for every public query. A bare `status: "PUBLISHED"`
 * would leak a scheduled post before its time.
 */

export function livePostWhere(now: Date = new Date()) {
  return { status: "PUBLISHED" as const, publishedAt: { lte: now } };
}

export type PostDisplayStatus = "DRAFT" | "SCHEDULED" | "PUBLISHED";

/** What the dashboard should call a post: a future publish date means scheduled. */
export function postDisplayStatus(
  status: "DRAFT" | "PUBLISHED",
  publishedAt: Date | string | null | undefined,
  now: number = Date.now(),
): PostDisplayStatus {
  if (status !== "PUBLISHED") return "DRAFT";
  if (publishedAt && new Date(publishedAt).getTime() > now) return "SCHEDULED";
  return "PUBLISHED";
}
