import { attr } from "./html";
import { appliesToGoogle, extractRobotsMetas, hasNoindex, parseXRobotsTag } from "./noindex";

/**
 * Canonical analysis for the free Canonical Tag Checker.
 *
 * A page can declare its canonical URL in two places:
 *  - `<link rel="canonical" href="...">` in the HTML head
 *  - an HTTP `Link: <url>; rel="canonical"` response header
 *
 * Google ignores the hint when several different canonicals are declared, or
 * when the link element sits in the <body>. Everything here is pure; the
 * route does the (SSRF-guarded) fetching and passes the results in.
 */

export type IssueLevel = "error" | "warning" | "info";

export interface CanonicalIssue {
  level: IssueLevel;
  message: string;
}

export interface DeclaredCanonical {
  source: "html" | "header";
  /** The href exactly as written. */
  href: string;
  /** Absolute URL after resolving against the page (and any <base>), or null if unparseable. */
  resolved: string | null;
  relative: boolean;
  /** HTML only: the tag appears after <body>, where Google ignores it. */
  inBody: boolean;
}

export interface LinkHeaderEntry {
  url: string;
  /** Lowercased parameter names; values unquoted. */
  params: Record<string, string>;
}

/**
 * Parse an RFC 8288 `Link` header. Handles several links in one header,
 * quoted parameter values containing commas or semicolons, and commas inside
 * the `<...>` URL itself.
 */
export function parseLinkHeader(header: string | null): LinkHeaderEntry[] {
  if (!header) return [];
  const out: LinkHeaderEntry[] = [];
  let i = 0;
  const n = header.length;
  while (i < n) {
    const open = header.indexOf("<", i);
    if (open === -1) break;
    const close = header.indexOf(">", open + 1);
    if (close === -1) break;
    const url = header.slice(open + 1, close).trim();
    i = close + 1;

    // Read params up to the next top-level comma.
    let paramsRaw = "";
    let inQuotes = false;
    while (i < n) {
      const ch = header[i];
      if (ch === '"') inQuotes = !inQuotes;
      else if (ch === "," && !inQuotes) {
        i++;
        break;
      }
      paramsRaw += ch;
      i++;
    }

    const params: Record<string, string> = {};
    for (const m of paramsRaw.matchAll(/;\s*([a-z0-9*_-]+)\s*(?:=\s*("([^"]*)"|[^;,\s]+))?/gi)) {
      const key = m[1].toLowerCase();
      if (key in params) continue; // RFC 8288: first occurrence wins
      params[key] = m[3] ?? m[2] ?? "";
    }
    out.push({ url, params });
  }
  return out;
}

/** Does a rel value (space-separated list) include this relation? */
export function relIncludes(rel: string | null | undefined, name: string): boolean {
  return (rel ?? "").toLowerCase().split(/\s+/).includes(name);
}

/** Remove comments, scripts, styles and templates so their contents can't produce fake tags. */
export function stripNonMarkup(html: string): string {
  return html
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style|template|noscript)\b[\s\S]*?<\/\1\s*>/gi, "");
}

/** The URL relative links on this page resolve against: the first <base href>, else the page URL. */
export function documentBase(html: string, pageUrl: string): string {
  const tag = /<base\b[^>]*>/i.exec(html)?.[0];
  const href = tag ? attr(tag, "href") : null;
  if (href) {
    try {
      return new URL(href, pageUrl).href;
    } catch {
      /* fall through */
    }
  }
  return pageUrl;
}

export function isAbsoluteHttpUrl(href: string): boolean {
  return /^https?:\/\//i.test(href.trim());
}

