/**
 * Pages that only a signed-in person can see: an admin area, a sign-in or
 * account page. MyKavo's scanner never signs in, so on these it only ever sees
 * a login screen or "access denied" - and then reports that as a change on
 * every scan. Production: a Shopify store's /admin raised a CRITICAL "200 ->
 * 403" seven times in two days.
 *
 * New pages like these are refused when they're added (pages already
 * monitored keep working) and aren't offered by page discovery.
 */
const PRIVATE_SEGMENTS = new Set([
  "admin",
  "wp-admin",
  "wp-login.php",
  "login",
  "log-in",
  "signin",
  "sign-in",
  "logout",
  "account",
  "accounts",
  "my-account",
]);

/** True when the URL's path is an admin, sign-in or account page. */
export function isPrivatePage(url: URL | string): boolean {
  let path: string;
  try {
    path = (typeof url === "string" ? new URL(url) : url).pathname;
  } catch {
    return false;
  }
  return path
    .toLowerCase()
    .split("/")
    .some((segment) => PRIVATE_SEGMENTS.has(segment));
}

export function privatePageError(url: string): string {
  return `${url.slice(0, 100)} needs a sign-in, and MyKavo's scanner never signs in, so it would only ever see a login or "access denied" page. Monitor public pages instead.`;
}
