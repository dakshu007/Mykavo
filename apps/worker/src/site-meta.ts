/**
 * Per-scan robots.txt + sitemap capture. One plain fetch each (no Playwright),
 * persisted as a SiteMetaSnapshot for the comparison step. Every failure is
 * recorded as a status/null — capture must never fail the scan.
 */

import { createHash } from "node:crypto";
import { prisma } from "@mykavo/database";
import { parseSitemap } from "@mykavo/comparison-engine";
import { logger } from "./logger";

const FETCH_TIMEOUT_MS = 10_000;
const MAX_BODY_BYTES = 2 * 1024 * 1024; // sitemaps can be big; cap processing
const MAX_ROBOTS_STORED = 64 * 1024; // robots.txt content kept for diffs
const MAX_CHILD_SITEMAPS = 3; // for index files, sample this many children
const USER_AGENT =
  "Mozilla/5.0 (compatible; MyKavoBot/0.1; +https://mykavo.app/bot) site meta check";

function sha256(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

async function fetchText(
  url: string,
): Promise<{ status: number | null; body: string | null }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/plain, application/xml, text/xml" },
    });
    if (!res.ok) {
      res.body?.cancel().catch(() => undefined);
      return { status: res.status, body: null };
    }
    const raw = await res.arrayBuffer();
    const body = new TextDecoder("utf-8", { fatal: false }).decode(
      raw.byteLength > MAX_BODY_BYTES ? raw.slice(0, MAX_BODY_BYTES) : raw,
    );
    return { status: res.status, body };
  } catch {
    return { status: null, body: null };
  } finally {
    clearTimeout(timer);
  }
}

/** Sitemap URLs declared in robots.txt (`Sitemap:` lines). */
export function sitemapsFromRobots(robotsContent: string, origin: string): string[] {
  const urls: string[] = [];
  for (const rawLine of robotsContent.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, "").trim();
    const match = /^sitemap\s*:\s*(\S+)/i.exec(line);
    if (!match) continue;
    try {
      urls.push(new URL(match[1], origin).href);
    } catch {
      // Malformed declaration — skip.
    }
  }
  return urls;
}

interface SitemapCapture {
  sitemapUrl: string | null;
  sitemapStatus: number | null;
  sitemapUrlCount: number | null;
  sitemapHash: string | null;
}

async function captureSitemap(sitemapUrl: string): Promise<SitemapCapture> {
  const { status, body } = await fetchText(sitemapUrl);
  if (body === null) {
    return { sitemapUrl, sitemapStatus: status, sitemapUrlCount: null, sitemapHash: null };
  }

  const parsed = parseSitemap(body);
  let count: number | null = null;
  if (parsed.kind === "urlset") {
    count = parsed.count;
  } else if (parsed.kind === "index") {
    // Sample up to MAX_CHILD_SITEMAPS children and extrapolate nothing —
    // report the sampled sum plus one per unfetched child as a floor. Kept
    // simple: sum what we sample; large index churn still shows via the hash.
    count = 0;
    for (const child of parsed.children.slice(0, MAX_CHILD_SITEMAPS)) {
      const childRes = await fetchText(child);
      if (childRes.body !== null) {
        const childParsed = parseSitemap(childRes.body);
        if (childParsed.kind === "urlset") count += childParsed.count;
      }
    }
  }

  return { sitemapUrl, sitemapStatus: status, sitemapUrlCount: count, sitemapHash: sha256(body) };
}

/**
 * Capture robots.txt + sitemap for a website and persist the SiteMetaSnapshot
 * for this scan (idempotent — keyed by scanId). Never throws.
 */
export async function captureSiteMeta(params: {
  scanId: string;
  websiteId: string;
  websiteUrl: string;
}): Promise<void> {
  try {
    const origin = new URL(params.websiteUrl).origin;
    const robots = await fetchText(`${origin}/robots.txt`);

    const declared = robots.body ? sitemapsFromRobots(robots.body, origin) : [];
    const sitemapUrl = declared[0] ?? `${origin}/sitemap.xml`;
    const sitemap = await captureSitemap(sitemapUrl);

    const robotsContent =
      robots.body !== null ? robots.body.slice(0, MAX_ROBOTS_STORED) : null;
    const data = {
      websiteId: params.websiteId,
      robotsTxtStatus: robots.status,
      robotsTxtContent: robotsContent,
      robotsTxtHash: robots.body !== null ? sha256(robots.body) : null,
      ...sitemap,
    };
    await prisma.siteMetaSnapshot.upsert({
      where: { scanId: params.scanId },
      create: { scanId: params.scanId, ...data },
      update: data,
    });
  } catch (err) {
    logger.warn("site meta capture failed", {
      scanId: params.scanId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