export function resolveAgainst(href: string, base: string): string | null {
  const trimmed = href.trim();
  if (!trimmed) return null;
  try {
    const u = new URL(trimmed, base);
    return u.protocol === "http:" || u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

/** Every <link rel="canonical"> in the document, in source order. */
export function extractHtmlCanonicals(html: string, pageUrl: string): DeclaredCanonical[] {
  const clean = stripNonMarkup(html);
  const base = documentBase(clean, pageUrl);
  const bodyAt = clean.search(/<body\b/i);
  const out: DeclaredCanonical[] = [];
  for (const m of clean.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    if (!relIncludes(attr(tag, "rel"), "canonical")) continue;
    const href = attr(tag, "href") ?? "";
    out.push({
      source: "html",
      href,
      resolved: resolveAgainst(href, base),
      relative: href.trim() !== "" && !isAbsoluteHttpUrl(href),
      inBody: bodyAt !== -1 && (m.index ?? 0) > bodyAt,
    });
  }
  return out;
}

/** Canonicals declared in the HTTP Link header. */
export function extractHeaderCanonicals(linkHeader: string | null, pageUrl: string): DeclaredCanonical[] {
  return parseLinkHeader(linkHeader)
    .filter((l) => relIncludes(l.params.rel, "canonical"))
    .map((l) => ({
      source: "header" as const,
      href: l.url,
      resolved: resolveAgainst(l.url, pageUrl),
      relative: l.url.trim() !== "" && !isAbsoluteHttpUrl(l.url),
      inBody: false,
    }));
}

/** Compare URLs exactly, ignoring only the fragment (URL parsing already lowercases host and drops default ports). */
export function sameUrl(a: string, b: string): boolean {
  try {
    const x = new URL(a);
    const y = new URL(b);
    x.hash = "";
    y.hash = "";
    return x.href === y.href;
  } catch {
    return false;
  }
}

/** Same URL apart from a trailing slash on the path. */
export function differsOnlyByTrailingSlash(a: string, b: string): boolean {
  try {
    const x = new URL(a);
    const y = new URL(b);
    x.hash = "";
    y.hash = "";
    if (x.href === y.href) return false;
    const strip = (u: URL) => `${u.origin}${u.pathname.replace(/\/+$/, "")}${u.search}`;
    return strip(x) === strip(y);
  } catch {
    return false;
  }
}

/** Is the page told not to be indexed by Google (meta robots/googlebot or X-Robots-Tag)? */
export function isNoindex(html: string, xRobotsTag: string | null): boolean {
  return [...extractRobotsMetas(stripNonMarkup(html)), ...parseXRobotsTag(xRobotsTag)].some(
    (s) => appliesToGoogle(s) && hasNoindex(s.value),
  );
}

export type CanonicalVerdict = "self" | "other" | "missing" | "conflicting";

export interface CanonicalPageInput {
  url: string;
  finalUrl: string;
  httpStatus: number;
  redirectCount: number;
  html: string;
  linkHeader: string | null;
  xRobotsTag: string | null;
}

export interface CanonicalTargetFetch {
  /** The canonical URL we requested. */
  url: string;
  finalUrl: string | null;
  status: number | null;
  redirectCount: number;
  html: string;
  linkHeader: string | null;
  xRobotsTag: string | null;
  /** User-safe message when the fetch failed. */
  error: string | null;
}

export interface CanonicalTargetReport {
  url: string;
  finalUrl: string | null;
  status: number | null;
  redirectCount: number;
  noindex: boolean;
  /** The target's own canonical, resolved. */
  canonical: string | null;
  /** "self" when the target's canonical names itself, "elsewhere" for a chain, "missing" when it declares none. */
  canonicalState: "self" | "elsewhere" | "missing" | "unknown";
  error: string | null;
}

export interface CanonicalReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  redirectCount: number;
  verdict: CanonicalVerdict;
  /** The canonical this report is about (first HTML tag, else the header), resolved. */
  canonical: string | null;
  declared: DeclaredCanonical[];
  pageNoindex: boolean;
  target: CanonicalTargetReport | null;
  issues: CanonicalIssue[];
}

function declaredAll(input: CanonicalPageInput): DeclaredCanonical[] {
  return [
    ...extractHtmlCanonicals(input.html, input.finalUrl),
    ...extractHeaderCanonicals(input.linkHeader, input.finalUrl),
  ];
}

/** The canonical URL Google would most likely act on, before conflicts are considered. */
function primaryCanonical(declared: DeclaredCanonical[]): string | null {
  const usable = declared.filter((d) => d.resolved);
  const html = usable.find((d) => d.source === "html" && !d.inBody);
  return (html ?? usable.find((d) => d.source === "header") ?? usable[0])?.resolved ?? null;
}

/**
 * Which URL the route should fetch to check the canonical target, or null
 * when the canonical is missing or already names this page.
 */
export function canonicalTargetToCheck(input: CanonicalPageInput): string | null {
  const primary = primaryCanonical(declaredAll(input));
  if (!primary || sameUrl(primary, input.finalUrl)) return null;
  const u = new URL(primary);
  u.hash = "";
  return u.href;
}

function distinct(urls: string[]): string[] {
  const seen: string[] = [];
  for (const u of urls) if (!seen.some((s) => sameUrl(s, u))) seen.push(u);
  return seen;
}

export function analyzeTarget(t: CanonicalTargetFetch): CanonicalTargetReport {
  if (t.error || t.status === null || t.finalUrl === null) {
    return {
      url: t.url,
      finalUrl: t.finalUrl,
      status: t.status,
      redirectCount: t.redirectCount,
      noindex: false,
      canonical: null,
      canonicalState: "unknown",
      error: t.error ?? "We couldn't fetch the canonical URL.",
    };
  }
  const own = [
    ...extractHtmlCanonicals(t.html, t.finalUrl),
    ...extractHeaderCanonicals(t.linkHeader, t.finalUrl),
  ];
  const canonical = primaryCanonical(own);
  return {
    url: t.url,
    finalUrl: t.finalUrl,
    status: t.status,
    redirectCount: t.redirectCount,
    noindex: isNoindex(t.html, t.xRobotsTag),
    canonical,
    canonicalState: !canonical ? "missing" : sameUrl(canonical, t.finalUrl) ? "self" : "elsewhere",
    error: null,
  };
}

export function buildCanonicalReport(
  input: CanonicalPageInput,
  targetFetch: CanonicalTargetFetch | null,
): CanonicalReport {
  const declared = declaredAll(input);
  const issues: CanonicalIssue[] = [];
  const add = (level: IssueLevel, message: string) => issues.push({ level, message });

  const html = declared.filter((d) => d.source === "html");
  const header = declared.filter((d) => d.source === "header");
  const pageNoindex = isNoindex(input.html, input.xRobotsTag);

  if (input.httpStatus < 200 || input.httpStatus >= 300) {
    add("error", `This page returns HTTP ${input.httpStatus}. Google only uses canonical tags on pages that load successfully.`);
  }
  if (input.redirectCount > 0) {
    add("info", `The URL you entered redirected ${input.redirectCount === 1 ? "once" : `${input.redirectCount} times`}, so we checked the page it lands on: ${input.finalUrl}`);
  }

  // Malformed declarations.
  for (const d of declared) {
    const where = d.source === "html" ? "A canonical tag" : "The Link header canonical";
    if (!d.href.trim()) add("error", `${where} has an empty href, so it points nowhere.`);
    else if (!d.resolved) add("error", `${where} has an href that isn't a valid http(s) URL: "${d.href}".`);
    else if (d.relative) add("warning", `${where} uses a relative URL ("${d.href}"). It resolves to ${d.resolved}, but Google recommends absolute URLs to avoid mistakes.`);
    if (d.inBody) add("error", `A canonical tag sits inside the <body>. Google only reads rel="canonical" in the <head>, so this one is ignored.`);
  }

  // Multiple / conflicting declarations.
  const htmlUrls = distinct(html.flatMap((d) => (d.resolved ? [d.resolved] : [])));
  const headerUrls = distinct(header.flatMap((d) => (d.resolved ? [d.resolved] : [])));
  let conflicting = false;
  if (htmlUrls.length > 1) {
    conflicting = true;
    add("error", `The page has ${html.length} canonical tags pointing to ${htmlUrls.length} different URLs. When canonicals disagree, Google ignores all of them.`);
  } else if (html.length > 1) {
    add("warning", `The page has ${html.length} canonical tags. They agree, but duplicates usually mean a theme and a plugin both add one; keep a single tag.`);
  }
  if (headerUrls.length > 1) {
    conflicting = true;
    add("error", `The HTTP Link header declares ${headerUrls.length} different canonical URLs.`);
  }
  if (htmlUrls.length > 0 && headerUrls.length > 0 && !headerUrls.every((h) => htmlUrls.some((u) => sameUrl(u, h)))) {
    conflicting = true;
    add("error", `The HTTP Link header says the canonical is ${headerUrls[0]}, but the HTML says ${htmlUrls[0]}. Google may ignore both when they disagree.`);
  }

  const canonical = primaryCanonical(declared);
  const verdict: CanonicalVerdict = conflicting
    ? "conflicting"
    : !canonical
      ? "missing"
      : sameUrl(canonical, input.finalUrl)
        ? "self"
        : "other";

  if (verdict === "missing" && declared.length === 0) {
    add("warning", "No canonical found in the HTML or the HTTP headers. Google will choose a canonical itself, which may not be the URL you want.");
  }

  if (canonical) {
    const c = new URL(canonical);
    const page = new URL(input.finalUrl);
    if (c.protocol === "http:" && page.protocol === "https:") {
      add("error", "The canonical uses http:// while the page is served over https://. That points Google at the insecure version.");
    } else if (c.protocol !== page.protocol) {
      add("warning", `The canonical uses ${c.protocol}// but the page is served over ${page.protocol}//.`);
    }
    if (c.hostname !== page.hostname) {
      const www = c.hostname.replace(/^www\./, "") === page.hostname.replace(/^www\./, "");
      add(
        "warning",
        www
          ? `The canonical is on ${c.hostname} but the page is on ${page.hostname}. Make sure the www and non-www versions are consistent.`
          : `The canonical points to a different host (${c.hostname}). Cross-domain canonicals are allowed, but confirm that is intended.`,
      );
    }
    if (c.search) {
      add("warning", `The canonical includes a query string (${c.search}). That is fine if the parameter changes the content, but usually the canonical should be the clean URL.`);
    }
    if (c.hash) {
      add("warning", "The canonical includes a #fragment. Google ignores fragments, so leave it off.");
    }
    if (verdict === "other" && differsOnlyByTrailingSlash(canonical, input.finalUrl)) {
      add("warning", "The canonical differs from this URL only by a trailing slash. Google treats those as two different URLs, so pick one form and link to it everywhere.");
    }
    if (pageNoindex) {
      add("warning", "This page is also noindex. A noindex combined with a canonical sends mixed signals; use one or the other.");
    }
  }

  let target: CanonicalTargetReport | null = null;
  if (targetFetch && verdict !== "self" && canonical) {
    target = analyzeTarget(targetFetch);
    if (target.error) {
      add("warning", `We couldn't check the canonical URL: ${target.error}`);
    } else if (target.status !== null) {
      if (target.redirectCount > 0) {
        add("error", `The canonical URL redirects (to ${target.finalUrl}). A canonical should point straight at the final URL, not at a redirect.`);
      }
      if (target.status >= 400) {
        add("error", `The canonical URL returns HTTP ${target.status}. Google won't use a canonical that points at a broken page.`);
      } else if (target.status >= 300 || target.status < 200) {
        add("error", `The canonical URL returns HTTP ${target.status} instead of 200.`);
      }
      if (target.noindex) {
        add("error", "The canonical URL is noindex. You are telling Google to index that page and not to index it at the same time.");
      }
      if (target.canonicalState === "elsewhere" && target.canonical) {
        add(
          "error",
          sameUrl(target.canonical, input.finalUrl)
            ? "The canonical URL points its own canonical back at this page. That loop gives Google no clear answer; one of the two must name itself."
            : `The canonical URL declares its own canonical as ${target.canonical}. That is a canonical chain; point this page straight at the final URL.`,
        );
      }
    }
  }

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    redirectCount: input.redirectCount,
    verdict,
    canonical,
    declared,
    pageNoindex,
    target,
    issues,
  };
}
