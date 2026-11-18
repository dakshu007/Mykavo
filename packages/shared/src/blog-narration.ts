import { createHash } from "node:crypto";
import { TABLE_NOTE_TEXT } from "./read-along";

/**
 * Turns a blog post's markdown into the script a narrator reads for
 * "Listen to this article".
 *
 * Shared by the worker (which sends the script to ElevenLabs) and the blog
 * page (which hashes the same script to check that the stored audio still
 * matches the post). Both sides must build the script identically, which is
 * why it lives here and is versioned: changing what gets read means bumping
 * NARRATION_VERSION, and every post is narrated again on the next sweep.
 *
 * Deterministic and plain-text only: no SSML, no AI rewriting.
 */

/** Bump when the script rules change: every stored narration goes stale. */
export const NARRATION_VERSION = 1;

/** Longest piece of text sent to the speech API in one request. */
export const NARRATION_CHUNK_CHARS = 2400;

export interface NarrationChapter {
  /** Heading text as shown on the page ("Introduction" for the opening). */
  title: string;
  /** What is read aloud for this chapter. */
  text: string;
  /**
   * The same text split into the blocks it came from (paragraph, list item,
   * heading, FAQ question or answer, table note), in reading order. `text`
   * is these joined by blank lines. Read-along maps each block to the page.
   */
  segments: string[];
}

export interface NarrationScript {
  chapters: NarrationChapter[];
  /** Total characters read aloud - what the speech API bills. */
  characters: number;
  /** Hash of the script and NARRATION_VERSION. */
  hash: string;
}

export const INTRO_CHAPTER = "Introduction";
export const FAQ_CHAPTER = "Frequently asked questions";
const TABLE_NOTE = TABLE_NOTE_TEXT;

