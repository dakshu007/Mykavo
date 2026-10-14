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
