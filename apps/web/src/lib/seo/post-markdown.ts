/**
 * A blog post as clean Markdown, served at /blog/<slug>.md.
 *
 * AI assistants and agents read plain text far more reliably than a rendered
 * page full of navigation, players and call-to-action boxes. This gives them
 * the article itself, led by what it is, who wrote it, when, and a summary,
 * and with MyKavo's shortcode blocks turned into plain Markdown (the FAQ as
 * questions and answers; CTA and table-of-contents blocks dropped).
 */

import { parsePost } from "@/components/blog/blocks";

export interface PostForMarkdown {
  slug: string;
  title: string;
  excerpt: string | null;
  keyTakeaways: string[];
  content: string;
  authorName: string;
  publishedAt: Date | null;
  updatedAt: Date;
}

function day(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function postToMarkdown(post: PostForMarkdown, siteUrl: string): string {
  const url = `${siteUrl}/blog/${post.slug}`;
  const lines: string[] = [`# ${post.title}`, ""];
  const meta = [
    `Source: ${url}`,
    `Author: ${post.authorName}`,
    ...(post.publishedAt ? [`Published: ${day(post.publishedAt)}`] : []),
    `Updated: ${day(post.updatedAt)}`,
    "Publisher: MyKavo (https://mykavo.app)",
  ];
  lines.push(...meta.map((m) => `> ${m}  `), "");

  if (post.excerpt) lines.push("## Summary", "", post.excerpt.trim(), "");
  const takeaways = post.keyTakeaways.map((t) => t.trim()).filter(Boolean);
  if (takeaways.length > 0) {
    lines.push("## Key takeaways", "", ...takeaways.map((t) => `- ${t}`), "");
  }

  for (const segment of parsePost(post.content).segments) {
    if (segment.type === "markdown") {
      lines.push(segment.content.trim(), "");
    } else if (segment.type === "faq" && segment.items.length > 0) {
      // Posts usually put their own "## Frequently asked questions" heading
      // just above the FAQ block; only add one when the post didn't.
      const lastLine = [...lines].reverse().find((l) => l.trim() !== "") ?? "";
      if (!/^#{1,6}\s/.test(lastLine.trim().split("\n").pop() ?? "")) lines.push("## Frequently asked questions", "");
      for (const item of segment.items) lines.push(`### ${item.question}`, "", item.answer, "");
    }
    // cta, cta-wordpress and toc blocks are page furniture, not content.
  }

  return `${lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()}\n`;
}
