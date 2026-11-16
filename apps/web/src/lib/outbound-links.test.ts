import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { BlogMarkdown } from "@/components/blog/markdown";
import { defaultNofollow, followMarker, followTitleFor, isExternalHref, isNofollowLink } from "./outbound-links";

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

describe("link nofollow choice", () => {
  it("nofollows external links and follows internal ones by default", () => {
    expect(defaultNofollow("https://example.com/page")).toBe(true);
    expect(defaultNofollow("/pricing")).toBe(false);
    expect(defaultNofollow("https://mykavo.app/pricing")).toBe(false);
    expect(defaultNofollow("mailto:hi@example.com")).toBe(false);
  });

  it("reads the follow marker from the link title", () => {
    expect(followMarker("nofollow")).toBe("nofollow");
    expect(followMarker(" DoFollow ")).toBe("dofollow");
    expect(followMarker("A real tooltip")).toBeNull();
    expect(followMarker(undefined)).toBeNull();
  });

  it("lets the marker override the default", () => {
    expect(isNofollowLink("https://example.com", "dofollow")).toBe(false);
    expect(isNofollowLink("/pricing", "nofollow")).toBe(true);
    expect(isNofollowLink("https://example.com", "Some title")).toBe(true);
    expect(isNofollowLink("/pricing", null)).toBe(false);
  });

  it("stores a marker only when the choice differs from the default", () => {
    expect(followTitleFor("https://example.com", true)).toBeNull();
    expect(followTitleFor("https://example.com", false)).toBe("dofollow");
    expect(followTitleFor("/pricing", false)).toBeNull();
    expect(followTitleFor("/pricing", true)).toBe("nofollow");
  });
});

describe("per-link nofollow in post bodies", () => {
  it("follows an external link marked dofollow, without the marker as a tooltip", () => {
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: '[guide](https://example.com/g "dofollow")' }));
    expect(html).toContain('<a href="https://example.com/g" target="_blank" rel="noopener noreferrer">guide</a>');
  });

  it("nofollows an internal link marked nofollow", () => {
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: '[pricing](/pricing "nofollow")' }));
    expect(html).toContain('<a href="/pricing" rel="nofollow">pricing</a>');
  });

  it("keeps a real title as a tooltip", () => {
    const html = renderToStaticMarkup(createElement(BlogMarkdown, { content: '[guide](https://example.com/g "Read more")' }));
    expect(html).toContain('title="Read more"');
    expect(html).toContain('rel="nofollow noopener noreferrer"');
  });
});
