import { parse } from "node-html-parser";
import { safeFetch, UnsafeUrlError } from "@mykavo/shared";

/**
 * Reads a website's public pages for the agent: the homepage, then the pages
 * its sitemap and homepage links point to, capped (spec: never unlimited).
 * Every request goes through safeFetch, which validates the URL and every
 * redirect against private and internal addresses (SSRF).
 */

export interface PageSummary {
  url: string;
  title: string;
  description: string;
  h1: string;
  h2s: string[];
  /** The start of the visible text, for context. */
  excerpt: string;
}

export interface SiteSnapshot {
  pages: PageSummary[];
  /** Detected from <html lang>, if any. */
  htmlLang: string | null;
}

export class SiteReadError extends Error {
  constructor(
    public readonly code: "UNREACHABLE" | "PROTECTED" | "NOINDEX" | "NOT_HTML" | "BLOCKED_URL",
    message: string,
  ) {
    super(message);
    this.name = "SiteReadError";
  }
}

const clip = (s: string, n: number) => s.replace(/\s+/g, " ").trim().slice(0, n);

export function hostKey(url: string): string | null {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

/** Title, description, headings, a text excerpt and same-site links. */
export function extractPageSummary(html: string, url: string): PageSummary & { links: string[]; noindex: boolean; lang: string | null } {
  const root = parse(html, { comment: false });
  const title = clip(root.querySelector("title")?.text ?? "", 160);
  const description = clip(root.querySelector('meta[name="description"]')?.getAttribute("content") ?? "", 300);
  const robots = (root.querySelector('meta[name="robots"]')?.getAttribute("content") ?? "").toLowerCase();
  const lang = root.querySelector("html")?.getAttribute("lang")?.slice(0, 2).toLowerCase() ?? null;
  const h1 = clip(root.querySelector("h1")?.text ?? "", 160);
  const h2s = root
    .querySelectorAll("h2")
    .map((h) => clip(h.text, 120))
    .filter(Boolean)
    .slice(0, 12);
  const host = hostKey(url);
  const links: string[] = [];
  for (const a of root.querySelectorAll("a[href]")) {
    try {
      const next = new URL(a.getAttribute("href") ?? "", url);
      if ((next.protocol === "https:" || next.protocol === "http:") && hostKey(next.href) === host) {
        next.hash = "";
        links.push(next.href);
      }
    } catch {
      // ignore unparseable hrefs
    }
  }
  for (const el of root.querySelectorAll("script, style, noscript, nav, footer, header, svg")) el.remove();
  const body = root.querySelector("main") ?? root.querySelector("body") ?? root;
  return {
    url,
    title,
    description,
    h1,
    h2s,
    excerpt: clip(body.text, 700),
    links: [...new Set(links)],
    noindex: robots.includes("noindex"),
    lang: lang && /^[a-z]{2}$/.test(lang) ? lang : null,
  };
}

/** <loc> entries of a sitemap (or sitemap index), at most `max`. */
export function parseSitemapLocs(xml: string, max = 300): string[] {
  const out: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) && out.length < max) {
    out.push(m[1]!.replace(/&amp;/g, "&"));
  }
  return out;
}

const SKIP_PATH = /\.(pdf|jpe?g|png|gif|webp|svg|zip|xml|mp4|mp3)$|\/(wp-admin|wp-login|cart|checkout|account|login|signin|search|tag|author|feed)\b|[?&](s|q|replytocom|add-to-cart)=/i;

/**
 * Picks the pages worth reading: same site, not files or app screens,
 * shallow paths first (they are usually the main service pages), homepage
 * links before sitemap-only pages, at most `max`.
 */
export function pickPages(homeUrl: string, fromHome: string[], fromSitemap: string[], max: number): string[] {
  const host = hostKey(homeUrl);
  const home = new URL(homeUrl);
  const seen = new Set<string>([home.origin + home.pathname.replace(/\/+$/, "")]);
  const scored: { url: string; score: number }[] = [];
  const add = (url: string, bonus: number) => {
    try {
      const u = new URL(url);
      if (hostKey(u.href) !== host || SKIP_PATH.test(u.pathname + u.search)) return;
      u.hash = "";
      const key = u.origin + u.pathname.replace(/\/+$/, "");
      if (seen.has(key)) return;
      seen.add(key);
      const depth = u.pathname.split("/").filter(Boolean).length;
      scored.push({ url: u.href, score: bonus - depth * 2 - (u.search ? 3 : 0) });
    } catch {
      // ignore
    }
  };
  fromHome.forEach((u) => add(u, 5));
  fromSitemap.forEach((u) => add(u, 0));
  return scored
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, max)
    .map((s) => s.url);
}

