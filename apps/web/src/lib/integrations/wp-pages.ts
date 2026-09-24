/**
 * Pages a connected WordPress site asks MyKavo to monitor ("Monitor with
 * MyKavo", the Pages tab, the WooCommerce store guard). Pure so the rules are
 * testable: pages of the website's own site only, normalized, and never a
 * page that is already monitored.
 *
 * WordPress often reports its address slightly differently from the website
 * saved in MyKavo (http behind a proxy, www or not). The same host up to a
 * leading "www." counts as the same site, and the page is rebuilt on the
 * website's own origin, so nothing outside that website can be added.
 */

import { normalizeUrl, parseUrlInput } from "@/lib/url";

function siteHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

export type PageRequest = { url: string; name?: string };
export type NewPage = { url: string; normalizedUrl: string; name: string | null };

export type PagePlan =
  | { ok: true; fresh: NewPage[]; alreadyMonitored: number }
  | { ok: false; error: string };

export function planPageAdditions(
  requested: PageRequest[],
  websiteUrl: string,
  existingNormalized: Iterable<string>,
): PagePlan {
  const origin = new URL(websiteUrl);
  const known = new Set(existingNormalized);
  const fresh: NewPage[] = [];
  for (const page of requested) {
    const parsed = parseUrlInput(page.url);
    if (
      !parsed ||
      (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
      parsed.username ||
      parsed.password ||
      siteHost(parsed.hostname) !== siteHost(origin.hostname)
    ) {
      return { ok: false, error: `Only pages on ${origin.hostname} can be monitored for this website.` };
    }
    const onSite = new URL(parsed.pathname + parsed.search, origin);
    const normalizedUrl = normalizeUrl(onSite);
    if (known.has(normalizedUrl)) continue;
    known.add(normalizedUrl);
    fresh.push({ url: onSite.href, normalizedUrl, name: page.name?.trim() || null });
  }
  return { ok: true, fresh, alreadyMonitored: requested.length - fresh.length };
}
