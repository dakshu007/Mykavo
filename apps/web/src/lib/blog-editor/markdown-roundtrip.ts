import { parseFaqItems, SHORTCODE_LINE_TOKENS } from "@/components/blog/blocks";

/**
 * Pure string helpers for the visual blog editor's markdown round-trip.
 *
 * The visual editor (Tiptap) stores posts as markdown, exactly like the
 * textarea editor. MyKavo shortcode blocks — `{{cta}}`, `{{toc}}`, and
 * `{{faq}}…{{/faq}}` — must survive a load → save cycle byte-identically, so
 * before markdown is handed to the Tiptap markdown parser we replace each
 * shortcode region with an HTML placeholder element that carries the exact
 * raw source text in an attribute. Custom atom nodes pick the placeholder up
 * and serialize the raw text back verbatim.
 *
 * The splitter mirrors `parsePost` in components/blog/blocks.ts (same token
 * regexes, same fence handling, same "FAQ needs at least one valid Q/A pair"
 * rule) so a chip appears in the editor exactly when the public renderer
 * would render a block.
 */

export type ShortcodeSegment =
  | { type: "markdown"; text: string }
  | { type: "cta" | "toc"; raw: string }
  | { type: "faq"; raw: string };

/** Attribute names used by the placeholder <div> and the Tiptap nodes. */
export const SHORTCODE_TYPE_ATTR = "data-fx-shortcode";
export const SHORTCODE_RAW_ATTR = "data-fx-raw";

/**
 * Encodes raw shortcode source for an HTML attribute. URI-encoding keeps the
 * value quote-, newline-, and unicode-safe on a single line (markdown-it html
 * blocks end at blank lines, so the placeholder must never contain one).
 */
export function encodeShortcodeRaw(raw: string): string {
  return encodeURIComponent(raw);
}

export function decodeShortcodeRaw(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return "";
  }
}

const { cta, toc, faqOpen, faqClose, fence } = SHORTCODE_LINE_TOKENS;

/**
 * Splits post markdown into plain-markdown segments and shortcode regions.
 * `raw` is the exact source of the region (the token line, or the whole
 * `{{faq}}…{{/faq}}` block including delimiters), preserved byte-for-byte.
 */
export function splitShortcodeSegments(markdown: string): ShortcodeSegment[] {
  const segments: ShortcodeSegment[] = [];
  let buffer: string[] = [];
  let inFence = false;

  const flush = () => {
    if (buffer.length === 0) return;
    const text = buffer.join("\n");
    if (text.trim()) segments.push({ type: "markdown", text });
    buffer = [];
  };

  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (fence.test(line)) {
      inFence = !inFence;
      buffer.push(line);
      i += 1;
      continue;
    }

    if (!inFence) {
      const trimmed = line.trim();
      if (cta.test(trimmed)) {
        flush();
        segments.push({ type: "cta", raw: line });
        i += 1;
        continue;
      }
      if (toc.test(trimmed)) {
        flush();
        segments.push({ type: "toc", raw: line });
        i += 1;
        continue;
      }
      if (faqOpen.test(trimmed)) {
        let close = -1;
        for (let j = i + 1; j < lines.length; j += 1) {
          if (faqClose.test(lines[j].trim())) {
            close = j;
            break;
          }
        }
        const items = close === -1 ? [] : parseFaqItems(lines.slice(i + 1, close));
        if (items.length > 0) {
          flush();
          segments.push({ type: "faq", raw: lines.slice(i, close + 1).join("\n") });
          i = close + 1;
          continue;
        }
        // Unclosed or empty FAQ — falls through as plain markdown, exactly
        // like the public renderer.
      }
    }

    buffer.push(line);
    i += 1;
  }
  flush();
  return segments;
}

/** Placeholder element consumed by the shortcode Tiptap nodes' parseHTML. */
function shortcodePlaceholder(type: "cta" | "toc" | "faq", raw: string): string {
  return `<div ${SHORTCODE_TYPE_ATTR}="${type}" ${SHORTCODE_RAW_ATTR}="${encodeShortcodeRaw(raw)}"></div>`;
}

/**
 * Converts stored post markdown into the markdown fed to the Tiptap editor:
 * shortcode regions become single-line HTML placeholders; everything else is
 * passed through untouched. Blank lines between segments keep the
 * placeholders as standalone HTML blocks.
 */
export function toEditorMarkdown(markdown: string): string {
  return splitShortcodeSegments(markdown)
    .map((segment) =>
      segment.type === "markdown" ? segment.text : shortcodePlaceholder(segment.type, segment.raw),
    )
    .join("\n\n");
}

/** Default raw text for a FAQ block inserted from the editor. */
export const DEFAULT_FAQ_RAW =
  "{{faq}}\nQ: First question?\nA: First answer.\nQ: Second question?\nA: Second answer.\n{{/faq}}";

/**
 * Splits a `{{faq}}…{{/faq}}` raw region into its delimiters and inner body
 * so the editor can expose just the Q:/A: lines for editing. Rebuilding with
 * `joinFaqRaw` reproduces the input byte-for-byte.
 */
export function splitFaqRaw(raw: string): { open: string; body: string; close: string } {
  const lines = raw.split("\n");
  if (lines.length < 2) return { open: raw, body: "", close: "" };
  return {
    open: lines[0],
    body: lines.slice(1, -1).join("\n"),
    close: lines[lines.length - 1],
  };
}

export function joinFaqRaw(open: string, body: string, close: string): string {
  return [open, body, close].join("\n");
}

/**
 * Link targets the editor may set: web URLs, mailto, and site-relative or
 * in-page paths. Everything else (javascript:, data:, …) is rejected.
 */
export function isAllowedLinkHref(href: string): boolean {
  const value = href.trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (/^mailto:[^\s]+/i.test(value)) return true;
  return /^[/#.]/.test(value) && !/^\/\//.test(value);
}

/** Word count matching readingTimeMinutes' definition in blocks.ts. */
export function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter(Boolean).length;
}
