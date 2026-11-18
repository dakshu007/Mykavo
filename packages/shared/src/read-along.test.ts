import { describe, expect, it } from "vitest";
import {
  TABLE_NOTE_TEXT,
  alignWords,
  lastAtOrBefore,
  matchSegments,
  sentenceStarts,
  spokenWords,
} from "./read-along";
import { buildNarration, chunkSegments } from "./blog-narration";

describe("matchSegments", () => {
  const candidates = [
    { text: "12 Best SEO Monitoring Tools in 2026 (Free + Paid)", kind: "h1" },
    { text: "Most lists of SEO monitoring tools make the same mistake.", kind: "p" },
    { text: "Check your own page's meta tags", kind: "h2" }, // a tool widget, never read
    { text: "Comparison table", kind: "h2" },
    { text: "Tool Price MyKavo $7/mo", kind: "table" },
    { text: "Pricing: $7/month for 2 websites", kind: "li" },
  ];

  it("follows reading order, skips furniture and maps the table note to the table", () => {
    const segments = [
      "12 Best SEO Monitoring Tools in 2026 (Free + Paid). Written by Dakshesh.",
      "Most lists of SEO monitoring tools make the same mistake.",
      "Comparison table.",
      TABLE_NOTE_TEXT,
      "Pricing: $7 a month for 2 websites.",
    ];
    expect(matchSegments(segments, candidates)).toEqual([0, 1, 3, 4, 5]);
  });

  it("leaves a segment unmatched rather than jumping to a weak match", () => {
    expect(matchSegments(["Something never shown on the page at all."], candidates)).toEqual([null]);
  });
});

describe("alignWords", () => {
  it("maps spoken words to shown words and holds on words that were rewritten", () => {
    const spoken = spokenWords("Pricing: $7 a month for 2 websites.");
    const shown = spokenWords("Pricing: $7/month for 2 websites");
    expect(alignWords(spoken, shown)).toEqual([0, 1, 1, 1, 2, 3, 4]);
  });
});

describe("sentenceStarts / lastAtOrBefore", () => {
  it("finds sentence starts and the active index", () => {
    expect(sentenceStarts(spokenWords("One two. Three four? Five."))).toEqual([0, 2, 4]);
    expect(lastAtOrBefore([0, 100, 250], 120)).toBe(1);
    expect(lastAtOrBefore([0, 100, 250], -5)).toBe(-1);
    expect(lastAtOrBefore([0, 100, 250], 999)).toBe(2);
  });
});

describe("chunkSegments", () => {
  it("records where each segment sits in its chunk", () => {
    const segments = ["Alpha one.", "Beta two.", "Gamma three."];
    const chunks = chunkSegments(segments, 22);
    for (const chunk of chunks) {
      for (const part of chunk.parts) {
        expect(chunk.text.slice(part.start, part.start + part.length)).toBe(segments[part.segment]);
      }
      expect(chunk.text.length).toBeLessThanOrEqual(22);
    }
    expect(chunks.flatMap((c) => c.parts.map((p) => p.segment))).toEqual([0, 1, 2]);
  });

  it("splits a long segment into parts of the same segment", () => {
    const long = "This is a sentence. ".repeat(10).trim();
    const chunks = chunkSegments(["Short.", long], 60);
    const parts = chunks.flatMap((c) => c.parts);
    expect(parts[0]!.segment).toBe(0);
    expect(parts.slice(1).every((p) => p.segment === 1)).toBe(true);
    expect(chunks.every((c) => c.text.length <= 60)).toBe(true);
  });
});

describe("buildNarration segments", () => {
  it("keeps text equal to the segments joined, and the hash independent of them", () => {
    const script = buildNarration({ title: "T", authorName: "A", content: "Para one.\n\n- item\n\n## H\n\nBody." });
    for (const c of script.chapters) expect(c.text).toBe(c.segments.join("\n\n"));
    expect(script.chapters[0]!.segments).toEqual(["T. Written by A.", "Para one.", "item."]);
  });
});
