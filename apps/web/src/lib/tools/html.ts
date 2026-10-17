/**
 * Minimal HTML helpers shared by the free tools.
 * Sufficient for static-HTML analysis; the production scanner (Phase 3)
 * uses Playwright + a real DOM.
 *
 * The HTML is attacker-controlled: anyone can point a free tool at a page
 * they wrote. Patterns such as `<!--[\s\S]*?-->` or `<script\b[^>]*>` are
 * quadratic when the closing half never comes ("<!--" repeated 200,000
 * times kept the event loop busy for minutes). So tags and elements are
 * found with the indexOf-based scanners below, which never look at a
 * character more than a fixed number of times, and every parser reads at
 * most MAX_PARSE_CHARS of the page (see capHtml).
 */

/**
 * The free tools analyse a page's first 512 K characters (~512 KB). Real
 * pages put their head, headings, links and tags well inside that; anything
 * past it is ignored rather than allowed to slow the server down.
 */
export const MAX_PARSE_CHARS = 512 * 1024;

/** The part of a page the free tools analyse: its first MAX_PARSE_CHARS. */
export function capHtml(html: string): string {
  return html.length > MAX_PARSE_CHARS ? html.slice(0, MAX_PARSE_CHARS) : html;
}

export function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Same result as `s.replace(/<[^>]*>/g, " ")`, in linear time: that regex
 * rescans to the end of the string from every "<" that has no ">" after it.
 */
function replaceTags(s: string): string {
  let out = "";
  let pos = 0;
  for (let lt = s.indexOf("<"); lt !== -1; lt = s.indexOf("<", pos)) {
    const gt = s.indexOf(">", lt + 1);
    if (gt === -1) break;
    out += `${s.slice(pos, lt)} `;
    pos = gt + 1;
  }
  return pos === 0 ? s : out + s.slice(pos);
}

export function stripTags(s: string): string {
  return decodeEntities(replaceTags(s)).replace(/\s+/g, " ").trim();
}

/** Read a single attribute value from a raw tag string. */
export function attr(tag: string, name: string): string | null {
  const m = tag.match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  if (!m) return null;
  return decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
}

/* ---------- Linear tag scanning ---------- */

/** Lowercase A-Z only, so every index still lines up with the original. */
export function lowerAscii(s: string): string {
  return s.replace(/[A-Z]+/g, (m) => m.toLowerCase());
}

/** Is the char at `i` a regex word character ([A-Za-z0-9_])? False past the end. */
function isWordChar(s: string, i: number): boolean {
  const c = s.charCodeAt(i);
  return (c >= 48 && c <= 57) || (c >= 65 && c <= 90) || (c >= 97 && c <= 122) || c === 95;
}

const WHITESPACE = /\s/;

/** The first listed name that starts at `at` (and ends on a word boundary when asked). */
function nameAt(lower: string, at: number, names: readonly string[], boundary: boolean, skip?: Set<string>): string | null {
  for (const name of names) {
    if (skip?.has(name) || !lower.startsWith(name, at)) continue;
    if (boundary && isWordChar(lower, at + name.length)) continue;
    return name;
  }
  return null;
}

export interface TagMatch {
  /** The matched name, as listed (lowercase), or the tag's own name for "any". */
  name: string;
  start: number;
  /** Index just past the closing ">". */
  end: number;
  /** The whole tag, e.g. `<link rel="canonical" href="/">`. */
  tag: string;
  /** Everything between the name and the closing ">". */
  attrs: string;
}

export interface FindTagsOptions {
  /** Require a word boundary after the name, like `\b` (default true). */
  boundary?: boolean;
  /** Stop after this many tags. */
  limit?: number;
}

const ANY_TAG_NAME = /[a-z][a-z0-9-]*\b/y;

/**
 * Open tags by name, in document order: the same matches as
 * `html.matchAll(/<(name1|name2)\b[^>]*>/gi)` in linear time. Names are
 * lowercase and may start with "/" for closing tags. "any" matches
 * `<[a-z][a-z0-9-]*\b[^>]*>`.
 */
export function findTags(html: string, names: readonly string[] | "any", opts: FindTagsOptions = {}): TagMatch[] {
  const lower = lowerAscii(html);
  const boundary = opts.boundary ?? true;
  const limit = opts.limit ?? Infinity;
  const out: TagMatch[] = [];
  let pos = 0;
  while (out.length < limit) {
    const lt = lower.indexOf("<", pos);
    if (lt === -1) break;
    pos = lt + 1;
    let name: string | null;
    if (names === "any") {
      ANY_TAG_NAME.lastIndex = lt + 1;
      name = ANY_TAG_NAME.exec(lower)?.[0] ?? null;
    } else {
      name = nameAt(lower, lt + 1, names, boundary);
    }
    if (name === null) continue;
    const nameEnd = lt + 1 + name.length;
    const gt = lower.indexOf(">", nameEnd);
    // No ">" anywhere after this point, so no later tag can close either.
    if (gt === -1) break;
    out.push({ name, start: lt, end: gt + 1, tag: html.slice(lt, gt + 1), attrs: html.slice(nameEnd, gt) });
    pos = gt + 1;
  }
  return out;
}

