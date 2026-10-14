/**
 * Links that carry a page someone just checked with a free tool straight
 * into monitoring it: sign up (or log in) and land on Add website with the
 * URL already filled in, instead of starting over.
 */

/** The checked page as http(s) origin + path, or null when it is not one. */
export function monitorableUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw.trim());
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    if (u.username || u.password) return null;
    return `${u.origin}${u.pathname === "/" ? "" : u.pathname}`;
  } catch {
    return null;
  }
}

/** "example.com" for display, without www. */
export function displayHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** Where to go after sign-up: Add website, prefilled. */
export function addWebsitePath(url: string): string {
  return `/dashboard/websites/new?url=${encodeURIComponent(url)}`;
}

export function signupHref({ url, from, google }: { url: string | null; from: string; google: boolean }): string {
  const q = new URLSearchParams();
  if (google) q.set("provider", "google");
  if (url) q.set("next", addWebsitePath(url));
  q.set("from", from);
  return `/signup?${q.toString()}`;
}
