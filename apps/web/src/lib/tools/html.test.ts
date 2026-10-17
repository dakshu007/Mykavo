import { describe, expect, it } from "vitest";
import { MAX_PARSE_CHARS, capHtml, findRegions, findTags, removeRegions, stripTags, type FindRegionsOptions } from "./html";

/** Deterministic pseudo-random generator, so a failure always reproduces. */
function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x1_0000_0000;
  };
}

/** Random snippets built from the pieces these scanners care about. */
function randomHtml(next: () => number, pieces: readonly string[], length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) out += pieces[Math.floor(next() * pieces.length)];
  return out;
}

const PIECES = [
  "<", ">", "/", " ", "\n", "a", "x", "=", '"', "'", "-", "_", "!--", "-->", "<!--",
  "<script", "</script>", "</script >", "</SCRIPT>", "<style", "</style>", "<h1", "</h1>", "<H1>",
  "<title", "</title>", "<a", "</a>", "<a ", "<link", "<meta", "<svg", "</svg>", "<script-x", "<scriptx",
];

function regexRegions(html: string, re: RegExp, inner: (m: RegExpMatchArray) => string) {
  return [...html.matchAll(re)].map((m) => ({ start: m.index ?? 0, end: (m.index ?? 0) + m[0].length, inner: inner(m) }));
}

describe("findRegions matches the regexes it replaces", () => {
  const cases: Array<{ label: string; re: RegExp; inner: (m: RegExpMatchArray) => string; opts: FindRegionsOptions }> = [
    {
      label: "comments + script/style elements",
      re: /<!--([\s\S]*?)-->|<(script|style)\b[^>]*>([\s\S]*?)<\/\2\s*>/gi,
      inner: (m) => m[1] ?? m[3],
      opts: { comments: true, elements: ["script", "style"] },
    },
    {
      label: "loose elements",
      re: /<(script|style|svg)\b([\s\S]*?)<\/\1\s*>/gi,
      inner: (m) => m[2],
      opts: { elements: ["script", "style", "svg"], open: "loose" },
    },
    {
      label: "title without boundary or closing whitespace",
      re: /<title[^>]*>([\s\S]*?)<\/title>/gi,
      inner: (m) => m[1],
      opts: { elements: ["title"], boundary: false, closeSpace: false },
    },
    {
      label: "h1 with inner HTML",
      re: /<h1\b[^>]*>([\s\S]*?)<\/h1>/gi,
      inner: (m) => m[1],
      opts: { elements: ["h1"], closeSpace: false },
    },
  ];

  for (const c of cases) {
    it(c.label, () => {
      const next = rng(42);
      for (let i = 0; i < 3000; i++) {
        const html = randomHtml(next, PIECES, 1 + Math.floor(next() * 30));
        const got = findRegions(html, c.opts).map(({ start, end, inner }) => ({ start, end, inner }));
        expect(got, html).toEqual(regexRegions(html, c.re, c.inner));
      }
    });
  }

  it("removeRegions replaces each region", () => {
    const html = `<p>a<!-- x --><script src="a.js"></script>b<style>.c{}</style >c</p>`;
    expect(removeRegions(html, { comments: true, elements: ["script", "style"] }, " ")).toBe("<p>a  b c</p>");
  });
});

describe("findTags matches the regexes it replaces", () => {
  it("named tags", () => {
    const next = rng(7);
    for (let i = 0; i < 3000; i++) {
      const html = randomHtml(next, PIECES, 1 + Math.floor(next() * 30));
      const got = findTags(html, ["link", "meta", "script"]).map((t) => t.tag);
      expect(got, html).toEqual(html.match(/<(link|meta|script)\b[^>]*>/gi) ?? []);
    }
  });

  it("any tag", () => {
    const next = rng(11);
    for (let i = 0; i < 3000; i++) {
      const html = randomHtml(next, PIECES, 1 + Math.floor(next() * 30));
      const got = findTags(html, "any").map((t) => t.tag);
      expect(got, html).toEqual(html.match(/<[a-z][a-z0-9-]*\b[^>]*>/gi) ?? []);
    }
  });

  it("closing heading tags and attribute text", () => {
    const tags = findTags(`<h2 id="x">A</h2><H3>B</H3>`, ["h2", "h3", "/h2", "/h3"]);
    expect(tags.map((t) => t.name)).toEqual(["h2", "/h2", "h3", "/h3"]);
    expect(tags[0].attrs).toBe(' id="x"');
  });
});

describe("stripTags", () => {
  it("matches the regex version on random input", () => {
    const next = rng(3);
    for (let i = 0; i < 3000; i++) {
      const s = randomHtml(next, ["<", ">", "a", " ", "&amp;", "<b>", "</b>"], 1 + Math.floor(next() * 30));
      const want = s
        .replace(/<[^>]*>/g, " ")
        .replace(/&amp;/g, "&")
        .trim()
        .replace(/\s+/g, " ")
        .trim();
      expect(stripTags(s), s).toBe(want);
    }
  });
});

describe("capHtml", () => {
  it("keeps the first MAX_PARSE_CHARS characters", () => {
    expect(capHtml("abc")).toBe("abc");
    expect(capHtml("x".repeat(MAX_PARSE_CHARS + 10))).toHaveLength(MAX_PARSE_CHARS);
  });
});
