import { describe, expect, it } from "vitest";
import {
  BLOCK_SNIPPETS,
  collectFaqItems,
  createHeadingIdGenerator,
  parseFaqItems,
  parsePost,
  readingTimeMinutes,
} from "./blocks";

describe("parsePost - segments", () => {
  it("returns a post without shortcodes as a single untouched markdown segment", () => {
    const markdown = "## Hello\n\nSome **bold** text.\n";
    const { segments } = parsePost(markdown);
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({ type: "markdown", content: markdown });
  });

  it("returns no segments for empty input", () => {
    expect(parsePost("").segments).toEqual([]);
    expect(parsePost("   \n\n  ").segments).toEqual([]);
  });

  it("splits cta and toc tokens into their own segments in author order", () => {
    const { segments } = parsePost("Intro.\n\n{{cta}}\n\nMiddle.\n\n{{toc}}\n\nEnd.");
    expect(segments.map((s) => s.type)).toEqual([
      "markdown",
      "cta",
      "markdown",
      "toc",
      "markdown",
    ]);
  });

  it("supports a shortcode as the first or last line", () => {
    expect(parsePost("{{cta}}\n\nBody.").segments.map((s) => s.type)).toEqual([
      "cta",
      "markdown",
    ]);
    expect(parsePost("Body.\n\n{{cta}}").segments.map((s) => s.type)).toEqual([
      "markdown",
      "cta",
    ]);
  });

  it("tolerates whitespace inside and around tokens", () => {
    const { segments } = parsePost("  {{ cta }}  ");
    expect(segments.map((s) => s.type)).toEqual(["cta"]);
  });

  it("leaves unknown shortcodes as plain markdown", () => {
    const { segments } = parsePost("Before\n\n{{banner}}\n\nAfter");
    expect(segments).toHaveLength(1);
    expect(segments[0]).toMatchObject({
      type: "markdown",
      content: "Before\n\n{{banner}}\n\nAfter",
    });
  });

  it("does not treat inline (non-standalone) tokens as shortcodes", () => {
    const { segments } = parsePost("Use {{cta}} to insert a card.");
    expect(segments.map((s) => s.type)).toEqual(["markdown"]);
  });

  it("ignores shortcodes inside fenced code blocks", () => {
    const markdown = "```\n{{cta}}\n```\n\n{{cta}}";
    const { segments } = parsePost(markdown);
    expect(segments.map((s) => s.type)).toEqual(["markdown", "cta"]);
    expect(segments[0]).toMatchObject({ content: "```\n{{cta}}\n```\n" });
  });

  it("drops whitespace-only markdown between adjacent blocks", () => {
    const { segments } = parsePost("{{cta}}\n\n{{toc}}");
    expect(segments.map((s) => s.type)).toEqual(["cta", "toc"]);
  });
});

describe("parsePost - FAQ blocks", () => {
  const faq = "{{faq}}\nQ: What is MyKavo?\nA: A monitoring tool.\nQ: Is it free?\nA: There is a free plan.\n{{/faq}}";

  it("parses Q/A pairs into a faq segment", () => {
    const { segments } = parsePost(faq);
    expect(segments).toEqual([
      {
        type: "faq",
        items: [
          { question: "What is MyKavo?", answer: "A monitoring tool." },
          { question: "Is it free?", answer: "There is a free plan." },
        ],
      },
    ]);
  });

  it("treats an unclosed faq block as plain text", () => {
    const markdown = "{{faq}}\nQ: Question?\nA: Answer.";
    const { segments } = parsePost(markdown);
    expect(segments).toEqual([{ type: "markdown", content: markdown, headingIds: {} }]);
  });

  it("treats a faq block without valid pairs as plain text", () => {
    const markdown = "{{faq}}\nJust some prose.\n{{/faq}}";
    const { segments } = parsePost(markdown);
    expect(segments.map((s) => s.type)).toEqual(["markdown"]);
  });

  it("collects faq items across segments for JSON-LD", () => {
    const { segments } = parsePost(`Intro\n\n${faq}\n\nMore\n\n${faq}`);
    expect(collectFaqItems(segments)).toHaveLength(4);
  });
});

