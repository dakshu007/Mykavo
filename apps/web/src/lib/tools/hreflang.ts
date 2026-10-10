import { attr } from "./html";

/**
 * Hreflang checks for the Hreflang Checker.
 *
 * Google's rules, which this follows:
 *  - Each value is "x-default" or a language code (ISO 639-1), optionally
 *    followed by a region (ISO 3166-1 alpha-2): "en", "en-GB", "pt-BR".
 *    A script subtag ("zh-Hant") is also accepted. Case doesn't matter.
 *  - A region on its own ("us") is not valid, nor is "en-UK" (the code for
 *    the United Kingdom is GB), nor an underscore ("en_US").
 *  - Every page in a set should list itself and every alternate, and each
 *    alternate must link back - otherwise Google may ignore the annotations.
 *
 * Language and region names come from the runtime's built-in Intl data
 * (CLDR), so there's no hand-kept code list to drift out of date.
 */

export interface HreflangLink {
  hreflang: string;
  href: string;
  source: "html" | "header";
}

/** <link rel="alternate" hreflang="..." href="..."> tags in the HTML. */
export function extractHreflangLinks(html: string): HreflangLink[] {
  const out: HreflangLink[] = [];
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    const hreflang = attr(tag, "hreflang");
    const href = attr(tag, "href");
    if (rel.includes("alternate") && hreflang && href) {
      out.push({ hreflang: hreflang.trim(), href: href.trim(), source: "html" });
    }
  }
  return out;
}

/**
 * Hreflang entries in an HTTP Link header:
 * `<https://e.com/de/>; rel="alternate"; hreflang="de", <...>; ...`
 */
export function parseLinkHeaderHreflang(header: string | null): HreflangLink[] {
  if (!header) return [];
  const out: HreflangLink[] = [];
  for (const part of header.split(/,(?=\s*<)/)) {
    const m = /^\s*<([^>]+)>(.*)$/.exec(part);
    if (!m) continue;
    const params = m[2];
    const rel = /;\s*rel\s*=\s*"?([^";]+)"?/i.exec(params)?.[1]?.toLowerCase() ?? "";
    const hreflang = /;\s*hreflang\s*=\s*"?([^";]+)"?/i.exec(params)?.[1];
    if (rel.split(/\s+/).includes("alternate") && hreflang) {
      out.push({ hreflang: hreflang.trim(), href: m[1].trim(), source: "header" });
    }
  }
  return out;
}

const languageNames = new Intl.DisplayNames(["en"], { type: "language", fallback: "none" });
const regionNames = new Intl.DisplayNames(["en"], { type: "region", fallback: "none" });

export interface CodeCheck {
  code: string;
  valid: boolean;
  /** "English (United Kingdom)" for a valid code. */
  label: string | null;
  problem: string | null;
}

/** Validate one hreflang value against Google's accepted format. */
export function checkHreflangCode(raw: string): CodeCheck {
  const code = raw.trim();
  if (code.toLowerCase() === "x-default") {
    return { code, valid: true, label: "Default (any other language or region)", problem: null };
  }
  if (code.includes("_")) {
    return { code, valid: false, label: null, problem: `Use a hyphen, not an underscore: "${code.replace(/_/g, "-")}".` };
  }
  const parts = code.split("-");
  const lang = parts[0]?.toLowerCase() ?? "";
  if (!/^[a-z]{2}$/.test(lang)) {
    const regionOnly = /^[a-z]{2}$/i.test(code) && regionNames.of(code.toUpperCase()) && !languageNames.of(code.toLowerCase());
    return {
      code,
      valid: false,
      label: null,
      problem: regionOnly
        ? `"${code}" looks like a country. Hreflang needs a language first, e.g. "en-${code.toUpperCase()}".`
        : `"${lang}" isn't a two-letter ISO 639-1 language code.`,
    };
  }
  const langName = languageNames.of(lang);
  if (!langName) {
    const asRegion = regionNames.of(lang.toUpperCase());
    return {
      code,
      valid: false,
      label: null,
      problem: asRegion
        ? `"${lang}" is a country code (${asRegion}), not a language. Hreflang needs a language first.`
        : `"${lang}" isn't a recognised language code.`,
    };
  }

  let script: string | null = null;
  let region: string | null = null;
  for (const sub of parts.slice(1)) {
    if (/^[a-z]{4}$/i.test(sub) && !script && !region) script = sub;
    else if (/^[a-z]{2}$/i.test(sub) && !region) region = sub.toUpperCase();
    else return { code, valid: false, label: null, problem: `"${sub}" isn't a valid region or script part of "${code}".` };
  }

  if (region === "UK") {
    return { code, valid: false, label: null, problem: `The United Kingdom's code is GB: use "${lang}-GB", not "${code}".` };
  }
  let regionName: string | null = null;
  if (region) {
    regionName = regionNames.of(region) ?? null;
    if (!regionName) {
      return { code, valid: false, label: null, problem: `"${region}" isn't an ISO 3166-1 country code.` };
    }
  }
  const scriptLabel = script ? languageNames.of(`${lang}-${script}`) : null;
  const base = scriptLabel ?? langName;
  return { code, valid: true, label: regionName ? `${base} (${regionName})` : base, problem: null };
}

