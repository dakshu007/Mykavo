import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogMarkdown } from "@/components/blog/markdown";
import { isExternalHref } from "./outbound-links";

describe("outbound links", () => {
  it("treats other sites as external", () => {
    expect(isExternalHref("https://example.com/post")).toBe(true);
    expect(isExternalHref("http://www.competitor.io")).toBe(true);
  });

  it("keeps our own pages, anchors and mail links internal", () => {
    for (const href of ["/pricing", "#setup", "?topic=seo", "pricing", "https://mykavo.app/blog/x", "https://www.mykavo.app/", "mailto:hi@mykavo.app", undefined]) {
      expect(isExternalHref(href), String(href)).toBe(false);
    }
  });

  it("nofollows external links in post bodies and leaves internal links alone", () => {
    const html = renderToStaticMarkup(
      createElement(BlogMarkdown, { content: "See [a guide](https://example.com/guide) and [pricing](/pricing)." }),
    );
    expect(html).toContain('<a href="https://example.com/guide" target="_blank" rel="nofollow noopener noreferrer">a guide</a>');
    expect(html).toContain('<a href="/pricing">pricing</a>');
  });

  it("still gives headings their anchors when ids are passed", () => {
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: "## Setup\n\n[x](https://example.com)", headingIds: { 1: "setup" } }));
    expect(html).toContain('<h2 id="setup">');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });
});
