/**
 * The small markdown subset support answers are written in, parsed into a
 * plain tree that a component renders as React elements. No HTML string is
 * ever built, so an answer can never inject markup.
 *
 * Supported: paragraphs (blank-line separated), "- " bullets, "1. " steps,
 * **bold**, `code` and [label](href) links where href is a site path, an
 * https URL or a mailto.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "code"; text: string }
  | { type: "link"; text: string; href: string };

export type Block =
  | { type: "p"; content: Inline[] }
  | { type: "ul"; items: Inline[][] }
  | { type: "ol"; items: Inline[][] };

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function safeHref(href: string): string | null {
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (/^https:\/\/[^\s]+$/i.test(href)) return href;
  if (/^mailto:[^\s]+$/i.test(href)) return href;
  return null;
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const index = m.index ?? 0;
    if (index > last) out.push({ type: "text", text: text.slice(last, index) });
    if (m[1] !== undefined) out.push({ type: "bold", text: m[1] });
    else if (m[2] !== undefined) out.push({ type: "code", text: m[2] });
    else {
      const href = safeHref(m[4]);
      out.push(href ? { type: "link", text: m[3], href } : { type: "text", text: m[3] });
    }
    last = index + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", text: text.slice(last) });
  return out;
}

const BULLET = /^\s*[-*]\s+(.*)$/;
const STEP = /^\s*\d+[.)]\s+(.*)$/;

export function parseAnswer(source: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: { type: "ul" | "ol"; items: string[] } | null = null;

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ type: "p", content: parseInline(paragraph.join(" ")) });
    paragraph = [];
  };
  const flushList = () => {
    if (list) blocks.push({ type: list.type, items: list.items.map(parseInline) });
    list = null;
  };

  for (const raw of source.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    if (!line.trim()) {
      flushParagraph();
      flushList();
      continue;
    }
    const bullet = BULLET.exec(line);
    const step = bullet ? null : STEP.exec(line);
    const kind = bullet ? "ul" : step ? "ol" : null;
    if (kind) {
      flushParagraph();
      if (!list || list.type !== kind) {
        flushList();
        list = { type: kind, items: [] };
      }
      list.items.push((bullet ?? step)![1]);
      continue;
    }
    if (list && /^\s{2,}\S/.test(raw)) {
      // An indented line continues the previous list item.
      list.items[list.items.length - 1] += ` ${line.trim()}`;
      continue;
    }
    flushList();
    paragraph.push(line.trim());
  }
  flushParagraph();
  flushList();
  return blocks;
}

/** The answer as plain text: for logs, the mailto body and JSON-LD. */
export function answerToPlainText(source: string): string {
  return parseAnswer(source)
    .map((b) => {
      const flat = (content: Inline[]) => content.map((i) => i.text).join("");
      if (b.type === "p") return flat(b.content);
      return b.items.map((item, i) => `${b.type === "ol" ? `${i + 1}.` : "-"} ${flat(item)}`).join("\n");
    })
    .join("\n\n");
}

/** Number of words, for pacing the typing effect. */
export function wordCount(source: string): number {
  return answerToPlainText(source).split(/\s+/).filter(Boolean).length;
}
