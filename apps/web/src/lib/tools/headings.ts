import { attr, stripTags } from "./html";

/**
 * Heading outline for the free Heading Structure Checker.
 *
 * Pure, regex-based reading of static HTML (no DOM), so it runs in tests and
 * on the server without a browser. Decisions worth knowing:
 *
 *  - Headings inside <script>, <style>, <template>, <noscript>, <textarea> and
 *    HTML comments are ignored. None of them are rendered as headings in a
 *    normal JavaScript-enabled browser, which is how Google renders pages.
 *  - Heading text is the tag's text content with nested markup stripped
 *    (`<h2><a><span>Pricing</span></a></h2>` reads as "Pricing"). A heading
 *    with no text but an <img alt> uses the alt text, as screen readers and
 *    Google do; only a heading with neither is reported as empty.
 *  - A heading tag that opens while another heading is still open closes the
 *    first one, matching how browsers repair `<h2>a<h3>b</h3></h2>`.
 *  - Only the HTML the server returns is read. Headings injected later by
 *    client-side JavaScript, or hidden with CSS, are not distinguished.
 */

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/** At most this many headings are returned in the outline. */
export const MAX_HEADINGS = 300;
/** Headings longer than this are flagged as worth tightening. */
export const LONG_HEADING_CHARS = 70;
/** Display cap for a single heading's text. */
const MAX_TEXT_CHARS = 300;

export interface HeadingItem {
  /** 0-based position in document order. */
  index: number;
  level: HeadingLevel;
  /** Visible text, or the image alt text when `fromAlt`; capped for display. */
  text: string;
  /** Full character length of the text before the display cap. */
  length: number;
  fromAlt: boolean;
  empty: boolean;
  tooLong: boolean;
  /** Set when this heading jumps more than one level deeper than the previous one. */
  skippedFrom: HeadingLevel | null;
}

export type HeadingIssueSeverity = "warn" | "info";

export interface HeadingIssue {
  id: "no-h1" | "multiple-h1" | "empty" | "skipped-level" | "long" | "no-headings";
  severity: HeadingIssueSeverity;
  message: string;
}

export type TitleH1Relation = "identical" | "different" | "no-title" | "no-h1" | "neither";

export interface HeadingsReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  title: string | null;
  firstH1: string | null;
  titleVsH1: TitleH1Relation;
  /** Count of headings per level across the whole page (not capped). */
  counts: Record<HeadingLevel, number>;
  total: number;
  /** True when the outline was cut at MAX_HEADINGS. */
  truncated: boolean;
  headings: HeadingItem[];
  issues: HeadingIssue[];
}

/** Regions whose contents are never rendered as page headings. */
const IGNORED_REGIONS = /<!--[\s\S]*?-->|<(script|style|template|noscript|textarea)\b[^>]*>[\s\S]*?<\/\1\s*>/gi;

export function stripIgnoredRegions(html: string): string {
  return html.replace(IGNORED_REGIONS, " ");
}

/** The document <title>, ignoring <title> elements inside inline SVGs. */
export function extractTitle(html: string): string | null {
  const cleaned = stripIgnoredRegions(html).replace(/<svg\b[\s\S]*?<\/svg\s*>/gi, " ");
  const m = /<title\b[^>]*>([\s\S]*?)<\/title\s*>/i.exec(cleaned);
  if (!m) return null;
  return stripTags(m[1]) || null;
}

interface RawHeading {
  level: HeadingLevel;
  inner: string;
}

/** Every h1-h6 in document order, with its raw inner HTML. */
function scanHeadings(html: string): RawHeading[] {
  const cleaned = stripIgnoredRegions(html);
  const tag = /<(\/?)h([1-6])\b[^>]*>/gi;
  const out: RawHeading[] = [];
  let open: { level: HeadingLevel; start: number } | null = null;

  for (let m = tag.exec(cleaned); m !== null; m = tag.exec(cleaned)) {
    if (open) {
      // Cap the slice so an unclosed heading can't drag in the whole page.
      out.push({ level: open.level, inner: cleaned.slice(open.start, Math.min(m.index, open.start + 5_000)) });
      open = null;
    }
    if (m[1] !== "/") {
      open = { level: Number(m[2]) as HeadingLevel, start: m.index + m[0].length };
    }
  }
  if (open) out.push({ level: open.level, inner: cleaned.slice(open.start, open.start + 5_000) });
  return out;
}