export interface Region {
  /** The element name, or "!--" for a comment. */
  name: string;
  start: number;
  end: number;
  /** Attribute text of the open tag ("" for comments and `open: "loose"`). */
  attrs: string;
  /** What sits between the open and the closing tag. */
  inner: string;
}

export interface FindRegionsOptions {
  /** Match `<!--[\s\S]*?-->` too, as an alternative ahead of the elements. */
  comments?: boolean;
  /** Element names, lowercase. */
  elements?: readonly string[];
  /**
   * "tag" (default): the open tag ends at the first ">" (`<name\b[^>]*>`).
   * "loose": anything may follow the name (`<name\b[\s\S]*?`).
   */
  open?: "tag" | "loose";
  /** Allow whitespace before the ">" of the closing tag (`<\/name\s*>`). Default true. */
  closeSpace?: boolean;
  /** Require a word boundary after the name in the open tag (default true). */
  boundary?: boolean;
  /** Stop after this many regions. */
  limit?: number;
}

/** The first `</name\s*>` (or `</name>`) at or after `from`. */
function findClose(lower: string, name: string, from: number, closeSpace: boolean): { start: number; end: number } | null {
  const needle = `</${name}`;
  for (let i = lower.indexOf(needle, from); i !== -1; i = lower.indexOf(needle, i + 1)) {
    let j = i + needle.length;
    if (closeSpace) while (j < lower.length && WHITESPACE.test(lower[j])) j++;
    if (lower[j] === ">") return { start: i, end: j + 1 };
  }
  return null;
}

/**
 * Comments and whole elements, leftmost first and non-overlapping: the same
 * matches as e.g. `/<!--[\s\S]*?-->|<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi`,
 * in linear time. When an element has no closing tag anywhere after it, no
 * later element of that name can have one either, so the name is dropped
 * instead of being searched for again from every later open tag.
 */
export function findRegions(html: string, opts: FindRegionsOptions): Region[] {
  const lower = lowerAscii(html);
  const elements = opts.elements ?? [];
  const loose = opts.open === "loose";
  const closeSpace = opts.closeSpace ?? true;
  const boundary = opts.boundary ?? true;
  const limit = opts.limit ?? Infinity;
  const dead = new Set<string>();
  let comments = opts.comments ?? false;
  const out: Region[] = [];
  let pos = 0;
  while (out.length < limit && (comments || dead.size < elements.length)) {
    const lt = lower.indexOf("<", pos);
    if (lt === -1) break;
    pos = lt + 1;
    if (comments && lower.startsWith("<!--", lt)) {
      const close = lower.indexOf("-->", lt + 4);
      if (close === -1) {
        comments = false;
        continue;
      }
      out.push({ name: "!--", start: lt, end: close + 3, attrs: "", inner: html.slice(lt + 4, close) });
      pos = close + 3;
      continue;
    }
    const name = nameAt(lower, lt + 1, elements, boundary, dead);
    if (name === null) continue;
    const nameEnd = lt + 1 + name.length;
    let contentStart = nameEnd;
    let attrs = "";
    if (!loose) {
      const gt = lower.indexOf(">", nameEnd);
      // No ">" left: neither an open tag nor a "-->" can complete from here.
      if (gt === -1) break;
      attrs = html.slice(nameEnd, gt);
      contentStart = gt + 1;
    }
    const close = findClose(lower, name, contentStart, closeSpace);
    if (!close) {
      dead.add(name);
      continue;
    }
    out.push({ name, start: lt, end: close.end, attrs, inner: html.slice(contentStart, close.start) });
    pos = close.end;
  }
  return out;
}

/** `html` with every region replaced by `replacement`. Regions must be in order and disjoint. */
export function replaceRegions(html: string, regions: readonly { start: number; end: number }[], replacement: string): string {
  if (regions.length === 0) return html;
  let out = "";
  let pos = 0;
  for (const r of regions) {
    out += html.slice(pos, r.start) + replacement;
    pos = r.end;
  }
  return out + html.slice(pos);
}

/** `html` with the comments/elements described by `opts` replaced by `replacement`. */
export function removeRegions(html: string, opts: FindRegionsOptions, replacement: string): string {
  return replaceRegions(html, findRegions(html, opts), replacement);
}
