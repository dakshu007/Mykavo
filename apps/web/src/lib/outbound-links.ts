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
