import { attr } from "./html";

/**
 * Indexability signals for the Noindex Checker. A page stays out of Google
 * if ANY of these say so:
 *
 *  - `<meta name="robots">` or `<meta name="googlebot">` with noindex/none
 *  - an `X-Robots-Tag` HTTP header with noindex/none, either unscoped or
 *    scoped to googlebot (`X-Robots-Tag: googlebot: noindex`)
 *  - a non-200 final status (404, 410, 5xx...)
 *
 * robots.txt blocking is reported separately: it stops Google from crawling
 * the page - and therefore from ever seeing a noindex on it - but a blocked
 * URL can still be indexed from links, so it is a warning, not a verdict.
 */

export interface RobotsDirectiveSource {
  source: "meta" | "header";
  /** "robots", "googlebot", or for headers "*" / "googlebot" / another bot. */
  agent: string;
  /** The raw directive list, e.g. "noindex, nofollow". */
  value: string;
}

/** Every robots/googlebot meta tag on the page (there can be several). */
export function extractRobotsMetas(html: string): RobotsDirectiveSource[] {
  const out: RobotsDirectiveSource[] = [];
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    const name = attr(tag, "name")?.toLowerCase();
    if (name !== "robots" && name !== "googlebot") continue;
    const content = attr(tag, "content");
    if (content !== null) out.push({ source: "meta", agent: name, value: content });
  }
  return out;
}

/**
 * Directives whose own value contains a colon - `max-snippet: 50` must not be
 * mistaken for a user-agent prefix like `googlebot: noindex`.
 */
const VALUED_DIRECTIVES = new Set([
  "max-snippet",
  "max-image-preview",
  "max-video-preview",
  "unavailable_after",
]);

/**
 * Split an X-Robots-Tag header value into per-agent directive lists.
 * `googlebot: noindex, nofollow` scopes everything after it to googlebot
 * until another agent prefix appears; unscoped directives apply to all ("*").
 * Multiple headers arrive joined with ", " by the fetch API, which this
 * handles the same way.
 */
export function parseXRobotsTag(header: string | null): RobotsDirectiveSource[] {
  if (!header) return [];
  const byAgent = new Map<string, string[]>();
  let agent = "*";
  for (const raw of header.split(",")) {
    let token = raw.trim();
    const m = /^([a-z0-9_-]+)\s*:\s*(.*)$/i.exec(token);
    if (m && !VALUED_DIRECTIVES.has(m[1].toLowerCase())) {
      agent = m[1].toLowerCase();
      token = m[2].trim();
    }
    if (!token) continue;
    byAgent.set(agent, [...(byAgent.get(agent) ?? []), token]);
  }
  return [...byAgent].map(([a, tokens]) => ({ source: "header" as const, agent: a, value: tokens.join(", ") }));
}

/** Does a directive list forbid indexing? ("none" = noindex, nofollow.) */
export function hasNoindex(value: string): boolean {
  return value
    .toLowerCase()
    .split(/[,\s]+/)
    .some((d) => d === "noindex" || d === "none");
}

/** Does this source apply to Googlebot? */
export function appliesToGoogle(s: RobotsDirectiveSource): boolean {
  return s.agent === "robots" || s.agent === "*" || s.agent === "googlebot";
}

export type IndexVerdict = "indexable" | "noindex" | "not-200";

export interface NoindexReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  redirectCount: number;
  verdict: IndexVerdict;
  /** Plain-English reasons, most important first. */
  reasons: string[];
  sources: Array<RobotsDirectiveSource & { blocksIndexing: boolean; appliesToGoogle: boolean }>;
  canonicalUrl: string | null;
  canonicalPointsElsewhere: boolean;
  robotsTxt: {
    checked: boolean;
    status: number | null;
    blocked: boolean;
    rule: string | null;
    note: string | null;
  };
}

export function readCanonical(html: string): string | null {
  for (const tag of html.match(/<link\b[^>]*>/gi) ?? []) {
    const rel = attr(tag, "rel")?.toLowerCase().split(/\s+/) ?? [];
    if (rel.includes("canonical")) return attr(tag, "href");
  }
  return null;
}

/** Same page, ignoring a trailing slash and the fragment. */
function samePage(a: string, b: string): boolean {
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

export function buildNoindexReport(input: {
  url: string;
  finalUrl: string;
  httpStatus: number;
  redirectCount: number;
  html: string;
  xRobotsTag: string | null;
  robotsTxt: NoindexReport["robotsTxt"];
}): NoindexReport {
  const raw = [...extractRobotsMetas(input.html), ...parseXRobotsTag(input.xRobotsTag)];
  const sources = raw.map((s) => ({
    ...s,
    blocksIndexing: hasNoindex(s.value),
    appliesToGoogle: appliesToGoogle(s),
  }));

  const reasons: string[] = [];
  const ok = input.httpStatus >= 200 && input.httpStatus < 300;
  if (!ok) reasons.push(`The page returns HTTP ${input.httpStatus}, so Google won't index it.`);
  for (const s of sources) {
    if (!s.blocksIndexing || !s.appliesToGoogle) continue;
    reasons.push(
      s.source === "meta"
        ? `A <meta name="${s.agent}"> tag says "${s.value}".`
        : `The X-Robots-Tag HTTP header${s.agent === "*" ? "" : ` for ${s.agent}`} says "${s.value}".`,
    );
  }

  const blockedByMetaOrHeader = sources.some((s) => s.blocksIndexing && s.appliesToGoogle);
  const verdict: IndexVerdict = !ok ? "not-200" : blockedByMetaOrHeader ? "noindex" : "indexable";

  const canonicalRaw = readCanonical(input.html);
  let canonicalUrl: string | null = null;
  if (canonicalRaw) {
    try {
      canonicalUrl = new URL(canonicalRaw, input.finalUrl).href;
    } catch {
      canonicalUrl = canonicalRaw;
    }
  }
  const canonicalPointsElsewhere = canonicalUrl !== null && !samePage(canonicalUrl, input.finalUrl);

  return {
    url: input.url,
    finalUrl: input.finalUrl,
    httpStatus: input.httpStatus,
    redirectCount: input.redirectCount,
    verdict,
    reasons,
    sources,
    canonicalUrl,
    canonicalPointsElsewhere,
    robotsTxt: input.robotsTxt,
  };
}
