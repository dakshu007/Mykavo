import { site } from "@/config/site";

/**
 * Link attributes for links inside blog content.
 *
 * Google's link-spam policy asks that links in guest posts and other
 * contributed content be qualified with rel="nofollow" - followed links that
 * a site did not editorially vouch for are what spam updates demote. So every
 * link that leaves mykavo.app from a post body or an author bio is
 * nofollowed (and opens in a new tab); links to our own pages stay normal.
 */
const OWN_HOSTS = new Set(["mykavo.app", "www.mykavo.app", new URL(site.url).host]);

export function isExternalHref(href: string | undefined): boolean {
  if (!href) return false;
  if (href.startsWith("/") || href.startsWith("#") || href.startsWith("?")) return false;
  try {
    const url = new URL(href);
    if (url.protocol === "mailto:" || url.protocol === "tel:") return false;
    return !OWN_HOSTS.has(url.host);
  } catch {
    // Not an absolute URL (a relative path like "pricing"): ours.
    return false;
  }
}

export const EXTERNAL_LINK_REL = "nofollow noopener noreferrer";

/**
 * Per-link nofollow override, like WordPress's "Mark as nofollow" box.
 *
 * Markdown links can't carry a rel attribute (raw HTML stays escaped), so the
 * editor stores the choice in the link's title, and only when it differs
 * from the default: `[text](https://site.com "dofollow")` keeps an external
 * link followed, `[text](/pricing "nofollow")` nofollows an internal one.
 * The marker never reaches the page as a tooltip.
 */
export type LinkFollowMarker = "nofollow" | "dofollow";

/** The marker a title holds, if it is one (case-insensitive). */
export function followMarker(title: string | null | undefined): LinkFollowMarker | null {
  const value = title?.trim().toLowerCase();
  return value === "nofollow" || value === "dofollow" ? value : null;
}

/** External links are nofollowed by default; links to our own pages are not. */
export function defaultNofollow(href: string | undefined): boolean {
  return isExternalHref(href);
}

/** Whether a link should be nofollowed, given its href and title. */
export function isNofollowLink(href: string | undefined, title: string | null | undefined): boolean {
  const marker = followMarker(title);
  if (marker === "nofollow") return true;
  if (marker === "dofollow") return false;
  return defaultNofollow(href);
}

/** The title to store for a nofollow choice: null when it matches the default. */
export function followTitleFor(href: string, nofollow: boolean): LinkFollowMarker | null {
  if (nofollow === defaultNofollow(href)) return null;
  return nofollow ? "nofollow" : "dofollow";
}