function headingText(inner: string): { text: string; fromAlt: boolean } {
  const text = stripTags(inner);
  if (text) return { text, fromAlt: false };
  for (const img of inner.match(/<img\b[^>]*>/gi) ?? []) {
    const alt = attr(img, "alt")?.trim();
    if (alt) return { text: alt, fromAlt: true };
  }
  return { text: "", fromAlt: false };
}

export function extractHeadings(html: string): { headings: HeadingItem[]; counts: Record<HeadingLevel, number>; total: number } {
  const counts: Record<HeadingLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  const headings: HeadingItem[] = [];
  let previous: HeadingLevel | null = null;
  const raw = scanHeadings(html);

  raw.forEach((h, index) => {
    counts[h.level] += 1;
    const skippedFrom = previous !== null && h.level > previous + 1 ? previous : null;
    previous = h.level;
    if (index >= MAX_HEADINGS) return;
    const { text, fromAlt } = headingText(h.inner);
    headings.push({
      index,
      level: h.level,
      text: text.length > MAX_TEXT_CHARS ? `${text.slice(0, MAX_TEXT_CHARS)}...` : text,
      length: text.length,
      fromAlt,
      empty: text.length === 0,
      tooLong: text.length > LONG_HEADING_CHARS,
      skippedFrom,
    });
  });

  return { headings, counts, total: raw.length };
}

function normalizeForCompare(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

export function buildHeadingIssues(
  headings: HeadingItem[],
  counts: Record<HeadingLevel, number>,
  total: number,
): HeadingIssue[] {
  const issues: HeadingIssue[] = [];
  if (total === 0) {
    issues.push({
      id: "no-headings",
      severity: "warn",
      message:
        "No headings found in the page HTML. If the content is built by JavaScript the headings may appear after rendering, but search engines and screen readers rely on them to understand the page.",
    });
    return issues;
  }

  if (counts[1] === 0) {
    issues.push({
      id: "no-h1",
      severity: "warn",
      message: "No H1 heading. One clear H1 that says what the page is about helps visitors, screen readers and search engines.",
    });
  } else if (counts[1] > 1) {
    issues.push({
      id: "multiple-h1",
      severity: "info",
      message: `${counts[1]} H1 headings. Google says several H1s are fine, so this is not an error. A single H1 is still the clearest signal of the page's main topic.`,
    });
  }

  // Per-heading checks use the outline (capped), which is where they are shown.
  const empty = headings.filter((h) => h.empty).length;
  if (empty > 0) {
    issues.push({
      id: "empty",
      severity: "warn",
      message: `${plural(empty, "empty heading", "empty headings")}. A heading tag with no text gives screen reader users a blank stop and tells search engines nothing.`,
    });
  }

  const skips = headings.filter((h) => h.skippedFrom !== null);
  if (skips.length > 0) {
    const examples = skips
      .slice(0, 3)
      .map((h) => `H${h.skippedFrom} to H${h.level}`)
      .join(", ");
    issues.push({
      id: "skipped-level",
      severity: "info",
      message: `${plural(skips.length, "skipped level", "skipped levels")} (${examples}${skips.length > 3 ? ", ..." : ""}). Going down more than one level at a time makes the outline harder to follow with assistive technology. It does not stop a page ranking.`,
    });
  }

  const long = headings.filter((h) => h.tooLong).length;
  if (long > 0) {
    issues.push({
      id: "long",
      severity: "info",
      message: `${plural(long, "heading is", "headings are")} longer than ${LONG_HEADING_CHARS} characters. Long headings are harder to scan; consider moving detail into the paragraph below.`,
    });
  }

  return issues;
}

export function compareTitleAndH1(title: string | null, h1: string | null): TitleH1Relation {
  if (!title && !h1) return "neither";
  if (!title) return "no-title";
  if (!h1) return "no-h1";
  return normalizeForCompare(title) === normalizeForCompare(h1) ? "identical" : "different";
}

export function buildHeadingsReport(input: {
  url: string;
  finalUrl: string;
  httpStatus: number;
  html: string;
}): HeadingsReport {
  const { headings, counts, total } = extractHeadings(input.html);
  const title = extractTitle(input.html);
  const firstH1 = headings.find((h) => h.level === 1 && !h.empty)?.text ?? null;
  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    title,
    firstH1,
    titleVsH1: compareTitleAndH1(title, firstH1),
    counts,
    total,
    truncated: total > headings.length,
    headings,
    issues: buildHeadingIssues(headings, counts, total),
  };
}