/** Compare URLs ignoring the fragment and a trailing slash. */
export function sameUrl(a: string, b: string): boolean {
  const norm = (u: string) => {
    const x = new URL(u);
    x.hash = "";
    return x.href.replace(/\/$/, "");
  };
  try {
    return norm(a) === norm(b);
  } catch {
    return false;
  }
}

export interface AlternateCheck {
  hreflang: string;
  href: string;
  code: CodeCheck;
  /** The entry pointing at the checked page itself. */
  self: boolean;
  /** Filled in when the alternate was fetched. */
  fetched: boolean;
  status: number | null;
  finalUrl: string | null;
  redirected: boolean;
  returnLink: boolean | null;
  noindex: boolean | null;
  canonicalElsewhere: boolean | null;
  error: string | null;
}

export interface HreflangReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  alternates: AlternateCheck[];
  issues: string[];
  notes: string[];
  /** Alternates beyond the fetch cap were listed but not fetched. */
  unfetchedCount: number;
}

export const MAX_ALTERNATES_FETCHED = 15;

/**
 * Page-level findings from the set of annotations alone (before any of the
 * alternates are fetched): self-reference, x-default, duplicates, relative
 * URLs, and codes that don't validate.
 */
export function pageLevelIssues(
  links: HreflangLink[],
  finalUrl: string,
): { issues: string[]; notes: string[] } {
  const issues: string[] = [];
  const notes: string[] = [];
  if (links.length === 0) return { issues, notes };

  const seen = new Map<string, string>();
  for (const l of links) {
    const key = l.hreflang.toLowerCase();
    const prev = seen.get(key);
    if (prev !== undefined && !sameUrl(prev, l.href)) {
      issues.push(`"${l.hreflang}" points to two different URLs. Each code should appear once.`);
    }
    seen.set(key, l.href);
    if (!/^https?:\/\//i.test(l.href)) {
      notes.push(`"${l.hreflang}" uses a relative URL (${l.href}). Google recommends fully qualified URLs.`);
    }
  }

  const resolved = links.map((l) => {
    try {
      return new URL(l.href, finalUrl).href;
    } catch {
      return l.href;
    }
  });
  if (!resolved.some((u) => sameUrl(u, finalUrl))) {
    issues.push("The page doesn't list itself. Each page in a set should include an hreflang entry pointing to its own URL.");
  }
  if (!seen.has("x-default")) {
    notes.push('No "x-default" entry. It\'s optional, but tells Google which page to show visitors whose language you don\'t target.');
  }
  for (const l of links) {
    const c = checkHreflangCode(l.hreflang);
    if (!c.valid && c.problem) issues.push(c.problem);
    else if (c.valid && l.hreflang !== l.hreflang.toLowerCase() && !/^[a-z]{2}(-[A-Z][a-z]{3})?(-[A-Z]{2})?$/.test(l.hreflang)) {
      notes.push(`"${l.hreflang}" is valid; case doesn't matter, though "${l.hreflang.split("-")[0].toLowerCase()}" + an upper-case region is the usual style.`);
    }
  }
  return { issues: [...new Set(issues)], notes: [...new Set(notes)] };
}
