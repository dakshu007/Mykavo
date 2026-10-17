/**
 * Which pages analytics may see in full, and how private page URLs are
 * redacted before they reach Google Analytics. Pure, shared by the Google
 * Analytics and Microsoft Clarity loaders.
 *
 * Private pages carry secrets in their URL (client report, status page,
 * invite and unsubscribe tokens; connect handshakes in the query) or show
 * someone's own data. Clarity never records them; Google Analytics still
 * counts their product events, but only with a redacted page_location:
 * token segments become ":token" and the query string is dropped.
 */

/** Path prefixes whose URLs are private. */
export const PRIVATE_PATH_PREFIXES = [
  "/dashboard",
  "/r/",
  "/status/",
  "/invite",
  "/unsubscribe",
  "/login",
  "/signup",
  "/connect",
  "/shopify-app",
] as const;

/** Prefixes where every segment after the prefix is a secret token. */
const TOKEN_PATH_PREFIXES = ["/r", "/status", "/invite", "/unsubscribe"] as const;

function matchesPrefix(pathname: string, prefix: string): boolean {
  const bare = prefix.replace(/\/$/, "");
  return pathname === bare || pathname.startsWith(`${bare}/`);
}

/** Whether a path is private (see PRIVATE_PATH_PREFIXES). */
export function isPrivateAnalyticsPath(pathname: string): boolean {
  return PRIVATE_PATH_PREFIXES.some((p) => matchesPrefix(pathname, p));
}

/** A segment that looks like an id or token rather than a route name. */
function looksLikeToken(segment: string): boolean {
  if (segment.length > 32) return true;
  return segment.length >= 16 && /^[A-Za-z0-9_-]+$/.test(segment) && /\d/.test(segment);
}

/** The path with token segments replaced by ":token". */
export function redactPrivatePath(pathname: string): string {
  const tokenPrefix = TOKEN_PATH_PREFIXES.find((p) => matchesPrefix(pathname, p));
  const segments = pathname.split("/");
  return segments
    .map((segment, i) => {
      if (i === 0 || segment === "") return segment;
      if (tokenPrefix && i >= 2) return ":token";
      return looksLikeToken(segment) ? ":token" : segment;
    })
    .join("/");
}

/**
 * The page_location analytics may see for a page: unchanged for public
 * pages (UTM tags still count), redacted with no query or hash for private
 * ones.
 */
export function analyticsPageLocation(origin: string, pathname: string, search: string): string {
  if (isPrivateAnalyticsPath(pathname)) return `${origin}${redactPrivatePath(pathname)}`;
  const query = search.replace(/^\?/, "");
  return `${origin}${pathname}${query ? `?${query}` : ""}`;
}

/**
 * The page_referrer analytics may see: another site's URL as is, a page on
 * this site run through analyticsPageLocation (a link from a private page
 * must not leak its token as the next page's referrer).
 */
export function analyticsReferrer(referrer: string, origin: string): string {
  if (!referrer) return "";
  try {
    const url = new URL(referrer);
    if (url.origin !== origin) return referrer;
    return analyticsPageLocation(url.origin, url.pathname, url.search);
  } catch {
    return "";
  }
}
