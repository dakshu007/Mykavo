/**
 * Turns an AI post's sanitised HTML into plain text blocks the phone can lay
 * out with native Text, so the app needs no WebView to read a post and never
 * renders HTML at all.
 */

export type PostBlock = { type: "h2" | "h3" | "p" | "li" | "quote"; text: string };

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "-",
  ndash: "-",
  hellip: "...",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function plain(html: string): string {
  return decodeEntities(html.replace(/<br\s*\/?>/gi, " ").replace(/<[^>]+>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE: Record<string, PostBlock["type"]> = { h1: "h2", h2: "h2", h3: "h3", h4: "h3", p: "p", li: "li", blockquote: "quote" };

export function htmlToBlocks(html: string, max = 400): PostBlock[] {
  const out: PostBlock[] = [];
  const re = /<(h[1-4]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  for (const m of html.matchAll(re)) {
    const text = plain(m[2]);
    if (!text) continue;
    out.push({ type: TYPE[m[1].toLowerCase()], text });
    if (out.length >= max) break;
  }
  return out;
}

export function wordCount(blocks: PostBlock[]): number {
  return blocks.reduce((n, b) => n + b.text.split(/\s+/).filter(Boolean).length, 0);
}
