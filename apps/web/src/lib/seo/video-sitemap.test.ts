import { describe, expect, it } from "vitest";
import { videoSitemapDescription, xmlEscape } from "./video-sitemap";

describe("video sitemap fields", () => {
  it("escapes XML special characters", () => {
    expect(xmlEscape(`Before & After <b> "q" 'a'`)).toBe("Before &amp; After &lt;b&gt; &quot;q&quot; &apos;a&apos;");
    expect(xmlEscape("https://www.youtube-nocookie.com/embed/x?a=1&b=2")).toContain("a=1&amp;b=2");
  });

  it("falls back to the title and caps the length at 2,048", () => {
    expect(videoSitemapDescription("Title", "  ")).toBe("Title");
    expect(videoSitemapDescription("T", "line one\n\nline two")).toBe("line one line two");
    expect(videoSitemapDescription("T", "x ".repeat(3000)).length).toBeLessThanOrEqual(2048);
  });
});
