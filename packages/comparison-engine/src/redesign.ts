/**
 * Redesign detection: telling "the page was edited" apart from "the page was
 * replaced".
 *
 * Each detector on its own sees only one side of a redesign - a big visual
 * difference, a new text hash, a new DOM hash - and each of those also fires
 * for ordinary edits, so none of them alone is allowed to shout. All of them
 * at once is different: the look, the words and the structure changed in the
 * same scan. That is a new theme, a rebuild, or someone else's page, and the
 * owner must hear about it whether or not they meant it.
 */

import type { ChangeSignal } from "@mykavo/severity-engine";

export interface RedesignEvidence {
  /** Row-aligned content difference (VisualDiffResult.contentDifferencePercentage). */
  contentPercentage: number;
  /** Raw positional pixel difference (VisualDiffResult.differencePercentage). */
  pixelPercentage: number;
  textChanged: boolean;
  domChanged: boolean;
}

/** Content difference that on its own reads as "most of the page is new". */
const REDESIGN_CONTENT = 40;
/** A lower content bar, accepted only when nearly every pixel moved as well. */
const REDESIGN_CONTENT_WITH_PIXELS = 20;
const REDESIGN_PIXELS = 50;

export function isPageRedesign(e: RedesignEvidence): boolean {
  const visuallyReplaced =
    e.contentPercentage >= REDESIGN_CONTENT ||
    (e.contentPercentage >= REDESIGN_CONTENT_WITH_PIXELS && e.pixelPercentage >= REDESIGN_PIXELS);
  // Words AND structure: markup alone churns on busy pages (a slider, a
  // rotating banner), and calling that a redesign would cheapen the label.
  // A rebuild that kept every word is still reported by the visual score.
  return visuallyReplaced && e.textChanged && e.domChanged;
}

/**
 * One site-wide headline when most compared pages were redesigned together,
 * or null. Needs at least two pages: a single-page site already gets its
 * per-page "Page redesigned" event, and a headline repeating it is noise.
 */
export function siteRedesignSignal(redesignedPages: number, comparedPages: number): ChangeSignal | null {
  if (redesignedPages < 2 || comparedPages === 0) return null;
  if (redesignedPages / comparedPages < 0.5) return null;
  return { kind: "site_redesign", pages: redesignedPages, total: comparedPages };
}
