/**
 * The AI Writer landing pages (/ai-blog-writer and its keyword cluster).
 * Every page is data rendered by components/ai-writer/writer-landing.tsx,
 * so all ten share one design and one set of facts, while each carries its
 * own copy, its own interactive tool and its own FAQ. Facts must match
 * config/ai-writer/facts.md; no invented numbers, no ranking promises.
 */

export type WriterWidgetKind = "topics" | "grader" | "anatomy";

export interface WriterHero {
  /** Letterspaced line inside the oval ring above the headline, e.g. "MyKavo AI Writer". */
  ring: string;
  /** Serif lead-in line above the giant words, e.g. "The AI". Reads straight into them. */
  pre?: string;
  /** Solid yellow giant word, e.g. "BLOG". */
  solid: string;
  /** Outlined giant word, e.g. "WRITER". */
  outline: string;
  /** Serif italic tagline under the giant words, set on the clouds, e.g. "built to rank." */
  accent: string;
  /** Draw solid + outline as one word with no gap, e.g. WORD + PRESS. */
  joined?: boolean;
  /** One or two sentences under the headline. */
  lede: string;
  /** Three short floating chips, true product facts. */
  chips: [string, string, string];
  /** Label of the main call to action. */
  cta: string;
}

export interface WriterSection {
  /** Anchor id (kebab-case), used for section tracking and deep links. */
  id: string;
  eyebrow: string;
  title: string;
  /** Paragraphs of plain text. Inline links are not supported; use `links`. */
  body: string[];
  bullets?: string[];
  /** Optional links shown under the section: same-site paths or https URLs. */
  links?: { label: string; href: string }[];
}

export interface WriterCompare {
  title: string;
  intro: string;
  /** Column headers: MyKavo first, then the comparison. */
  columns: [string, string];
  rows: { label: string; mykavo: string; other: string }[];
  /** Optional note under the table, e.g. where the other tool wins. */
  note?: string;
}

export interface WriterPage {
  /** Route, e.g. "/seo-blog-writer". */
  path: string;
  /** Short label for the cluster links between the pages. */
  navLabel: string;
  /** One-line summary for the cluster card. */
  navBlurb: string;
  primaryKeyword: string;
  metaTitle: string;
  metaDescription: string;
  keywords: string[];
  hero: WriterHero;
  /** The 45-70 word direct answer right under the hero (AEO capsule). */
  capsule: string;
  widget: { kind: WriterWidgetKind; title: string; intro: string };
  sections: WriterSection[];
  compare?: WriterCompare;
  faqs: { q: string; a: string }[];
  cta: { title: string; body: string };
  /** Paths of the cluster pages to feature in "Keep exploring". */
  related: string[];
  /** For comparison pages: where each competitor fact came from. */
  sources?: { label: string; url: string }[];
  /** For comparison pages: the date the competitor facts were checked, e.g. "November 15, 2026". */
  checkedOn?: string;
  /** Breadcrumb trail above the page title, e.g. [{ name: "Alternatives", path: "/alternatives" }]. */
  breadcrumb?: { name: string; path: string }[];
}
