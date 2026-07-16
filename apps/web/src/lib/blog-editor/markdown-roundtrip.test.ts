// @vitest-environment jsdom
import { Editor } from "@tiptap/core";
import { describe, expect, it } from "vitest";
import { buildEditorExtensions, getEditorMarkdown, roundTripMarkdown } from "./extensions";
import {
  countWords,
  isAllowedLinkHref,
  joinFaqRaw,
  splitFaqRaw,
  splitShortcodeSegments,
  toEditorMarkdown,
} from "./markdown-roundtrip";

/**
 * Round-trip tests for the visual editor: stored markdown → Tiptap doc →
 * markdown. Shortcode regions must survive byte-identically; plain markdown
 * may only be normalized in benign, documented ways (see the golden test).
 */

const FAQ_RAW =
  "{{faq}}\nQ: What is a baseline?\nA: The approved reference state.\n\nQ: How often do scans run?\nA: Daily on paid plans,\nweekly on the free plan.\n{{/faq}}";

describe("splitShortcodeSegments", () => {
  it("extracts cta/toc lines and faq regions with exact raw text", () => {
    const md = `intro\n\n{{cta}}\n\nmiddle\n\n${FAQ_RAW}\n\n{{toc}}\n\noutro`;
    const segments = splitShortcodeSegments(md);
    expect(segments.map((s) => s.type)).toEqual([
      "markdown",
      "cta",
      "markdown",
      "faq",
      "toc",
      "markdown",
    ]);
    const faq = segments[3];
    expect(faq.type === "faq" && faq.raw).toBe(FAQ_RAW);
  });

  it("preserves whitespace variants of token lines byte-for-byte", () => {
    const segments = splitShortcodeSegments("  {{ cta }}  ");
    expect(segments).toEqual([{ type: "cta", raw: "  {{ cta }}  " }]);
  });

  it("ignores shortcodes inside fenced code blocks", () => {
    const md = "```\n{{cta}}\n```";
    expect(splitShortcodeSegments(md)).toEqual([{ type: "markdown", text: md }]);
  });

  it("treats unclosed or empty faq blocks as plain markdown (renderer parity)", () => {
    expect(splitShortcodeSegments("{{faq}}\nno pairs here\n{{/faq}}")).toEqual([
      { type: "markdown", text: "{{faq}}\nno pairs here\n{{/faq}}" },
    ]);
    expect(splitShortcodeSegments("{{faq}}\nQ: dangling?")).toEqual([
      { type: "markdown", text: "{{faq}}\nQ: dangling?" },
    ]);
  });
});

describe("toEditorMarkdown", () => {
  it("replaces shortcodes with single-line placeholders", () => {
    const out = toEditorMarkdown(`before\n\n${FAQ_RAW}\n\nafter`);
    expect(out).toContain('data-fx-shortcode="faq"');
    expect(out).not.toContain("{{faq}}");
    // Placeholders must stay on one line so markdown-it keeps them one block.
    const placeholderLine = out
      .split("\n")
      .find((line) => line.includes("data-fx-shortcode"));
    expect(placeholderLine).toBeDefined();
  });
});

describe("roundTripMarkdown - shortcode regions are byte-identical", () => {
  it.each([
    ["cta", "{{cta}}"],
    ["toc", "{{toc}}"],
    ["faq", FAQ_RAW],
    ["spaced cta", "{{ cta }}"],
  ])("%s block alone", (_name, raw) => {
    expect(roundTripMarkdown(raw)).toBe(raw);
  });

  it("keeps every shortcode region byte-identical in a mixed post", () => {
    const input = [
      "# Launch notes",
      "",
      "{{toc}}",
      "",
      "Intro paragraph with **bold**.",
      "",
      "{{cta}}",
      "",
      "## Details",
      "",
      FAQ_RAW,
      "",
      "Closing words.",
    ].join("\n");

    const output = roundTripMarkdown(input);
    const raws = (md: string) =>
      splitShortcodeSegments(md).flatMap((s) => (s.type === "markdown" ? [] : [s.raw]));
    expect(raws(output)).toEqual(raws(input));
    expect(output).toContain(FAQ_RAW);
    expect(output).toContain("{{cta}}");
    expect(output).toContain("{{toc}}");
  });

  it("does not treat shortcodes inside code fences as blocks", () => {
    const input = "```\n{{cta}}\n```";
    expect(roundTripMarkdown(input)).toBe(input);
  });
});

