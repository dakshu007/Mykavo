import {
  alignWords,
  lastAtOrBefore,
  matchSegments,
  sentenceStarts,
  spokenWords,
  type Candidate,
  type TimelineSegment,
} from "@mykavo/shared/read-along";

/**
 * Read-along: highlights the sentence and word being narrated, on the page
 * itself. Built once per page from the stored timeline (word start times per
 * narrated block); `update(ms)` is then cheap enough to call every frame.
 *
 * Highlighting uses the CSS Custom Highlight API, which paints ranges without
 * touching the DOM React renders. Browsers without it get a block-level
 * highlight through a data attribute instead.
 */

const BLOCKS = "p, li, h2, h3, h4, h5, h6, summary, table, blockquote";
const SENTENCE = "mk-read-sentence";
const WORD = "mk-read-word";

interface ShownWord {
  node: Text;
  start: number;
  end: number;
  text: string;
}

interface Mapped {
  el: HTMLElement;
  /** Spoken word i is shown as words[map[i]]. */
  map: number[];
  words: ShownWord[];
  sentences: number[];
}

function shownWords(el: HTMLElement): ShownWord[] {
  const words: ShownWord[] = [];
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
    acceptNode: (node) =>
      node.parentElement?.closest('[aria-hidden="true"]') ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT,
  });
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    for (const m of node.data.matchAll(/\S+/g)) {
      const start = m.index ?? 0;
      words.push({ node, start, end: start + m[0].length, text: m[0] });
    }
  }
  return words;
}

function collectCandidates(): HTMLElement[] {
  const title = document.querySelector<HTMLElement>("main h1");
  const body = document.querySelector<HTMLElement>("[data-post-body]");
  if (!body) return title ? [title] : [];
  const all = Array.from(body.querySelectorAll<HTMLElement>(BLOCKS)).filter(
    (el) => !el.closest('aside, [data-read-along="skip"]') && !el.parentElement?.closest("table"),
  );
  // The innermost blocks only: a list item that wraps a paragraph is read as
  // that paragraph.
  const set = new Set(all);
  const leaves = all.filter((el) => {
    if (el.tagName === "TABLE") return true;
    for (const other of el.querySelectorAll<HTMLElement>(BLOCKS)) if (set.has(other)) return false;
    return true;
  });
  return title ? [title, ...leaves] : leaves;
}

export interface ReadAlongPosition {
  segment: number;
  element: HTMLElement | null;
}

export class ReadAlong {
  private readonly starts: number[];
  private readonly mapped: Array<Mapped | null>;
  private readonly supportsHighlights: boolean;
  private lastKey = "";
  private lastEl: HTMLElement | null = null;

  constructor(private readonly segments: TimelineSegment[]) {
    this.starts = segments.map((s) => s.w[0] ?? Number.POSITIVE_INFINITY);
    this.supportsHighlights = typeof CSS !== "undefined" && "highlights" in CSS && typeof Highlight !== "undefined";

    const elements = collectCandidates();
    const candidates: Candidate[] = elements.map((el) => ({
      text: el.textContent ?? "",
      kind: el.tagName === "TABLE" ? "table" : el.tagName.toLowerCase(),
    }));
    const matches = matchSegments(
      segments.map((s) => s.t),
      candidates,
    );
    this.mapped = matches.map((k, i) => {
      if (k === null) return null;
      const el = elements[k]!;
      const spoken = spokenWords(segments[i]!.t);
      const words = el.tagName === "TABLE" ? [] : shownWords(el);
      return {
        el,
        words,
        map: alignWords(
          spoken,
          words.map((w) => w.text),
        ),
        sentences: sentenceStarts(spoken),
      };
    });
  }

  /** How many narrated blocks were found on the page. */
  get matchedCount(): number {
    return this.mapped.filter(Boolean).length;
  }

  /** Start time (ms) of the block shown by `el`, for click-to-listen. */
  timeForElement(el: Element): number | null {
    const i = this.mapped.findIndex((m) => m && (m.el === el || m.el.contains(el)));
    return i >= 0 ? (this.starts[i] ?? null) : null;
  }

  /** Highlights what is being read at `ms`; returns the active block. */
  update(ms: number): ReadAlongPosition {
    const i = lastAtOrBefore(this.starts, ms);
    const m = i >= 0 ? this.mapped[i] : null;
    if (i < 0 || !m) {
      this.paint(null, null, null);
      return { segment: i, element: null };
    }
    const seg = this.segments[i]!;
    const word = Math.max(0, lastAtOrBefore(seg.w, ms));
    const sentence = lastAtOrBefore(m.sentences, word);
    const sFrom = m.sentences[sentence] ?? 0;
    const sTo = (m.sentences[sentence + 1] ?? seg.w.length) - 1;

    const key = `${i}:${word}`;
    if (key !== this.lastKey) {
      this.lastKey = key;
      if (m.words.length > 0) {
        const a = m.words[m.map[sFrom] ?? 0]!;
        const b = m.words[Math.max(m.map[sFrom] ?? 0, m.map[sTo] ?? 0)]!;
        const w = m.words[m.map[word] ?? 0]!;
        this.paint(m.el, this.range(a, b), this.range(w, w));
      } else {
        this.paint(m.el, null, null);
      }
    }
    return { segment: i, element: m.el };
  }

  clear(): void {
    this.lastKey = "";
    this.paint(null, null, null);
  }

  private range(from: ShownWord, to: ShownWord): Range {
    const r = document.createRange();
    r.setStart(from.node, from.start);
    r.setEnd(to.node, to.end);
    return r;
  }

  private paint(el: HTMLElement | null, sentence: Range | null, word: Range | null): void {
    if (el !== this.lastEl) {
      this.lastEl?.removeAttribute("data-reading");
      if (el) {
        el.setAttribute("data-reading", "");
        // A FAQ answer lives in a collapsed <details>: open it when read.
        const details = el.closest("details");
        if (details && !details.open) details.open = true;
      }
      this.lastEl = el;
    }
    if (!this.supportsHighlights) return;
    if (sentence) CSS.highlights.set(SENTENCE, new Highlight(sentence));
    else CSS.highlights.delete(SENTENCE);
    if (word) CSS.highlights.set(WORD, new Highlight(word));
    else CSS.highlights.delete(WORD);
  }
}
