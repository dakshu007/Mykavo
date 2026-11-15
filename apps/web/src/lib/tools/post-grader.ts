/**
 * The SEO post grader on the AI Writer pages: deterministic checks of a
 * pasted draft (markdown or plain text) against the basics a post needs to
 * compete in search. Runs entirely in the browser; nothing is sent anywhere.
 *
 * A line starting with "# " is the title; without one, the first line is.
 * "## " / "### " lines are section headings. A heading containing "FAQ" or
 * "frequently asked", or three or more question headings, counts as an FAQ.
 */

export type CheckStatus = "pass" | "warn" | "fail";

export interface GradeCheck {
  id: string;
  label: string;
  status: CheckStatus;
  detail: string;
  /** Points this check is worth when it passes (warn earns half). */
  weight: number;
}

export interface Grade {
  score: number;
  words: number;
  checks: GradeCheck[];
}

const STOP = new Set(["a", "an", "the", "for", "to", "of", "in", "on", "and", "or", "with", "how", "what", "is", "are", "your", "my"]);

function terms(keyword: string): string[] {
  return keyword
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

/** True when every meaningful word of the keyword appears in the text. */
export function containsKeyword(text: string, keyword: string): boolean {
  const ts = terms(keyword);
  if (ts.length === 0) return false;
  const hay = ` ${text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ")} `;
  return ts.every((t) => hay.includes(` ${t} `) || hay.includes(` ${t}s `));
}

function words(text: string): number {
  return text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
}

export function gradePost(draft: string, keyword: string): Grade {
  const lines = draft.replace(/\r/g, "").split("\n");
  const nonEmpty = lines.map((l) => l.trim()).filter(Boolean);
  const h1Line = nonEmpty.find((l) => /^#\s+/.test(l));
  const title = (h1Line ?? nonEmpty[0] ?? "").replace(/^#+\s*/, "").trim();
  const headings = nonEmpty.filter((l) => /^#{2,3}\s+/.test(l)).map((l) => l.replace(/^#+\s*/, ""));
  const h2s = nonEmpty.filter((l) => /^##\s+/.test(l));
  const bodyLines = nonEmpty.filter((l) => !/^#{1,6}\s+/.test(l) && l !== title);
  const body = bodyLines.join("\n");
  const total = words(draft);
  const first = body.split(/\s+/).slice(0, 80).join(" ");
  const kw = keyword.trim();

  const paragraphs = draft
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^#{1,6}\s/.test(p) && !/^[-*]\s/.test(p));
  const longParas = paragraphs.filter((p) => words(p) > 120).length;
  const sentences = body.split(/(?<=[.!?])\s+/).filter((s) => words(s) > 2);
  const avgSentence = sentences.length ? sentences.reduce((n, s) => n + words(s), 0) / sentences.length : 0;
  const questionHeadings = headings.filter((h) => h.trim().endsWith("?")).length;
  const hasFaq = headings.some((h) => /\bfaq|frequently asked/i.test(h)) || questionHeadings >= 3 || /\{\{\s*faq\s*\}\}/i.test(draft);
  const links = (draft.match(/\[[^\]]+\]\([^)]+\)|https?:\/\/\S+/g) ?? []).length;
  const hasList = nonEmpty.some((l) => /^([-*]|\d+\.)\s+/.test(l));

  const checks: GradeCheck[] = [];
  const add = (id: string, label: string, status: CheckStatus, detail: string, weight: number) =>
    checks.push({ id, label, status, detail, weight });

  if (!kw) {
    add("keyword-title", "Keyword in the title", "warn", "Add the search you are targeting above to check this.", 14);
  } else {
    add(
      "keyword-title",
      "Keyword in the title",
      containsKeyword(title, kw) ? "pass" : "fail",
      containsKeyword(title, kw) ? "The title names the search you are targeting." : `Work "${kw}" into the title: it is the strongest relevance signal you control.`,
      14,
    );
  }

  const tl = title.length;
  add(
    "title-length",
    "Title length",
    tl >= 30 && tl <= 65 ? "pass" : tl === 0 ? "fail" : "warn",
    tl === 0 ? "No title found. Start the draft with a # Title line." : `${tl} characters. Aim for 30 to 65 so Google shows it in full.`,
    8,
  );

  if (kw) {
    const early = containsKeyword(first, kw);
    add(
      "short-answer",
      "Short answer up top",
      early ? "pass" : "warn",
      early ? "The opening answers the search early, the part AI answers and snippets quote." : "Answer the search in the first two or three sentences, using its words.",
      14,
    );
  } else {
    add("short-answer", "Short answer up top", "warn", "Add the target search to check the opening.", 14);
  }

  add(
    "sections",
    "Clear H2 sections",
    h2s.length >= 3 ? "pass" : h2s.length >= 1 ? "warn" : "fail",
    h2s.length >= 3 ? `${h2s.length} sections. Easy to scan and to match what page one covers.` : `${h2s.length} H2 sections. Use at least three "## " headings, one per question a reader has.`,
    12,
  );

  add(
    "length",
    "Enough depth",
    total >= 900 ? "pass" : total >= 500 ? "warn" : "fail",
    `${total} words. Most competitive posts need 900 or more to answer a search fully; match what ranks.`,
    12,
  );

  add(
    "faq",
    "FAQ section",
    hasFaq ? "pass" : "fail",
    hasFaq ? "Has an FAQ: follow-up questions answered, ready for FAQ markup." : "Add an FAQ with the follow-up questions people search, with short answers.",
    10,
  );

  add(
    "readability",
    "Readable sentences",
    avgSentence === 0 ? "warn" : avgSentence <= 22 ? "pass" : "warn",
    avgSentence === 0 ? "Not enough text to measure yet." : `About ${Math.round(avgSentence)} words per sentence. Under 22 reads easily.`,
    8,
  );

  add(
    "paragraphs",
    "Short paragraphs",
    longParas === 0 ? "pass" : "warn",
    longParas === 0 ? "No wall-of-text paragraphs." : `${longParas} paragraph${longParas === 1 ? "" : "s"} over 120 words. Split them up.`,
    6,
  );

  add(
    "links",
    "Links out and in",
    links >= 2 ? "pass" : links === 1 ? "warn" : "fail",
    links >= 2 ? `${links} links. Good for readers and for your other pages.` : "Link to your related pages and to the sources you cite.",
    8,
  );

  add(
    "lists",
    "Steps or lists",
    hasList ? "pass" : "warn",
    hasList ? "Uses a list: easy to scan and to quote." : "Turn steps or options into a list where it helps.",
    8,
  );

  const max = checks.reduce((n, c) => n + c.weight, 0);
  const got = checks.reduce((n, c) => n + (c.status === "pass" ? c.weight : c.status === "warn" ? c.weight / 2 : 0), 0);
  return { score: draft.trim() ? Math.round((got / max) * 100) : 0, words: total, checks };
}

/** A short sample so visitors can see the grader work without writing anything. */
export const SAMPLE_DRAFT = `# How to Speed Up WordPress
WordPress feels slow when pages are heavy, so start there.

## Install a cache plugin
A cache plugin stores pages so they load faster. Most hosts recommend one and it takes five minutes to set up, which makes it the easiest win on most WordPress sites that have never been tuned.

## Compress your images
Big images are the most common reason a page is slow. Resize them before upload and use a modern format.

Thanks for reading!`;
