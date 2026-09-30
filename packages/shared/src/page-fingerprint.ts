/**
 * Quick change checks between full scans.
 *
 * A full scan drives a real browser, takes screenshots and costs real money,
 * so it runs on the website's schedule - weekly on Free. A site relaunched
 * the day after its scan used to go unnoticed for six days. This module is
 * the cheap half of the fix: one plain HTTP GET per page, reduced to a
 * fingerprint of what a visitor would notice. When a fingerprint moves, the
 * worker runs a full scan straight away, and that full scan - with its
 * baselines, thresholds and severity rules - decides what gets reported.
 *
 * So a fingerprint only has to answer "did something real change since the
 * last check?", and it errs toward yes: a false yes costs one extra scan that
 * finds nothing; a false no is a redesign nobody hears about.
 *
 * Pure, no I/O: the worker fetches (through safeFetch) and stores.
 */

export interface PageFingerprint {
  /** HTTP status of the final response. */
  status: number;
  title: string;
  h1: string;
  canonical: string;
  robots: string;
  /** Stylesheet and script URLs, query strings dropped, sorted and unique. */
  assets: string[];
  /** Bottom-k sample of hashed 4-word shingles of the visible text, ascending. */
  shingles: number[];
  /** Visible word count. */
  words: number;
}

/** Shingles kept per page. Plenty for a similarity estimate, tiny in memory. */
const SHINGLE_SAMPLE = 512;
const SHINGLE_SIZE = 4;

function fnv1a(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

function clean(text: string): string {
  return decodeEntities(text.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}

/** Value of `name` in a tag's attribute string, or "". */
function attr(tag: string, name: string): string {
  const match = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeEntities(match[2] ?? match[3] ?? match[4] ?? "").trim() : "";
}

/** Host + path of an asset URL. Query strings are cache-busters, not changes. */
function assetKey(raw: string, pageUrl: string): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, pageUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return `${url.host}${url.pathname}`;
  } catch {
    return null;
  }
}

/**
 * Visible words, lowercased. Numbers collapse to "#" so a copyright year, a
 * stock count or a "3 hours ago" does not read as new content every check.
 */
function visibleWords(html: string): string[] {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const body = (bodyMatch ? bodyMatch[1] : html)
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ");
  return clean(body)
    .toLowerCase()
    .replace(/\d+([.,:]\d+)*/g, "#")
    .split(" ")
    .filter((w) => w.length > 0);
}

export function fingerprintPage(html: string, status: number, pageUrl: string): PageFingerprint {
  const head = html.slice(0, 200_000);
  const title = clean(head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  const h1 = clean(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");

  let canonical = "";
  let robots = "";
  const assets = new Set<string>();
  for (const tag of html.match(/<(link|meta|script)\b[^>]*>/gi) ?? []) {
    const name = tag.slice(1, tag.search(/[\s>]/)).toLowerCase();
    if (name === "link") {
      const rel = attr(tag, "rel").toLowerCase();
      if (rel.split(/\s+/).includes("canonical")) canonical = attr(tag, "href");
      if (rel.split(/\s+/).includes("stylesheet")) {
        const key = assetKey(attr(tag, "href"), pageUrl);
        if (key) assets.add(key);
      }
    } else if (name === "meta") {
      if (attr(tag, "name").toLowerCase() === "robots") robots = attr(tag, "content").toLowerCase();
    } else {
      const key = assetKey(attr(tag, "src"), pageUrl);
      if (key) assets.add(key);
    }
  }

  const words = visibleWords(html);
  const hashes = new Set<number>();
  if (words.length > 0 && words.length < SHINGLE_SIZE) hashes.add(fnv1a(words.join(" ")));
  for (let i = 0; i + SHINGLE_SIZE <= words.length; i++) {
    hashes.add(fnv1a(words.slice(i, i + SHINGLE_SIZE).join(" ")));
  }
  const shingles = [...hashes].sort((a, b) => a - b).slice(0, SHINGLE_SAMPLE);

  return {
    status,
    title,
    h1,
    canonical,
    robots,
    assets: [...assets].sort(),
    shingles,
    words: words.length,
  };
}

/**
 * Estimated Jaccard similarity of two bottom-k shingle samples: take the k
 * smallest hashes of the union and count how many both pages contain.
 */
export function textSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  const inA = new Set(a);
  const inB = new Set(b);
  // The k smallest hashes of the union of two bottom-k samples are exactly
  // the k smallest of the full union, so this is an unbiased estimate.
  const union = [...new Set([...a, ...b])].sort((x, y) => x - y).slice(0, SHINGLE_SAMPLE);
  const shared = union.filter((h) => inA.has(h) && inB.has(h)).length;
  return shared / union.length;
}

function jaccard(a: string[], b: string[]): number {
  if (a.length === 0 && b.length === 0) return 1;
  const setB = new Set(b);
  const shared = a.filter((x) => setB.has(x)).length;
  return shared / (a.length + b.length - shared);
}

function statusClass(status: number): "ok" | "client-error" | "server-error" {
  if (status >= 500) return "server-error";
  if (status >= 400) return "client-error";
  return "ok";
}

/** Below this share of shared text, the page's content materially changed. */
const TEXT_SIMILARITY_FLOOR = 0.8;
/** Below this share of shared assets, the theme or build was swapped. */
const ASSET_SIMILARITY_FLOOR = 0.5;
/** Pages this short are judged on title/headings/assets, not text sampling. */
const MIN_WORDS_FOR_TEXT = 20;

export interface FingerprintVerdict {
  changed: boolean;
  /** Human-readable reasons, for logs. Empty when unchanged. */
  reasons: string[];
}

export function compareFingerprints(previous: PageFingerprint, current: PageFingerprint): FingerprintVerdict {
  const reasons: string[] = [];
  if (statusClass(previous.status) !== statusClass(current.status)) {
    reasons.push(`HTTP ${previous.status} -> ${current.status}`);
  }
  if (previous.title !== current.title) reasons.push("title changed");
  if (previous.h1 !== current.h1) reasons.push("H1 changed");
  if (previous.canonical !== current.canonical) reasons.push("canonical changed");
  if (previous.robots !== current.robots) reasons.push("robots meta changed");

  if (previous.assets.length > 0 || current.assets.length > 0) {
    const assetSimilarity = jaccard(previous.assets, current.assets);
    if (assetSimilarity < ASSET_SIMILARITY_FLOOR) {
      reasons.push(`stylesheets/scripts replaced (${Math.round(assetSimilarity * 100)}% kept)`);
    }
  }

  const enoughText =
    previous.words >= MIN_WORDS_FOR_TEXT || current.words >= MIN_WORDS_FOR_TEXT;
  if (enoughText) {
    const similarity = textSimilarity(previous.shingles, current.shingles);
    if (similarity < TEXT_SIMILARITY_FLOOR) {
      reasons.push(`${Math.round((1 - similarity) * 100)}% of the text changed`);
    }
  }

  return { changed: reasons.length > 0, reasons };
}
