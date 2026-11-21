import { describe, expect, it } from "vitest";
import { postToMarkdown } from "./post-markdown";

const post = {
  slug: "how-to-monitor",
  title: "How to Monitor a Website",
  excerpt: "Pick the pages that matter and compare them against a baseline.",
  keyTakeaways: ["Baselines first", " ", "Alerts by severity"],
  content: [
    "Intro paragraph.",
    "",
    "{{toc}}",
    "",
    "## Step one",
    "",
    "Do the thing.",
    "",
    "{{cta}}",
    "",
    "## Frequently asked questions",
    "",
    "{{faq}}",
    "Q: Is it free?",
    "A: There is a free plan.",
    "{{/faq}}",
  ].join("\n"),
  authorName: "Dakshesh",
  publishedAt: new Date("2026-11-01T00:00:00Z"),
  updatedAt: new Date("2026-11-20T10:00:00Z"),
};

describe("postToMarkdown", () => {
  const md = postToMarkdown(post, "https://mykavo.app");

  it("leads with the title, source, author and dates", () => {
    expect(md.startsWith("# How to Monitor a Website\n")).toBe(true);
    expect(md).toContain("> Source: https://mykavo.app/blog/how-to-monitor");
    expect(md).toContain("> Author: Dakshesh");
    expect(md).toContain("> Published: 2026-11-01");
    expect(md).toContain("> Updated: 2026-11-20");
  });

  it("includes the summary and non-empty takeaways", () => {
    expect(md).toContain("## Summary\n\nPick the pages");
    expect(md).toContain("- Baselines first\n- Alerts by severity");
  });

  it("keeps the article and turns the FAQ into questions and answers", () => {
    expect(md).toContain("## Step one\n\nDo the thing.");
    expect(md).toContain("### Is it free?\n\nThere is a free plan.");
  });

  it("doesn't repeat the FAQ heading the post already has", () => {
    expect(md.match(/## Frequently asked questions/g)).toHaveLength(1);
  });

  it("adds a FAQ heading when the post has none", () => {
    const bare = postToMarkdown({ ...post, content: "Intro.\n\n{{faq}}\nQ: One?\nA: Yes.\n{{/faq}}" }, "https://mykavo.app");
    expect(bare).toContain("## Frequently asked questions\n\n### One?");
  });

  it("drops shortcode furniture", () => {
    expect(md).not.toMatch(/\{\{/);
  });
});