describe("parseFaqItems", () => {
  it("supports multi-line answers, preserving line breaks", () => {
    const items = parseFaqItems([
      "Q: How does it work?",
      "A: First line.",
      "",
      "Second paragraph.",
    ]);
    expect(items).toEqual([
      { question: "How does it work?", answer: "First line.\n\nSecond paragraph." },
    ]);
  });

  it("supports multi-line questions joined with spaces", () => {
    const items = parseFaqItems(["Q: A very", "long question?", "A: Yes."]);
    expect(items).toEqual([{ question: "A very long question?", answer: "Yes." }]);
  });

  it("is case-insensitive on the Q:/A: markers", () => {
    const items = parseFaqItems(["q: Lower?", "a: Also lower."]);
    expect(items).toEqual([{ question: "Lower?", answer: "Also lower." }]);
  });

  it("drops questions without answers and answers without questions", () => {
    expect(parseFaqItems(["Q: Orphan question?"])).toEqual([]);
    expect(parseFaqItems(["A: Orphan answer."])).toEqual([]);
    expect(parseFaqItems(["Q: Kept?", "A: Yes.", "Q: Dropped?"])).toEqual([
      { question: "Kept?", answer: "Yes." },
    ]);
  });

  it("drops pairs whose answer is empty", () => {
    expect(parseFaqItems(["Q: Empty?", "A:"])).toEqual([]);
  });
});

describe("parsePost - headings", () => {
  it("extracts h2/h3 headings with depth, text, and slug ids", () => {
    const { headings } = parsePost("## First section\n\ntext\n\n### Sub section\n\n## Second");
    expect(headings).toEqual([
      { depth: 2, text: "First section", id: "first-section" },
      { depth: 3, text: "Sub section", id: "sub-section" },
      { depth: 2, text: "Second", id: "second" },
    ]);
  });

  it("ignores h1 and h4+ headings", () => {
    const { headings } = parsePost("# Title\n\n## Kept\n\n#### Deep");
    expect(headings.map((h) => h.text)).toEqual(["Kept"]);
  });

  it("requires a space after the hashes (CommonMark)", () => {
    expect(parsePost("##NotAHeading").headings).toEqual([]);
  });

  it("strips inline markdown from heading text", () => {
    const { headings } = parsePost(
      "## **Bold** and `code`\n\n## [Linked](https://example.com) heading ##",
    );
    expect(headings.map((h) => h.text)).toEqual(["Bold and code", "Linked heading"]);
  });

  it("deduplicates repeated heading slugs with numeric suffixes", () => {
    const { headings } = parsePost("## Setup\n\n## Setup\n\n## Setup");
    expect(headings.map((h) => h.id)).toEqual(["setup", "setup-2", "setup-3"]);
  });

  it("ignores headings inside fenced code blocks", () => {
    const { headings } = parsePost("```\n## not a heading\n```\n\n## Real");
    expect(headings.map((h) => h.text)).toEqual(["Real"]);
  });

  it("maps heading ids to 1-based line numbers within each segment", () => {
    const { segments } = parsePost("Intro.\n\n{{cta}}\n\n## After the break\n\ntext");
    const markdownSegments = segments.filter((s) => s.type === "markdown");
    // Second markdown segment starts right after {{cta}}; the heading sits on
    // line 2 of that segment ("" is line 1).
    expect(markdownSegments[1].headingIds).toEqual({ 2: "after-the-break" });
  });

  it("extracts headings across shortcode boundaries in document order", () => {
    const { headings } = parsePost("## One\n\n{{toc}}\n\n## Two\n\n### Two point one");
    expect(headings.map((h) => h.id)).toEqual(["one", "two", "two-point-one"]);
  });
});

describe("createHeadingIdGenerator", () => {
  it("falls back to 'section' when nothing slugifiable remains", () => {
    const next = createHeadingIdGenerator();
    expect(next("!!!")).toBe("section");
    expect(next("???")).toBe("section-2");
  });
});

describe("editor snippets round-trip through the parser", () => {
  it("every snippet parses into its own block segment", () => {
    for (const option of BLOCK_SNIPPETS) {
      const { segments } = parsePost(option.snippet);
      expect(segments).toHaveLength(1);
      expect(segments[0].type).toBe(option.command);
    }
  });

  it("the faq snippet parses into two Q/A pairs", () => {
    const faqSnippet = BLOCK_SNIPPETS.find((o) => o.command === "faq");
    expect(faqSnippet).toBeDefined();
    const { segments } = parsePost(faqSnippet ? faqSnippet.snippet : "");
    expect(segments[0]).toMatchObject({
      type: "faq",
      items: [
        { question: "First question?", answer: "First answer." },
        { question: "Second question?", answer: "Second answer." },
      ],
    });
  });
});

describe("readingTimeMinutes", () => {
  it("returns at least 1 minute", () => {
    expect(readingTimeMinutes("")).toBe(1);
    expect(readingTimeMinutes("a few words")).toBe(1);
  });

  it("rounds up at 200 words per minute", () => {
    expect(readingTimeMinutes(Array(200).fill("word").join(" "))).toBe(1);
    expect(readingTimeMinutes(Array(201).fill("word").join(" "))).toBe(2);
    expect(readingTimeMinutes(Array(1000).fill("word").join(" "))).toBe(5);
  });
});
