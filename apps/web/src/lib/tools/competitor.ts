/**
 * Side-by-side comparison of two pages for the free Competitor Analysis Tool.
 *
 * A monitoring tool cannot tell a first-time visitor what changed on a
 * stranger's site - there is no history for a URL we have never seen. What it
 * CAN do instantly is put your page next to theirs and show where each one
 * wins, which is the question people actually open a competitor tool to ask.
 *
 * Pure: takes two already-fetched snapshots and returns rows. All the
 * judgement lives here so it can be tested without the network.
 */

import type { PageToolSnapshot } from "./snapshot";

/** Who comes out ahead on a row. `info` = worth seeing, not a contest. */
export type Verdict = "you" | "them" | "tie" | "info";

export interface ComparisonRow {
  /** Grouping for the UI, and the reason the row is worth a reader's time. */
  group: "Search visibility" | "Speed and weight" | "Content" | "Technology";
  label: string;
  you: string;
  them: string;
  verdict: Verdict;
  /** Shown under the row when the result needs explaining. */
  note?: string;
}

export interface CompetitorReport {
  you: PageToolSnapshot;
  them: PageToolSnapshot;
  rows: ComparisonRow[];
  /** Rows you win, they win - a headline count, ignoring `info` rows. */
  score: { you: number; them: number; tie: number };
  /** Third-party services detected on their page but not yours. */
  theirExtraServices: string[];
  /** ...and the reverse. */
  yourExtraServices: string[];
}

const TITLE_IDEAL = { min: 30, max: 60 } as const;
const DESC_IDEAL = { min: 120, max: 160 } as const;

/** Lower is better, with a tolerance band so near-identical values tie. */
function lowerWins(a: number, b: number, tolerance = 0.1): Verdict {
  if (a === 0 && b === 0) return "tie";
  const larger = Math.max(a, b);
  if (larger === 0) return "tie";
  if (Math.abs(a - b) / larger <= tolerance) return "tie";
  return a < b ? "you" : "them";
}

function presence(a: boolean, b: boolean): Verdict {
  if (a === b) return "tie";
  return a ? "you" : "them";
}

function inBand(value: number, band: { min: number; max: number }): boolean {
  return value >= band.min && value <= band.max;
}

