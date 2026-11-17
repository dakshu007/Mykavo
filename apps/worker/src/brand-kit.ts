/**
 * Brand kits (docs/BRAND_VIDEO.md): the homepage's brand, captured during a
 * normal scan when the kit is missing or older than BRAND_KIT_MAX_AGE_DAYS,
 * or on demand from the Brand Video page. Capture itself lives in
 * packages/scanner/src/brand.ts; this file decides when, and saves it.
 *
 * A kit the owner has edited is never overwritten by a scan. Only an explicit
 * "Refresh from website" (force) replaces the words and colors; the
 * screenshots are always refreshed, because they are the site as it is now.
 */
import { prisma, Prisma } from "@mykavo/database";
import { BRAND_KIT_MAX_AGE_DAYS, normalizeCapture } from "@mykavo/brand-video/pure";
import type { BrandCaptureResult, ArtifactStorage } from "@mykavo/scanner";
import { logger } from "./logger";

const DAY_MS = 86_400_000;

export function brandPrefix(workspaceId: string, websiteId: string): string {
  return `ws/${workspaceId}/brand/${websiteId}`;
}

/** Does this website need a (re)capture on its next scan? */
export async function brandCaptureDue(websiteId: string, now = Date.now()): Promise<boolean> {
  const kit = await prisma.brandKit.findUnique({
    where: { websiteId },
    select: { capturedAt: true, heroKey: true },
  });
  if (!kit) return true;
  if (!kit.heroKey) return true;
  return now - kit.capturedAt.getTime() > BRAND_KIT_MAX_AGE_DAYS * DAY_MS;
}

/**
 * The page to read the brand from: the monitored page at the website's own
 * address, else the one with the shortest path.
 */
export function homepageOf<T extends { id: string; normalizedUrl: string; url: string }>(
  pages: T[],
  websiteNormalizedUrl: string,
): T | null {
  const exact = pages.find((p) => p.normalizedUrl === websiteNormalizedUrl);
  if (exact) return exact;
  const pathLen = (u: string) => {
    try {
      return new URL(u).pathname.length;
    } catch {
      return 9999;
    }
  };
  return [...pages].sort((a, b) => pathLen(a.url) - pathLen(b.url))[0] ?? null;
}

/**
 * Save a capture. Returns true when the kit was written. Old images replaced
 * by new ones are deleted from storage (each belongs to this website only).
 */
export async function saveBrandCapture(params: {
  websiteId: string;
  workspaceId: string;
  capture: BrandCaptureResult;
  storage: ArtifactStorage;
  /** Replace words and colors even if the owner edited them. */
  force?: boolean;
}): Promise<boolean> {
  const { websiteId, workspaceId, capture, storage } = params;
  const kit = normalizeCapture(capture.raw);
  const existing = await prisma.brandKit.findUnique({ where: { websiteId } });

  const images = {
    logoKey: capture.logo?.key ?? null,
    logoWidth: capture.logo?.width ?? null,
    logoHeight: capture.logo?.height ?? null,
    heroKey: capture.hero?.key ?? null,
    pageKey: capture.page?.key ?? null,
    pageHeight: capture.page?.height ?? null,
  };
  const words = {
    name: kit.name,
    headline: kit.headline,
    description: kit.description,
    ctaText: kit.ctaText,
    ctaUrl: kit.ctaUrl,
    valuePoints: kit.valuePoints as unknown as Prisma.InputJsonValue,
    stats: kit.stats as unknown as Prisma.InputJsonValue,
    services: kit.services,
    colors: kit.colors as unknown as Prisma.InputJsonValue,
    palette: kit.palette,
    headingFont: kit.headingFont,
    bodyFont: kit.bodyFont,
    logoBackground: kit.logoBackground,
  };
  const now = new Date();

  if (!existing) {
    await prisma.brandKit.create({
      data: { websiteId, workspaceId, sourceUrl: capture.raw.url.slice(0, 2048), capturedAt: now, ...words, ...images },
    });
    logger.info("brand kit captured", { websiteId, workspaceId, logo: Boolean(capture.logo) });
    return true;
  }

  const keepWords = existing.editedAt !== null && !params.force;
  // A fresh logo replaces the old one, unless the owner edited the kit (they
  // may have uploaded their own). A capture that found no logo keeps the old.
  const logo = !keepWords && images.logoKey ? images : existing.logoKey ? existing : images;
  await prisma.brandKit.update({
    where: { websiteId },
    data: {
      ...(keepWords ? {} : { ...words, editedAt: null }),
      logoKey: logo.logoKey,
      logoWidth: logo.logoWidth,
      logoHeight: logo.logoHeight,
      heroKey: images.heroKey ?? existing.heroKey,
      pageKey: images.pageKey ?? existing.pageKey,
      pageHeight: images.pageKey ? images.pageHeight : existing.pageHeight,
      sourceUrl: capture.raw.url.slice(0, 2048),
      capturedAt: now,
    },
  });

  // Delete images this capture replaced (content-hashed: same image, same key).
  const after = await prisma.brandKit.findUnique({ where: { websiteId }, select: { logoKey: true, heroKey: true, pageKey: true } });
  const live = new Set([after?.logoKey, after?.heroKey, after?.pageKey].filter(Boolean));
  for (const key of [existing.logoKey, existing.heroKey, existing.pageKey]) {
    if (key && !live.has(key)) await storage.delete(key).catch(() => {});
  }
  logger.info("brand kit refreshed", { websiteId, workspaceId, keptWords: keepWords });
  return true;
}
