import { describe, expect, it } from "vitest";
import { buildNarration, chunkText, speakableInline, waveformPeaks, FAQ_CHAPTER, INTRO_CHAPTER } from "./blog-narration";

const post = {
  title: "12 Best SEO Monitoring Tools in 2026 (Free + Paid)",
  authorName: "Dakshesh",
  content: [
    "Most lists get this **wrong**. See [our guide](https://mykavo.app/x) for more.",
    "",
    "{{cta}}",
    "",
    "## Comparison table",
    "",
    "| Tool | Price |",
    "|-|-|",
    "| MyKavo | $7/mo |",
    "",
    "Prices change often.",
    "",
    "## The tools",
    "",
    "### 1. MyKavo",
    "",
    "- **Pricing:** $7/month",
    "- Free plan",
    "",
    "```bash",
    "curl https://example.com",
    "```",
    "",
    "![screenshot](/img.png)",
    "",
    "{{faq}}",
    "Q: Is it free?",
    "A: Yes, for 1 site.",
    "{{/faq}}",
  ].join("\n"),
};

describe("buildNarration", () => {
  it("splits into an introduction plus one chapter per H2, and a FAQ chapter", () => {
    const script = buildNarration(post);
    expect(script.chapters.map((c) => c.title)).toEqual([
      INTRO_CHAPTER,
      "Comparison table",
      "The tools",
      FAQ_CHAPTER,
    ]);
  });

  it("reads the title and author first", () => {
    const [intro] = buildNarration(post).chapters;
    expect(intro!.text.startsWith("12 Best SEO Monitoring Tools in 2026 (Free + Paid). Written by Dakshesh.")).toBe(true);
    expect(intro!.text).toContain("Most lists get this wrong. See our guide for more.");
  });

  it("drops page furniture, code, images and URLs but notes tables", () => {
    const text = buildNarration(post).chapters.map((c) => c.text).join("\n");
    expect(text).not.toMatch(/\{\{|\||```|curl|https?:|screenshot|\*\*/);
    expect(text).toContain("The full comparison table is in the article.");
    expect(text).toContain("Prices change often.");
  });

  it("reads list items, prices and FAQ answers naturally", () => {
    const script = buildNarration(post);
    const tools = script.chapters[2]!.text;
    expect(tools).toContain("1. MyKavo.");
    expect(tools).toContain("Pricing: $7 a month.");
    expect(tools).toContain("Free plan.");
    expect(script.chapters[3]!.text).toBe(`${FAQ_CHAPTER}.\n\nIs it free?\n\nYes, for 1 site.`);
  });

  it("counts characters and hashes deterministically", () => {
    const a = buildNarration(post);
    const b = buildNarration(post);
    expect(a.hash).toBe(b.hash);
    expect(a.characters).toBe(a.chapters.reduce((n, c) => n + c.text.length, 0));
    expect(buildNarration({ ...post, content: post.content + "\n\nOne more line." }).hash).not.toBe(a.hash);
    // Furniture that is not read does not change the hash.
    expect(buildNarration({ ...post, content: post.content.replace("{{cta}}", "{{cta-wordpress}}") }).hash).toBe(a.hash);
  });

  it("does not add a second FAQ chapter under an existing FAQ heading", () => {
    const script = buildNarration({ title: "T", content: "## Frequently asked questions\n\n{{faq}}\nQ: A?\nA: B.\n{{/faq}}" });
    expect(script.chapters.map((c) => c.title)).toEqual([INTRO_CHAPTER, "Frequently asked questions"]);
  });
});

describe("speakableInline", () => {
  it("handles emphasis, inline code and arrows", () => {
    expect(speakableInline("Use `noindex` *carefully* → done")).toBe("Use noindex carefully to done");
    expect(speakableInline("£199/year or €79 / mo")).toBe("£199 a year or €79 a month");
  });
});

describe("chunkText", () => {
  it("keeps paragraphs together under the limit and splits long ones by sentence", () => {
    const para = "Sentence one is here. ".repeat(20).trim();
    const chunks = chunkText(`${para}\n\n${para}`, 500);
    expect(chunks.every((c) => c.length <= 500)).toBe(true);
    expect(chunks.join(" ").replace(/\s+/g, " ")).toBe(`${para} ${para}`.replace(/\s+/g, " "));
    expect(chunkText("short\n\nalso short", 500)).toEqual(["short\n\nalso short"]);
  });
});

describe("waveformPeaks", () => {
  it("scales loudness to 0-100 per bar", () => {
    const samples = new Int16Array(8000);
    for (let i = 4000; i < 8000; i += 1) samples[i] = i % 2 === 0 ? 16000 : -16000;
    const peaks = waveformPeaks(samples, 4);
    expect(peaks).toEqual([0, 0, 100, 100]);
    expect(waveformPeaks(new Int16Array(0))).toEqual([]);
    expect(waveformPeaks(new Int16Array(100), 10)).toEqual(new Array(10).fill(0));
  });
});
