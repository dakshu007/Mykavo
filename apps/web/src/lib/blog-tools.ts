/**
 * Which free tool to put inside a post, so a reader can try the thing the
 * post is about on their own site without leaving it.
 *
 * Deterministic keyword rules over the post's title, keywords and tags -
 * first match wins, most specific first. No match, no tool: a tool that has
 * nothing to do with the post is an ad, not help.
 */
export type BlogToolId = "meta-tags" | "redirects" | "scripts" | "status" | "broken-links" | "eeat";

const RULES: { tool: BlogToolId; pattern: RegExp }[] = [
  { tool: "redirects", pattern: /\bredirect/i },
  { tool: "eeat", pattern: /\be-?e-?a-?t\b/i },
  {
    tool: "scripts",
    pattern: /\b(script|analytics|tag manager|gtm|pixel|tracking code|third[- ]party)\b/i,
  },
  {
    tool: "meta-tags",
    pattern: /\b(noindex|meta (tag|description)|title tag|canonical|robots meta|open graph|indexing|seo)\b/i,
  },
  { tool: "broken-links", pattern: /\b(broken links?|dead links?|link rot|link checker)\b/i },
  { tool: "status", pattern: /\b(404|status code|http status)\b/i },
  // General monitoring posts: a page's SEO tags are the quickest real check
  // of "is anything wrong on my page right now?".
  {
    tool: "meta-tags",
    pattern: /\b(monitor\w*|change detection|detect(ing)? changes?|uptime|regression|website changes?|site audit)\b/i,
  },
];

export function toolForPost(post: {
  title: string;
  tags: readonly string[];
  primaryKeyword: string | null;
  secondaryKeyword: string | null;
}): BlogToolId | null {
  const haystack = [post.title, post.primaryKeyword ?? "", post.secondaryKeyword ?? "", ...post.tags].join(" · ");
  return RULES.find((r) => r.pattern.test(haystack))?.tool ?? null;
}
