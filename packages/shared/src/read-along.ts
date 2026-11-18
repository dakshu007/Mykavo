/**
 * Read-along: the pure half of following blog narration on the page.
 *
 * The worker stores a timeline per narrated post: one entry per narrated
 * block (paragraph, list item, heading, FAQ question or answer, table note)
 * with the start time of every word. The browser maps each entry to the
 * element on the page that shows that block, and each spoken word to a word
 * in that element, then highlights the sentence and word being read.
 *
 * Everything here works on plain strings so it can be tested without a DOM
 * and imported by client components (no node: imports).
 */

/** Bump when the timeline shape changes; older rows are narrated again. */
export const TIMELINE_VERSION = 1;

export interface TimelineSegment {
  /** Chapter index. */
  c: number;
  /** The block's text exactly as it was spoken. */
  t: string;
  /** Start time of each word of `t` (split on whitespace), in ms. */
  w: number[];
}

/** The note read in place of a table (see blog-narration.ts). */
export const TABLE_NOTE_TEXT = "The full comparison table is in the article.";

/** Words as the narrator was given them: split on whitespace. */
export function spokenWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

/** Lowercase alphanumeric form of a word, for comparing spoken and shown text. */
export function normalizeWord(word: string): string {
  return word.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function normalizedWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

/** Index of the first word of each sentence. */
export function sentenceStarts(words: readonly string[]): number[] {
  const starts: number[] = [];
  let atStart = true;
  words.forEach((word, i) => {
    if (atStart) starts.push(i);
    atStart = /[.!?]["')\]]*$/.test(word);
  });
  return starts;
}

/** Last index whose value is <= target, or -1. `sorted` ascending. */
export function lastAtOrBefore(sorted: readonly number[], target: number): number {
  let lo = 0;
  let hi = sorted.length - 1;
  let found = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid]! <= target) {
      found = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return found;
}

export interface Candidate {
  /** The element's visible text. */
  text: string;
  /** "table" for tables; anything else otherwise. */
  kind: string;
}

/** Share of the segment's opening words that appear in the candidate. */
function similarity(segment: string, candidate: string): number {
  const opening = normalizedWords(segment).slice(0, 12);
  if (opening.length === 0) return 0;
  const words = new Set(normalizedWords(candidate));
  if (words.size === 0) return 0;
  let hits = 0;
  for (const w of opening) if (words.has(w)) hits += 1;
  return hits / opening.length;
}

/**
 * Matches each spoken segment to a candidate element, in reading order.
 * Both lists run in document order, so the search only moves forward and
 * looks a few elements ahead, which skips page furniture (CTAs, tools) that
 * was never read without jumping to a lookalike further down.
 */
export function matchSegments(
  segments: readonly string[],
  candidates: readonly Candidate[],
  window = 12,
  threshold = 0.6,
): Array<number | null> {
  const result: Array<number | null> = [];
  let next = 0;
  for (const segment of segments) {
    let best = -1;
    let bestScore = 0;
    const end = Math.min(candidates.length, next + window);
    for (let k = next; k < end; k += 1) {
      const candidate = candidates[k]!;
      const score =
        segment === TABLE_NOTE_TEXT
          ? candidate.kind === "table"
            ? 1
            : 0
          : candidate.kind === "table"
            ? 0
            : similarity(segment, candidate.text);
      if (score > bestScore) {
        best = k;
        bestScore = score;
        if (score === 1) break;
      }
    }
    if (best >= 0 && bestScore >= threshold) {
      result.push(best);
      next = best + 1;
    } else {
      result.push(null);
    }
  }
  return result;
}

/**
 * Maps each spoken word to a word shown on the page. Exact (normalised)
 * matches are found a few words ahead; a spoken word with no counterpart
 * (a price read as "a month", a dropped URL) stays on the current word, so
 * the highlight never runs ahead of the reading.
 */
export function alignWords(spoken: readonly string[], shown: readonly string[], lookahead = 4): number[] {
  const map: number[] = [];
  if (shown.length === 0) return spoken.map(() => 0);
  let pos = 0;
  for (const word of spoken) {
    const target = normalizeWord(word);
    let found = -1;
    if (target) {
      for (let q = pos; q < Math.min(shown.length, pos + lookahead); q += 1) {
        if (normalizeWord(shown[q]!) === target) {
          found = q;
          break;
        }
      }
    }
    if (found >= 0) {
      map.push(found);
      pos = found + 1;
    } else {
      map.push(Math.min(pos, shown.length - 1));
    }
  }
  return map;
}