/** Inline markdown to the words a listener should hear. */
export function speakableInline(input: string): string {
  return (
    input
      // Images go first: their syntax contains a link.
      .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/<[^>]+>/g, "")
      .replace(/https?:\/\/\S+/g, "")
      .replace(/`([^`]*)`/g, "$1")
      .replace(/(\*\*|__)(.+?)\1/g, "$2")
      .replace(/(^|[^\w*])[*_]([^*_\n]+)[*_](?=[^\w*]|$)/g, "$1$2")
      .replace(/[*_]{2,}/g, "")
      // Prices and rates the way people say them.
      .replace(/\s*\/\s*(?:mo|month)\b/gi, " a month")
      .replace(/\s*\/\s*(?:yr|year)\b/gi, " a year")
      .replace(/\s*(?:→|->)\s*/g, " to ")
      .replace(/\s*[\u2013\u2014]\s*/g, ", ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** Ends a line that will be read on its own with a full stop. */
function asSentence(text: string): string {
  if (!text) return text;
  return /[.!?:;]["')\]]?$/.test(text) ? text : `${text}.`;
}

/** Splits text into pieces of at most `max` characters on paragraph, then sentence, boundaries. */
export function chunkText(text: string, max: number = NARRATION_CHUNK_CHARS): string[] {
  const pieces: string[] = [];
  const pushSentences = (paragraph: string) => {
    const sentences = paragraph.match(/[^.!?]+[.!?]+["')\]]*\s*|[^.!?]+$/g) ?? [paragraph];
    let current = "";
    for (const raw of sentences) {
      const sentence = raw.trim();
      if (!sentence) continue;
      if (sentence.length > max) {
        if (current) pieces.push(current);
        current = "";
        for (let i = 0; i < sentence.length; i += max) pieces.push(sentence.slice(i, i + max));
        continue;
      }
      const next = current ? `${current} ${sentence}` : sentence;
      if (next.length > max) {
        pieces.push(current);
        current = sentence;
      } else {
        current = next;
      }
    }
    if (current) pieces.push(current);
  };

  let current = "";
  for (const paragraph of text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean)) {
    if (paragraph.length > max) {
      if (current) pieces.push(current);
      current = "";
      pushSentences(paragraph);
      continue;
    }
    const next = current ? `${current}\n\n${paragraph}` : paragraph;
    if (next.length > max) {
      pieces.push(current);
      current = paragraph;
    } else {
      current = next;
    }
  }
  if (current) pieces.push(current);
  return pieces;
}

export interface SegmentChunk {
  /** Text sent to the speech API: the parts joined by blank lines. */
  text: string;
  /** Where each segment (or piece of a long segment) sits in `text`. */
  parts: Array<{ segment: number; start: number; length: number }>;
}

/**
 * Groups a chapter's segments into request-sized chunks, keeping track of
 * where every segment lands so word timings can be mapped back to it. A
 * segment longer than `max` is split on sentence boundaries into parts of the
 * same segment.
 */
export function chunkSegments(segments: readonly string[], max: number = NARRATION_CHUNK_CHARS): SegmentChunk[] {
  const pieces: Array<{ segment: number; text: string }> = [];
  segments.forEach((segment, index) => {
    if (segment.length <= max) {
      pieces.push({ segment: index, text: segment });
      return;
    }
    for (const piece of chunkText(segment, max)) pieces.push({ segment: index, text: piece });
  });

  const chunks: SegmentChunk[] = [];
  let current: SegmentChunk | null = null;
  for (const piece of pieces) {
    const separator = current && current.text ? "\n\n" : "";
    if (current && current.text.length + separator.length + piece.text.length > max) {
      chunks.push(current);
      current = null;
    }
    if (!current) current = { text: "", parts: [] };
    const sep = current.text ? "\n\n" : "";
    const start = current.text.length + sep.length;
    current.text += sep + piece.text;
    current.parts.push({ segment: piece.segment, start, length: piece.text.length });
  }
  if (current) chunks.push(current);
  return chunks;
}

export function buildNarration(post: {
  title: string;
  authorName?: string | null;
  content: string;
}): NarrationScript {
  const chapters: Array<{ title: string; paragraphs: string[] }> = [];
  const author = post.authorName?.trim();
  const opening = asSentence(speakableInline(post.title)) + (author ? ` Written by ${author}.` : "");
  chapters.push({ title: INTRO_CHAPTER, paragraphs: [opening] });

  const current = () => chapters[chapters.length - 1]!;
  const add = (text: string) => {
    if (text) current().paragraphs.push(text);
  };

  const lines = post.content.replace(/\r\n?/g, "\n").split("\n");
  let inCode = false;
  let inFaq = false;
  let inTable = false;
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length > 0) add(asSentence(speakableInline(paragraph.join(" "))));
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (/^(```|~~~)/.test(line)) {
      flush();
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;

    const isTableRow = line.startsWith("|");
    if (inTable && !isTableRow) inTable = false;
    if (isTableRow) {
      if (!inTable) {
        flush();
        add(TABLE_NOTE);
        inTable = true;
      }
      continue;
    }

    if (/^\{\{faq\}\}$/i.test(line)) {
      flush();
      inFaq = true;
      if (current().title.toLowerCase() !== FAQ_CHAPTER.toLowerCase()) {
        chapters.push({ title: FAQ_CHAPTER, paragraphs: [`${FAQ_CHAPTER}.`] });
      }
      continue;
    }
    if (/^\{\{\/faq\}\}$/i.test(line)) {
      flush();
      inFaq = false;
      continue;
    }
    // Every other block marker ({{cta}}, {{toc}}, ...) is page furniture.
    if (/^\{\{[^}]*\}\}$/.test(line)) {
      flush();
      continue;
    }

    if (!line) {
      flush();
      continue;
    }

    if (inFaq) {
      flush();
      const qa = /^([QA]):\s*(.*)$/i.exec(line);
      add(asSentence(speakableInline(qa ? qa[2]! : line)));
      continue;
    }

    const heading = /^(#{1,6})\s+(.*?)\s*#*$/.exec(line);
    if (heading) {
      flush();
      const text = speakableInline(heading[2]!);
      if (!text) continue;
      if (heading[1]!.length === 2) {
        chapters.push({ title: text, paragraphs: [asSentence(text)] });
      } else {
        add(asSentence(text));
      }
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flush();
      continue;
    }

    const listItem = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (listItem) {
      flush();
      add(asSentence(speakableInline(listItem[1]!)));
      continue;
    }

    paragraph.push(line.replace(/^>\s?/, ""));
  }
  flush();

  const built: NarrationChapter[] = chapters
    .map((c) => {
      const segments = c.paragraphs.filter(Boolean);
      return { title: c.title, text: segments.join("\n\n"), segments };
    })
    // A heading with nothing under it still gets read, but an empty
    // chapter (no heading text at all) is dropped.
    .filter((c) => c.text.length > 0);

  const characters = built.reduce((sum, c) => sum + c.text.length, 0);
  const hash = createHash("sha256")
    // Title and text only: how the text is split into blocks is not part of
    // what is read, so it must not make stored audio look stale.
    .update(
      JSON.stringify({
        v: NARRATION_VERSION,
        chapters: built.map(({ title, text }) => ({ title, text })),
      }),
    )
    .digest("hex");
  return { chapters: built, characters, hash };
}

/** Number of bars in the player's waveform. */
export const WAVEFORM_BARS = 180;

/**
 * Loudness of 16-bit mono PCM in `bars` equal slices, scaled 0-100 against
 * the loudest slice. RMS rather than peak, so a single click doesn't flatten
 * the rest; a square-root curve so quiet speech is still visible.
 */
export function waveformPeaks(samples: Int16Array, bars: number = WAVEFORM_BARS): number[] {
  if (samples.length === 0 || bars <= 0) return [];
  const size = samples.length / bars;
  const rms: number[] = [];
  for (let b = 0; b < bars; b += 1) {
    const start = Math.floor(b * size);
    const end = Math.max(start + 1, Math.floor((b + 1) * size));
    let sum = 0;
    let n = 0;
    // Every 4th sample is plenty for a bar's loudness and 4x cheaper.
    for (let i = start; i < end && i < samples.length; i += 4) {
      const v = samples[i]! / 32768;
      sum += v * v;
      n += 1;
    }
    rms.push(n > 0 ? Math.sqrt(sum / n) : 0);
  }
  const max = Math.max(...rms);
  if (max <= 0) return rms.map(() => 0);
  return rms.map((v) => Math.round(Math.sqrt(v / max) * 100));
}