const BLOCKED_CODES = new Set<UnsafeUrlError["code"]>([
  "INVALID_URL",
  "SCHEME_NOT_ALLOWED",
  "CREDENTIALS_IN_URL",
  "BLOCKED_HOST",
  "BLOCKED_IP",
]);

type Fetcher = (url: string) => Promise<{ status: number; body: string; finalUrl: string; contentType: string }>;

const defaultFetcher: Fetcher = async (url) => {
  const res = await safeFetch(url, { timeoutMs: 12_000, maxBytes: 2 * 1024 * 1024, truncate: true });
  return { status: res.status, body: res.body, finalUrl: res.finalUrl, contentType: res.headers.get("content-type") ?? "" };
};

export async function readSite(homeUrl: string, opts: { maxPages?: number; fetcher?: Fetcher } = {}): Promise<SiteSnapshot> {
  const fetcher = opts.fetcher ?? defaultFetcher;
  const maxPages = opts.maxPages ?? 12;

  let home: Awaited<ReturnType<Fetcher>>;
  try {
    home = await fetcher(homeUrl);
  } catch (err) {
    // Only an address that is blocked on purpose (private network, bad
    // scheme...) gets the "can't be read safely" message; a site that is
    // down or slow is just unreachable.
    if (err instanceof UnsafeUrlError && BLOCKED_CODES.has(err.code)) {
      throw new SiteReadError("BLOCKED_URL", "That address can't be read safely. Use your site's public web address.");
    }
    throw new SiteReadError("UNREACHABLE", "We couldn't reach your website. Check that it's online and try again.");
  }
  if (home.status === 401 || home.status === 403) {
    throw new SiteReadError("PROTECTED", "Your site asks for a password. Use the live, public site instead.");
  }
  if (home.status >= 400) {
    throw new SiteReadError("UNREACHABLE", `Your homepage answered with an error (${home.status}).`);
  }
  if (home.contentType && !home.contentType.includes("html")) {
    throw new SiteReadError("NOT_HTML", "Your homepage isn't a web page we can read.");
  }
  const homeSummary = extractPageSummary(home.body, home.finalUrl);
  if (homeSummary.noindex) {
    throw new SiteReadError("NOINDEX", "Your homepage is set to noindex, which usually means a staging site. Use the live site.");
  }

  let sitemap: string[] = [];
  try {
    const origin = new URL(home.finalUrl).origin;
    const res = await fetcher(`${origin}/sitemap.xml`);
    if (res.status === 200) {
      sitemap = parseSitemapLocs(res.body);
      // A sitemap index: read the first child sitemap only (bounded).
      const child = sitemap.find((u) => /sitemap.*\.xml/i.test(u));
      if (child && sitemap.every((u) => /\.xml/i.test(u))) {
        const sub = await fetcher(child);
        sitemap = sub.status === 200 ? parseSitemapLocs(sub.body) : [];
      }
    }
  } catch {
    // No sitemap is normal; homepage links are enough.
  }

  const pages: PageSummary[] = [stripExtras(homeSummary)];
  for (const url of pickPages(home.finalUrl, homeSummary.links, sitemap, maxPages - 1)) {
    try {
      const res = await fetcher(url);
      if (res.status !== 200 || (res.contentType && !res.contentType.includes("html"))) continue;
      const summary = extractPageSummary(res.body, res.finalUrl);
      if (!summary.noindex) pages.push(stripExtras(summary));
    } catch {
      // One unreadable page does not stop the rest.
    }
  }
  return { pages, htmlLang: homeSummary.lang };
}

function stripExtras(p: ReturnType<typeof extractPageSummary>): PageSummary {
  return { url: p.url, title: p.title, description: p.description, h1: p.h1, h2s: p.h2s, excerpt: p.excerpt };
}

/** Country guess from the domain ending (spec: domain, currency, phone). */
export function countryFromDomain(url: string): string | null {
  const host = hostKey(url) ?? "";
  const tld = host.split(".").pop() ?? "";
  const map: Record<string, string> = {
    uk: "GB", in: "IN", au: "AU", ca: "CA", de: "DE", fr: "FR", es: "ES", it: "IT", nl: "NL", ie: "IE",
    nz: "NZ", sg: "SG", za: "ZA", ae: "AE", jp: "JP", br: "BR", mx: "MX", se: "SE", no: "NO", dk: "DK",
  };
  return map[tld] ?? null;
}
