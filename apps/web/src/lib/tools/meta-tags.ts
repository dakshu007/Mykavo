/**
 * Meta tag extraction + checklist evaluation for the free Meta Tag Checker.
 * Pure module (no server-only imports) so the checklist logic is unit-testable
 * and can run in the client for rendering.
 */

import { attr, stripTags } from "./html";

export interface MetaTagExtraction {
  title: string | null;
  metaDescription: string | null;
  canonicalUrl: string | null;
  robotsMeta: string | null;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: string | null;
  h1Count: number;
  /** First 5 H1 values only. */
  h1Values: string[];
}

export interface MetaTagReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  tags: MetaTagExtraction;
}

export function extractMetaTags(html: string): MetaTagExtraction {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? stripTags(titleMatch[1]) || null : null;

  let metaDescription: string | null = null;
  let robotsMeta: string | null = null;
  let ogTitle: string | null = null;
  let ogDescription: string | null = null;
  let ogImage: string | null = null;

  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attr(tag, "name")?.toLowerCase();
    const property = attr(tag, "property")?.toLowerCase();
    if (name === "description" && metaDescription === null) {
      metaDescription = attr(tag, "content");
    } else if (name === "robots" && robotsMeta === null) {
      robotsMeta = attr(tag, "content");
    } else if (property === "og:title" && ogTitle === null) {
      ogTitle = attr(tag, "content");
    } else if (property === "og:description" && ogDescription === null) {
      ogDescription = attr(tag, "content");
    } else if (property === "og:image" && ogImage === null) {
      ogImage = attr(tag, "content");
    }
  }

  let canonicalUrl: string | null = null;
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    if (attr(tag, "rel")?.toLowerCase() === "canonical") {
      canonicalUrl = attr(tag, "href");
      break;
    }
  }

  const allH1s = (html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi) ?? [])
    .map((h) => stripTags(h.replace(/<\/?h1\b[^>]*>/gi, "")))
    .filter(Boolean);

  return {
    title,
    metaDescription,
    canonicalUrl,
    robotsMeta,
    ogTitle,
    ogDescription,
    ogImage,
    h1Count: allH1s.length,
    h1Values: allH1s.slice(0, 5),
  };
}

/* ---------- Checklist evaluation ---------- */

export type CheckStatus = "pass" | "warn" | "fail";

export interface MetaCheck {
  id: string;
  label: string;
  status: CheckStatus;
  /** Raw tag value shown to the user, null when absent. */
  value: string | null;
  /** Human guidance: what we found and why it matters. */
  detail: string;
}

export const TITLE_LENGTH = { min: 50, max: 60 } as const;
export const DESCRIPTION_LENGTH = { min: 120, max: 160 } as const;

export function evaluateTitle(title: string | null): MetaCheck {
  const base = { id: "title", label: "Title tag", value: title };
  if (!title) {
    return {
      ...base,
      status: "fail",
      detail: "Missing — every page needs a unique, descriptive title tag.",
    };
  }
  const len = title.length;
  if (len < TITLE_LENGTH.min) {
    return {
      ...base,
      status: "warn",
      detail: `${len} characters — shorter than the recommended ${TITLE_LENGTH.min}–${TITLE_LENGTH.max}. You may be leaving descriptive keywords on the table.`,
    };
  }
  if (len > TITLE_LENGTH.max) {
    return {
      ...base,
      status: "warn",
      detail: `${len} characters — longer than the recommended ${TITLE_LENGTH.min}–${TITLE_LENGTH.max}. Search engines may truncate it.`,
    };
  }
  return {
    ...base,
    status: "pass",
    detail: `${len} characters — within the recommended ${TITLE_LENGTH.min}–${TITLE_LENGTH.max}.`,
  };
}

export function evaluateMetaDescription(description: string | null): MetaCheck {
  const base = { id: "meta-description", label: "Meta description", value: description };
  if (!description) {
    return {
      ...base,
      status: "fail",
      detail: "Missing — search engines will improvise a snippet from page content.",
    };
  }
  const len = description.length;
  if (len < DESCRIPTION_LENGTH.min) {
    return {
      ...base,
      status: "warn",
      detail: `${len} characters — shorter than the recommended ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max}. There's room for a fuller, more clickable snippet.`,
    };
  }
  if (len > DESCRIPTION_LENGTH.max) {
    return {
      ...base,
      status: "warn",
      detail: `${len} characters — longer than the recommended ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max}. Search engines may truncate it.`,
    };
  }
  return {
    ...base,
    status: "pass",
    detail: `${len} characters — within the recommended ${DESCRIPTION_LENGTH.min}–${DESCRIPTION_LENGTH.max}.`,
  };
}

export function evaluateCanonical(canonicalUrl: string | null): MetaCheck {
  const base = { id: "canonical", label: "Canonical URL", value: canonicalUrl };
  if (!canonicalUrl) {
    return {
      ...base,
      status: "warn",
      detail: "No canonical URL — add one to protect against duplicate-content issues.",
    };
  }
  return { ...base, status: "pass", detail: "Canonical URL is set." };
}

export function evaluateRobotsMeta(robotsMeta: string | null): MetaCheck {
  const base = { id: "robots", label: "Robots meta", value: robotsMeta };
  if (!robotsMeta) {
    return {
      ...base,
      status: "pass",
      detail: "No robots meta tag — search engines default to index, follow.",
    };
  }
  if (/noindex/i.test(robotsMeta)) {
    return {
      ...base,
      status: "fail",
      detail:
        "Contains noindex — this page will be dropped from search results. Make absolutely sure that's intentional.",
    };
  }
  if (/nofollow/i.test(robotsMeta)) {
    return {
      ...base,
      status: "warn",
      detail: "Contains nofollow — links on this page won't pass authority.",
    };
  }
  return { ...base, status: "pass", detail: "Page is indexable." };
}

export function evaluateH1(h1Count: number, h1Values: string[]): MetaCheck {
  const base = {
    id: "h1",
    label: "H1 heading",
    value: h1Values.join(" · ") || null,
  };
  if (h1Count === 0) {
    return {
      ...base,
      status: "fail",
      detail: "No H1 heading found — every page should have one clear main heading.",
    };
  }
  if (h1Count > 1) {
    return {
      ...base,
      status: "warn",
      detail: `${h1Count} H1 headings found — most pages should have exactly one.`,
    };
  }
  return { ...base, status: "pass", detail: "Exactly one H1 heading." };
}

function evaluateOg(id: string, label: string, value: string | null, why: string): MetaCheck {
  if (!value) {
    return { id, label, status: "warn", value: null, detail: `Missing — ${why}` };
  }
  return { id, label, status: "pass", value, detail: "Present." };
}

/** Build the full ordered checklist for a page's extracted tags. */
export function buildMetaChecklist(tags: MetaTagExtraction): MetaCheck[] {
  return [
    evaluateTitle(tags.title),
    evaluateMetaDescription(tags.metaDescription),
    evaluateCanonical(tags.canonicalUrl),
    evaluateRobotsMeta(tags.robotsMeta),
    evaluateH1(tags.h1Count, tags.h1Values),
    evaluateOg(
      "og-title",
      "og:title",
      tags.ogTitle,
      "link previews on social and chat apps will fall back to whatever the platform scrapes.",
    ),
    evaluateOg(
      "og-description",
      "og:description",
      tags.ogDescription,
      "shared links will show no controlled description.",
    ),
    evaluateOg(
      "og-image",
      "og:image",
      tags.ogImage,
      "shared links will render without a preview image and get fewer clicks.",
    ),
  ];
}