describe("roundTripMarkdown - plain markdown", () => {
  it("is byte-identical for markdown already in serialized form", () => {
    const input = [
      "# Heading 1",
      "",
      "## Heading 2",
      "",
      "### Heading 3",
      "",
      "#### Heading 4",
      "",
      "##### Heading 5",
      "",
      "###### Heading 6",
      "",
      "A paragraph with **bold**, *italic*, ~~strike~~, `code` and a [link](https://example.com).",
      "",
      "- bullet one",
      "- bullet two",
      "",
      "1. first",
      "2. second",
      "",
      "> A quote line.",
      "",
      "```ts",
      "const answer = 42;",
      "```",
      "",
      "| Col A | Col B |",
      "| --- | --- |",
      "| 1 | 2 |",
      "",
      "![Alt text](https://example.com/pic.png)",
      "",
      "After the image.",
      "",
      "---",
      "",
      "The end.",
    ].join("\n");

    expect(roundTripMarkdown(input)).toBe(input);
  });

  /**
   * Documented benign normalizations applied by the markdown serializer:
   * - `_em_`   → `*em*`         (emphasis marker)
   * - `* item` → `- item`       (bullet marker)
   * - `***`    → `---`          (horizontal rule)
   * - setext headings (`===`)   → ATX (`#`)
   * - table cell padding        → single spaces, `---` delimiters
   * - 3+ blank lines            → one blank line between blocks
   */
  it("normalizes equivalent syntax variants to canonical forms", () => {
    expect(roundTripMarkdown("_emphasis_")).toBe("*emphasis*");
    expect(roundTripMarkdown("* item one\n* item two")).toBe("- item one\n- item two");
    expect(roundTripMarkdown("***")).toBe("---");
    expect(roundTripMarkdown("Heading\n===")).toBe("# Heading");
    expect(roundTripMarkdown("para one\n\n\n\npara two")).toBe("para one\n\npara two");
  });

  it("keeps a block image separated from the following block", () => {
    const input = "![alt](https://example.com/a.png)\n\n> quote";
    expect(roundTripMarkdown(input)).toBe(input);
  });

  it("is idempotent: serializing twice yields the same document", () => {
    const messy = "Some _text_\n* a\n* b\n\nHeading\n---";
    const once = roundTripMarkdown(messy);
    expect(roundTripMarkdown(once)).toBe(once);
  });
});

describe("editor commands used by the slash menu and tab switching", () => {
  function createEditor(markdown: string): Editor {
    return new Editor({
      element: null,
      extensions: buildEditorExtensions(),
      content: toEditorMarkdown(markdown),
    });
  }

  it("insertContent for shortcode nodes serializes to default snippets", () => {
    const editor = createEditor("Hello.");
    try {
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        type: "mykavoCta",
      });
      editor.commands.insertContentAt(editor.state.doc.content.size, {
        type: "mykavoToc",
      });
      const markdown = getEditorMarkdown(editor);
      expect(markdown).toContain("{{cta}}");
      expect(markdown).toContain("{{toc}}");
    } finally {
      editor.destroy();
    }
  });

  it("setContent after creation (markdown-tab edits) still round-trips shortcodes", () => {
    const editor = createEditor("First version.");
    try {
      const next = `Updated intro.\n\n${FAQ_RAW}`;
      editor.commands.setContent(toEditorMarkdown(next));
      expect(getEditorMarkdown(editor)).toBe(next);
    } finally {
      editor.destroy();
    }
  });
});

describe("splitFaqRaw / joinFaqRaw", () => {
  it("round-trips the raw region exactly", () => {
    const { open, body, close } = splitFaqRaw(FAQ_RAW);
    expect(open).toBe("{{faq}}");
    expect(close).toBe("{{/faq}}");
    expect(joinFaqRaw(open, body, close)).toBe(FAQ_RAW);
  });
});

describe("isAllowedLinkHref", () => {
  it.each([
    "https://example.com",
    "http://example.com/a?b=c",
    "mailto:team@mykavo.dev",
    "/pricing",
    "#section",
    "./relative",
  ])("allows %s", (href) => {
    expect(isAllowedLinkHref(href)).toBe(true);
  });

  it.each([
    "javascript:alert(1)",
    "data:text/html,x",
    "ftp://example.com",
    "//evil.example",
    "",
    "   ",
  ])("rejects %s", (href) => {
    expect(isAllowedLinkHref(href)).toBe(false);
  });
});

describe("countWords", () => {
  it("matches the read-time word definition", () => {
    expect(countWords("one two  three\n\nfour")).toBe(4);
    expect(countWords("")).toBe(0);
  });
});