function kb(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString("en-US")} KB`;
}

function lengthLabel(text: string | null, band: { min: number; max: number }): string {
  if (!text) return "Missing";
  const n = text.length;
  if (n < band.min) return `${n} chars (short)`;
  if (n > band.max) return `${n} chars (long)`;
  return `${n} chars`;
}

function services(snapshot: PageToolSnapshot): string[] {
  return [
    ...new Set(
      snapshot.scripts
        .map((s) => s.service)
        .filter((s): s is string => s !== null),
    ),
  ].sort();
}

function isIndexable(snapshot: PageToolSnapshot): boolean {
  const robots = snapshot.robotsMeta?.toLowerCase() ?? "";
  return !robots.includes("noindex");
}

export function compareForCompetitor(
  you: PageToolSnapshot,
  them: PageToolSnapshot,
): CompetitorReport {
  const yourServices = services(you);
  const theirServices = services(them);

  const rows: ComparisonRow[] = [
    // ---------- Search visibility ----------
    {
      group: "Search visibility",
      label: "Title tag",
      you: lengthLabel(you.title, TITLE_IDEAL),
      them: lengthLabel(them.title, TITLE_IDEAL),
      verdict: presence(
        Boolean(you.title) && inBand(you.title?.length ?? 0, TITLE_IDEAL),
        Boolean(them.title) && inBand(them.title?.length ?? 0, TITLE_IDEAL),
      ),
      note: "Roughly 30-60 characters keeps the whole title visible in search results.",
    },
    {
      group: "Search visibility",
      label: "Meta description",
      you: lengthLabel(you.metaDescription, DESC_IDEAL),
      them: lengthLabel(them.metaDescription, DESC_IDEAL),
      verdict: presence(
        Boolean(you.metaDescription) && inBand(you.metaDescription?.length ?? 0, DESC_IDEAL),
        Boolean(them.metaDescription) && inBand(them.metaDescription?.length ?? 0, DESC_IDEAL),
      ),
    },
    {
      group: "Search visibility",
      label: "Indexable by Google",
      you: isIndexable(you) ? "Yes" : "No - noindex",
      them: isIndexable(them) ? "Yes" : "No - noindex",
      verdict: presence(isIndexable(you), isIndexable(them)),
    },
    {
      group: "Search visibility",
      label: "Canonical tag",
      you: you.canonicalUrl ? "Set" : "Missing",
      them: them.canonicalUrl ? "Set" : "Missing",
      verdict: presence(Boolean(you.canonicalUrl), Boolean(them.canonicalUrl)),
    },
    {
      group: "Search visibility",
      label: "Redirect hops",
      you: String(you.redirectChain.length),
      them: String(them.redirectChain.length),
      verdict: lowerWins(you.redirectChain.length, them.redirectChain.length, 0),
      note: "Every hop costs a little speed and link equity.",
    },

    // ---------- Speed and weight ----------
    {
      group: "Speed and weight",
      label: "Page weight (HTML)",
      you: kb(you.pageWeightBytes),
      them: kb(them.pageWeightBytes),
      verdict: lowerWins(you.pageWeightBytes, them.pageWeightBytes),
    },
    {
      group: "Speed and weight",
      label: "Server response",
      you: `${you.responseTimeMs} ms`,
      them: `${them.responseTimeMs} ms`,
      verdict: lowerWins(you.responseTimeMs, them.responseTimeMs, 0.2),
      note: "Measured from one request, so treat small gaps as noise.",
    },
    {
      group: "Speed and weight",
      label: "Third-party scripts",
      you: String(you.scripts.filter((s) => s.isThirdParty).length),
      them: String(them.scripts.filter((s) => s.isThirdParty).length),
      verdict: lowerWins(
        you.scripts.filter((s) => s.isThirdParty).length,
        them.scripts.filter((s) => s.isThirdParty).length,
        0,
      ),
      note: "Each third-party script is another request and another thing that can break.",
    },

    // ---------- Content ----------
    {
      group: "Content",
      label: "H1 heading",
      you: you.h1Values.length === 1 ? "1" : `${you.h1Values.length}`,
      them: them.h1Values.length === 1 ? "1" : `${them.h1Values.length}`,
      // Exactly one is the goal; zero and five are both wrong.
      verdict: presence(you.h1Values.length === 1, them.h1Values.length === 1),
    },
    {
      group: "Content",
      label: "Internal links",
      you: String(you.internalLinkCount),
      them: String(them.internalLinkCount),
      // More is not automatically better - it depends on the page's job - so
      // this is shown, not scored.
      verdict: "info",
    },
    {
      group: "Content",
      label: "Outbound links",
      you: String(you.externalLinkCount),
      them: String(them.externalLinkCount),
      verdict: "info",
    },

    // ---------- Technology ----------
    {
      group: "Technology",
      label: "Recognised services",
      you: yourServices.length > 0 ? yourServices.join(", ") : "None detected",
      them: theirServices.length > 0 ? theirServices.join(", ") : "None detected",
      verdict: "info",
      note: "Analytics, tag managers, chat and payment tools loaded on the page.",
    },
  ];

  const score = rows.reduce(
    (acc, row) => {
      if (row.verdict === "you") acc.you++;
      else if (row.verdict === "them") acc.them++;
      else if (row.verdict === "tie") acc.tie++;
      return acc;
    },
    { you: 0, them: 0, tie: 0 },
  );

  return {
    you,
    them,
    rows,
    score,
    theirExtraServices: theirServices.filter((s) => !yourServices.includes(s)),
    yourExtraServices: yourServices.filter((s) => !theirServices.includes(s)),
  };
}
