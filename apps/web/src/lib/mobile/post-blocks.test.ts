import { describe, expect, it } from "vitest";
import { decodeEntities, htmlToBlocks, wordCount } from "./post-blocks";

describe("htmlToBlocks", () => {
  it("keeps headings, paragraphs and list items in order as plain text", () => {
    const html =
      "<h2>Why it matters</h2><p>Coffee <strong>beans</strong> &amp; <a href='/x'>roasts</a>.</p><ul><li><p>One</p></li><li>Two</li></ul><h3>Next</h3><blockquote>Quote</blockquote>";
    expect(htmlToBlocks(html)).toEqual([
      { type: "h2", text: "Why it matters" },
      { type: "p", text: "Coffee beans & roasts." },
      { type: "li", text: "One" },
      { type: "li", text: "Two" },
      { type: "h3", text: "Next" },
      { type: "quote", text: "Quote" },
    ]);
  });

  it("drops empty blocks and never returns markup", () => {
    const blocks = htmlToBlocks("<p> </p><p><script>alert(1)</script>Safe<br/>text</p>");
    expect(blocks).toEqual([{ type: "p", text: "alert(1)Safe text" }]);
    expect(blocks.every((b) => !b.text.includes("<"))).toBe(true);
  });

  it("caps the number of blocks", () => {
    expect(htmlToBlocks("<p>a</p>".repeat(10), 3)).toHaveLength(3);
  });

  it("counts words", () => {
    expect(wordCount(htmlToBlocks("<h2>Two words</h2><p>and three more</p>"))).toBe(5);
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities and leaves unknown ones", () => {
    expect(decodeEntities("&#39;a&#x27; &rsquo; &bogus;")).toBe("'a' ’ &bogus;");
  });
});
