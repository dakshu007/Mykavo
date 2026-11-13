/**
 * True when a blog post is about keywords, blogging or writing content: its
 * readers get the AI Keywords & Blog Writer pitch instead of the monitoring
 * one. Matches the slug, title and focus keyword only; tags like "seo" are
 * too broad and would catch monitoring posts.
 */
export function isContentTopic(...texts: Array<string | null | undefined>): boolean {
  return texts.some(
    (t) =>
      typeof t === "string" &&
      /\bkeywords?\b|\bblog(ging|gers?)?\b|blog[- ]posts?|blog[- ]writer|what[- ]to[- ]blog|ai[- ]content|content[- ]writ/i.test(t),
  );
}
