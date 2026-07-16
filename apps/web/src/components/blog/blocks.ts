import { slugify } from "@/lib/slugify";

/**
 * Shortcode blocks for blog posts.
 *
 * Authors can drop `{{cta}}`, `{{toc}}`, and `{{faq}}…{{/faq}}` blocks into
 * post markdown (via the editor's "/" menu). This module is the single source
 * of truth for parsing them: it splits raw markdown into ordered segments,
 * parses FAQ Q/A pairs, and extracts h2/h3 headings with stable anchor ids.
 * The public post page and the editor live preview both render from this
 * parse, so the preview always matches what readers see.
 *
 * Unknown or malformed shortcodes are left in the markdown untouched — they
 * render as plain text and never crash the page.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export interface PostHeading {
  depth: 2 | 3;
  /** Plain heading text with inline markdown formatting stripped. */
  text: string;
  /** Anchor id — slugified text, deduplicated with -2, -3… suffixes. */
  id: string;
}

export interface MarkdownSegment {
  type: "markdown";
  content: string;
  /**
   * Anchor ids for h2/h3 headings, keyed by 1-based line number within
   * `content`. Matches the `position.start.line` remark reports for the
   * heading node, so the renderer can attach ids without shared counters.
   */
  headingIds: Record<number, string>;
}

export type BlockSegment =
  | MarkdownSegment
  | { type: "cta" }
  | { type: "toc" }
  | { type: "faq"; items: FaqItem[] };

export interface ParsedPost {
  segments: BlockSegment[];
  /** All h2/h3 headings across markdown segments, in document order. */
  headings: PostHeading[];
}

/** Snippets offered by the editor's "/" insert menu. */
export interface BlockSnippet {
  command: string;
  label: string;
  description: string;
  snippet: string;
}

export const BLOCK_SNIPPETS: readonly BlockSnippet[] = [
  {
    command: "cta",
    label: "CTA card",
    description: "“Try MyKavo” call-to-action with a signup button.",
    snippet: "{{cta}}",
  },
  {
    command: "faq",
    label: "FAQ section",
    description: "Q&A accordion — also emits FAQ structured data.",
    snippet:
      "{{faq}}\nQ: First question?\nA: First answer.\nQ: Second question?\nA: Second answer.\n{{/faq}}",
  },
  {
    command: "toc",
    label: "Table of contents",
    description: "Linked list of this post's headings.",
    snippet: "{{toc}}",
  },
];

const CTA_TOKEN = /^\{\{\s*cta\s*\}\}$/;
const TOC_TOKEN = /^\{\{\s*toc\s*\}\}$/;
const FAQ_OPEN_TOKEN = /^\{\{\s*faq\s*\}\}$/;
const FAQ_CLOSE_TOKEN = /^\{\{\s*\/faq\s*\}\}$/;

