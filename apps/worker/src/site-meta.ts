/**
 * Per-scan robots.txt + sitemap + llms.txt capture. One safeFetch each (no Playwright),
 * persisted as a SiteMetaSnapshot for the comparison step. Every failure is
 * recorded as a status/null - capture must never fail the scan.
 */

import { createHash } from "node:crypto";
import { prisma } from "@mykavo/database";
import { parseSitemap } from "@mykavo/comparison-engine";
import { safeFetch } from "@mykavo/shared";
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

/**
 * One SSRF-guarded GET (spec §11): robots.txt Sitemap: lines and sitemap
 * index children are site-controlled URLs, and every redirect hop is
 * revalidated, connected to the vetted IP only, and size-capped by safeFetch.
 * Oversized sitemaps are cut at MAX_BODY_BYTES rather than dropped.
 */
async function fetchText(
  url: string,
): Promise<{ status: number | null; body: string | null }> {
  try {
    const res = await safeFetch(url, {
      timeoutMs: FETCH_TIMEOUT_MS,
      maxBytes: MAX_BODY_BYTES,
      truncate: true,
      userAgent: USER_AGENT,
      readBody: (status) => status >= 200 && status < 300,
    });
    if (res.status < 200 || res.status >= 300) return { status: res.status, body: null };
    return { status: res.status, body: res.body };
  } catch {
    return { status: null, body: null };
  }
}

/**
 * Hash of a real llms.txt, or null. Sites with a catch-all route answer
 * /llms.txt with their HTML 404 page and status 200; that is not an
 * llms.txt, and counting it as one would hide the file disappearing.
 */
export function llmsHash(body: string | null): string | null {
  if (!body) return null;
  const text = body.trim();
  if (text.length === 0 || /^<(!doctype|html|head|body)\b/i.test(text)) return null;
  return sha256(text);
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
      // Malformed declaration - skip.
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
    // Sample up to MAX_CHILD_SITEMAPS children and extrapolate nothing -
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
 * for this scan (idempotent - keyed by scanId). Never throws.
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

    // llms.txt - written separately so a database that has not had the
    // llms.txt columns added yet only loses this, never robots/sitemap.
    const llms = await fetchText(`${origin}/llms.txt`);
    try {
      await prisma.siteMetaSnapshot.update({
        where: { scanId: params.scanId },
        data: { llmsTxtStatus: llms.status, llmsTxtHash: llmsHash(llms.body) },
      });
    } catch (err) {
      logger.warn("llms.txt not recorded (migration 20260930160000 not applied?)", {
        scanId: params.scanId,
        error: err instanceof Error ? err.message.slice(0, 200) : String(err),
      });
    }
  } catch (err) {
    logger.warn("site meta capture failed", {
      scanId: params.scanId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
