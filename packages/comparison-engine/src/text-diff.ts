/**
 * Exact text changes: which lines of visible text were removed and added
 * between the approved baseline and the current scan.
 *
 * Matched as a multiset, not by position: a line counts as unchanged when it
 * still appears anywhere on the page. That keeps the answer to "what words
 * changed?" short and honest - a paragraph inserted at the top does not
 * report every line below it as moved. Pure order changes come back as
 * `reordered` with nothing added or removed.
 */

export interface TextDiff {
  /** Lines in the baseline that are gone, in baseline order (capped). */
  removed: string[];
  /** Lines that are new, in current order (capped). */
  added: string[];
  /** Totals before the cap. */
  removedCount: number;
  addedCount: number;
  /** The same lines, in a different order. */
  reordered: boolean;
}

/** Lines kept per side: enough to understand the change, small enough for a JSON column. */
export const TEXT_DIFF_MAX_LINES = 40;
const MAX_LINE_CHARS = 300;

function clipLine(line: string, max: number): string {
  return line.length > max ? `${line.slice(0, max - 3)}...` : line;
}

function unmatched(from: readonly string[], against: readonly string[]): string[] {
  const remaining = new Map<string, number>();
  for (const line of against) remaining.set(line, (remaining.get(line) ?? 0) + 1);
  const out: string[] = [];
  for (const line of from) {
    const left = remaining.get(line) ?? 0;
    if (left > 0) remaining.set(line, left - 1);
    else out.push(line);
  }
  return out;
}

export function diffTextLines(
  before: readonly string[],
  after: readonly string[],
  maxLines = TEXT_DIFF_MAX_LINES,
): TextDiff {
  const removed = unmatched(before, after);
  const added = unmatched(after, before);
  const sameLines = removed.length === 0 && added.length === 0;
  const reordered = sameLines && before.some((line, i) => line !== after[i]);
  return {
    removed: removed.slice(0, maxLines).map((l) => clipLine(l, MAX_LINE_CHARS)),
    added: added.slice(0, maxLines).map((l) => clipLine(l, MAX_LINE_CHARS)),
    removedCount: removed.length,
    addedCount: added.length,
    reordered,
  };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

/** One sentence for the change description, alert emails and lists. */
export function describeTextDiff(diff: TextDiff): string {
  if (diff.removedCount === 0 && diff.addedCount === 0) {
    return diff.reordered
      ? "The same text is on the page, in a different order."
      : "The visible text content of the page changed.";
  }
  if (diff.removedCount === 1 && diff.addedCount === 1) {
    return `"${clipLine(diff.removed[0], 120)}" was replaced with "${clipLine(diff.added[0], 120)}".`;
  }
  const parts: string[] = [];
  if (diff.removedCount > 0) parts.push(`${plural(diff.removedCount, "line")} removed`);
  if (diff.addedCount > 0) parts.push(`${plural(diff.addedCount, "line")} added`);
  const sample = diff.added[0] ?? diff.removed[0];
  const lead = diff.added[0] ? "New text includes" : "Removed text includes";
  return `${parts.join(", ")}. ${lead} "${clipLine(sample, 120)}".`;
}
