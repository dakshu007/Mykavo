/**
 * IndexNow: tells Bing (and the other IndexNow engines: Yandex, Seznam,
 * Naver) which pages are new or changed, instead of waiting for a crawl.
 * ChatGPT search and Microsoft Copilot answer from Bing's index, so a page
 * Bing has not seen cannot be cited there.
 *
 * The key is public by design: IndexNow proves domain ownership by fetching
 * https://mykavo.app/<key>.txt and checking it contains the key (the file is
 * apps/web/public/<key>.txt). Pure helpers here; the worker sends them.
 */

export const INDEXNOW_KEY = "2b0207a852b0f656ea35de70da2aad0a";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
/** IndexNow accepts up to 10,000 URLs per request. */
export const INDEXNOW_MAX_URLS = 10_000;

export interface SitemapEntry {
  url: string;
  lastModified: Date | null;
}

/** <url><loc>..</loc><lastmod>..</lastmod></url> entries from a sitemap. */
export function parseSitemap(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = /<loc>\s*([^<\s]+)\s*<\/loc>/.exec(block)?.[1];
    if (!loc) continue;
    const mod = /<lastmod>\s*([^<\s]+)\s*<\/lastmod>/.exec(block)?.[1];
    const when = mod ? new Date(mod) : null;
    entries.push({
      url: loc.replace(/&amp;/g, "&"),
      lastModified: when && !Number.isNaN(when.getTime()) ? when : null,
    });
  }
  return entries;
}

/**
 * The URLs to submit: everything on a full run (weekly), otherwise only the
 * pages modified since `since`. Only URLs on `host` are ever sent: IndexNow
 * rejects a whole request that names another host.
 */
export function urlsToSubmit(
  entries: readonly SitemapEntry[],
  params: { host: string; since: Date | null },
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const entry of entries) {
    let parsed: URL;
    try {
      parsed = new URL(entry.url);
    } catch {
      continue;
    }
    if (parsed.host !== params.host || seen.has(entry.url)) continue;
    if (params.since && (!entry.lastModified || entry.lastModified < params.since)) continue;
    seen.add(entry.url);
    out.push(entry.url);
    if (out.length >= INDEXNOW_MAX_URLS) break;
  }
  return out;
}

export function indexNowPayload(host: string, urls: readonly string[]) {
  return {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `https://${host}/${INDEXNOW_KEY}.txt`,
    urlList: [...urls],
  };
}
