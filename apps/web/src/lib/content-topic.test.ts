import { describe, expect, it } from "vitest";
import { isContentTopic } from "@/lib/content-topic";

describe("isContentTopic", () => {
  it("catches keyword, blogging and AI content posts", () => {
    expect(isContentTopic("striking-distance-keywords")).toBe(true);
    expect(isContentTopic("what-to-blog-about")).toBe(true);
    expect(isContentTopic(null, "SEO Blog Post Checklist: 16 Checks")).toBe(true);
    expect(isContentTopic("does-ai-content-rank-on-google")).toBe(true);
    expect(isContentTopic("best-ai-blog-writers")).toBe(true);
  });

  it("leaves monitoring and WordPress posts alone", () => {
    expect(isContentTopic("how-to-monitor-website-changes", "How to Monitor Website Changes", "monitor website changes")).toBe(false);
    expect(isContentTopic("wordpress-php-version", "WordPress PHP Version", "wordpress php version")).toBe(false);
    expect(isContentTopic("seo-monitor-alternatives")).toBe(false);
  });
});
