/**
 * Where a signup came from: the first page a visitor landed on, the site
 * that sent them, and the last call to action they clicked before signing
 * up. Kept in two first-party cookies until the account exists, then stored
 * once per user (signup_attribution) and sent with the account_created
 * analytics event, so we can see which pages and buttons bring signups.
 *
 * Pure helpers here; the cookie writer and the dashboard reader use them.
 */

export const FIRST_TOUCH_COOKIE = "mk_src";
export const CTA_COOKIE = "mk_cta";
/** First touch is kept for 60 days; the CTA for a day (it only matters for the signup that follows). */
export const FIRST_TOUCH_MAX_AGE = 60 * 24 * 60 * 60;
export const CTA_MAX_AGE = 24 * 60 * 60;

export interface FirstTouch {
  /** Landing path, without query or fragment. */
  landing: string;
  /** Referring host, or "" for direct. */
  referrer: string;
}

const MAX = 120;

/** A same-site path, trimmed; anything odd becomes "/". */
export function cleanPath(path: string): string {
  const p = path.split(/[?#]/)[0] ?? "/";
  if (!p.startsWith("/") || p.startsWith("//")) return "/";
  return p.replace(/[^\w\-./]/g, "").slice(0, MAX) || "/";
}

/** The referring host, or "" when there is none or it is us. */
export function referrerHost(referrer: string, ownHost: string): string {
  try {
    const host = new URL(referrer).hostname.toLowerCase();
    if (!host || host === ownHost.toLowerCase() || host.endsWith(`.${ownHost.toLowerCase()}`)) return "";
    return host.slice(0, MAX);
  } catch {
    return "";
  }
}

/** A CTA placement label: lowercase words, digits, dashes and colons only. */
export function cleanPlacement(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value.toLowerCase().replace(/[^a-z0-9:_-]/g, "").slice(0, 60);
  return v || null;
}

export function encodeFirstTouch(t: FirstTouch): string {
  return encodeURIComponent(JSON.stringify({ l: t.landing, r: t.referrer }));
}

export function decodeFirstTouch(raw: string | undefined): FirstTouch | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as { l?: unknown; r?: unknown };
    if (typeof v.l !== "string") return null;
    return { landing: cleanPath(v.l), referrer: typeof v.r === "string" ? v.r.replace(/[^a-z0-9.-]/gi, "").slice(0, MAX) : "" };
  } catch {
    return null;
  }
}

/** Signed-in app pages are not landing pages. */
export function isAppPath(path: string): boolean {
  return /^\/(dashboard|api|connect|invite|r)(\/|$)/.test(path);
}

/* ----------------------------------------------------------------- UTM tags */

/** The last UTM-tagged visit before signup, kept 30 days. */
export const UTM_COOKIE = "mk_utm";
export const UTM_MAX_AGE = 30 * 24 * 60 * 60;

export const UTM_KEYS = ["source", "medium", "campaign", "content", "term"] as const;
export type UtmKey = (typeof UTM_KEYS)[number];
export type Utm = Partial<Record<UtmKey, string>>;

const UTM_MAX = 100;

/** A UTM value as stored: lowercase, trimmed, no characters that matter in HTML or SQL. */
export function cleanUtmValue(value: string | null | undefined): string | null {
  if (!value) return null;
  const v = value
    .toLowerCase()
    .replace(/[^a-z0-9 _.:/@+-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, UTM_MAX);
  return v || null;
}

/** The utm_* parameters of a query string, or null when there are none. */
export function parseUtm(search: string): Utm | null {
  let params: URLSearchParams;
  try {
    params = new URLSearchParams(search);
  } catch {
    return null;
  }
  const utm: Utm = {};
  for (const key of UTM_KEYS) {
    const v = cleanUtmValue(params.get(`utm_${key}`));
    if (v) utm[key] = v;
  }
  return Object.keys(utm).length > 0 ? utm : null;
}

export function encodeUtm(utm: Utm): string {
  return encodeURIComponent(JSON.stringify(utm));
}

export function decodeUtm(raw: string | undefined): Utm | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const utm: Utm = {};
    for (const key of UTM_KEYS) {
      const clean = typeof v[key] === "string" ? cleanUtmValue(v[key] as string) : null;
      if (clean) utm[key] = clean;
    }
    return Object.keys(utm).length > 0 ? utm : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------- pages and sections */

/** A short id for a page, for CTA placements: "/" -> "home", "/blog/x" -> "blog-x". */
export function pageSlug(path: string): string {
  const p = cleanPath(path).replace(/^\/+|\/+$/g, "");
  if (!p) return "home";
  return p.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "home";
}

/** A section id from its label or heading: "What you get" -> "what-you-get". */
export function sectionSlug(label: string): string {
  return (
    label
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40)
      .replace(/-+$/g, "") || "section"
  );
}

/**
 * The CTA placement recorded for a signup started from a page section:
 * "<page>:<section>", within cleanPlacement's 60 characters.
 */
export function ctaPlacement(path: string, section: string): string {
  const s = sectionSlug(section).slice(0, 18).replace(/-+$/g, "");
  const page = pageSlug(path).slice(0, 60 - s.length - 1).replace(/-+$/g, "");
  return `${page}:${s}`;
}

/** The kind of page, for grouping reports: "blog_post", "tool", "pricing"... */
export function pageTypeOf(path: string): string {
  const p = cleanPath(path);
  if (p === "/") return "home";
  if (p === "/blog") return "blog_index";
  if (p.startsWith("/blog/author/")) return "blog_author";
  if (p.startsWith("/blog/")) return "blog_post";
  if (p === "/tools") return "tools_index";
  if (p.startsWith("/tools/")) return "tool";
  if (p === "/pricing") return "pricing";
  if (p.startsWith("/docs")) return "docs";
  if (p.startsWith("/compare") || p.includes("-alternative") || p.includes("-vs-")) return "comparison";
  if (p === "/signup" || p === "/login") return "auth";
  return "page";
}