/** Code-fence delimiter (CommonMark allows up to 3 leading spaces). */
const FENCE = /^ {0,3}(?:`{3,}|~{3,})/;

/** ATX h2/h3 heading: `## text` / `### text` (a space after the hashes is required). */
const ATX_HEADING = /^ {0,3}(#{2,3})\s+(.*)$/;

/**
 * Creates a document-scoped id generator: slugified text, with duplicate
 * slugs deduplicated by -2, -3… suffixes in order of appearance.
 */
export function createHeadingIdGenerator(): (text: string) => string {
  const seen = new Map<string, number>();
  return (text) => {
    const base = slugify(text) || "section";
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  };
}

/** Reduces inline markdown (links, emphasis, code…) to its plain text. */
function stripInlineMarkdown(input: string): string {
  return (
    input
      // closing ATX sequence: `## Title ##`
      .replace(/\s+#+\s*$/, "")
      .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/`+([^`]+)`+/g, "$1")
      .replace(/(\*\*|__)([^*_]+)\1/g, "$2")
      .replace(/(\*|_)([^*_]+)\1/g, "$2")
      .replace(/~~([^~]+)~~/g, "$1")
      .trim()
  );
}

/**
 * Parses the FAQ body: lines starting with `Q:` open a question, `A:` lines
 * open its answer, and other lines continue whichever field is active
 * (multi-line answers keep their line breaks and render as markdown).
 * Pairs missing a question or an answer are dropped.
 */
export function parseFaqItems(lines: readonly string[]): FaqItem[] {
  const items: FaqItem[] = [];
  let question: string[] | null = null;
  let answer: string[] | null = null;

  const flush = () => {
    if (!question || !answer) return;
    const q = question.join(" ").replace(/\s+/g, " ").trim();
    const a = answer.join("\n").trim();
    if (q && a) items.push({ question: q, answer: a });
  };

  for (const raw of lines) {
    const q = /^\s*q:\s*(.*)$/i.exec(raw);
    if (q) {
      flush();
      question = [q[1]];
      answer = null;
      continue;
    }
    const a = /^\s*a:\s*(.*)$/i.exec(raw);
    if (a) {
      if (question) (answer ??= []).push(a[1]);
      continue; // an A: without a preceding Q: is dropped
    }
    if (answer) answer.push(raw);
    else if (question) question.push(raw.trim());
  }
  flush();
  return items;
}

/**
 * Splits raw post markdown into ordered block segments and extracts headings.
 * Shortcode tokens must sit alone on their own line and are ignored inside
 * fenced code blocks. Anything unrecognized stays in the markdown as-is.
 */
export function parsePost(markdown: string): ParsedPost {
  const segments: BlockSegment[] = [];
  const headings: PostHeading[] = [];
  const nextId = createHeadingIdGenerator();

  let buffer: string[] = [];
  let bufferHeadings: { index: number; depth: 2 | 3; text: string }[] = [];
  let inFence = false;
  let sawShortcode = false;

  const pushLine = (line: string) => {
    buffer.push(line);
    if (inFence) return;
    const match = ATX_HEADING.exec(line);
    if (!match) return;
    const text = stripInlineMarkdown(match[2]);
    if (!text) return;
    bufferHeadings.push({
      index: buffer.length - 1,
      depth: match[1].length === 2 ? 2 : 3,
      text,
    });
  };

  const flush = () => {
    if (buffer.length === 0) return;
    const content = buffer.join("\n");
    if (content.trim()) {
      const headingIds: Record<number, string> = {};
      for (const h of bufferHeadings) {
        const id = nextId(h.text);
        headingIds[h.index + 1] = id;
        headings.push({ depth: h.depth, text: h.text, id });
      }
      segments.push({ type: "markdown", content, headingIds });
    }
    buffer = [];
    bufferHeadings = [];
  };

  const lines = markdown.split(/\r?\n/);
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (FENCE.test(line)) {
      inFence = !inFence;
      pushLine(line);
      i += 1;
      continue;
    }

    if (!inFence) {
      const trimmed = line.trim();
      if (CTA_TOKEN.test(trimmed)) {
        flush();
        segments.push({ type: "cta" });
        sawShortcode = true;
        i += 1;
        continue;
      }
      if (TOC_TOKEN.test(trimmed)) {
        flush();
        segments.push({ type: "toc" });
        sawShortcode = true;
        i += 1;
        continue;
      }
      if (FAQ_OPEN_TOKEN.test(trimmed)) {
        let close = -1;
        for (let j = i + 1; j < lines.length; j += 1) {
          if (FAQ_CLOSE_TOKEN.test(lines[j].trim())) {
            close = j;
            break;
          }
        }
        const items = close === -1 ? [] : parseFaqItems(lines.slice(i + 1, close));
        if (items.length > 0) {
          flush();
          segments.push({ type: "faq", items });
          sawShortcode = true;
          i = close + 1;
          continue;
        }
        // Unclosed or empty FAQ block: fall through — renders as plain text.
      }
    }

    pushLine(line);
    i += 1;
  }
  flush();

  // No shortcodes at all: return the original markdown untouched so existing
  // posts render byte-for-byte as before. (Without shortcode boundaries the
  // loop produces at most one segment, whose heading ids we keep.)
  if (!sawShortcode) {
    const only = segments[0];
    return {
      segments: markdown.trim()
        ? [
            {
              type: "markdown",
              content: markdown,
              headingIds: only?.type === "markdown" ? only.headingIds : {},
            },
          ]
        : [],
      headings,
    };
  }

  return { segments, headings };
}

/**
 * Line-level shortcode and fence tokens, exported so the visual editor's
 * markdown splitter matches this renderer's parsing exactly (additive export
 * — the parsing above is unchanged).
 */
export const SHORTCODE_LINE_TOKENS = {
  cta: CTA_TOKEN,
  toc: TOC_TOKEN,
  faqOpen: FAQ_OPEN_TOKEN,
  faqClose: FAQ_CLOSE_TOKEN,
  fence: FENCE,
} as const;

/** All FAQ items across segments — used for FAQPage JSON-LD. */
export function collectFaqItems(segments: readonly BlockSegment[]): FaqItem[] {
  return segments.flatMap((segment) => (segment.type === "faq" ? segment.items : []));
}

const WORDS_PER_MINUTE = 200;

/** Estimated read time in whole minutes (words / 200, rounded up, min 1). */
export function readingTimeMinutes(markdown: string): number {
  const words = markdown.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
}
