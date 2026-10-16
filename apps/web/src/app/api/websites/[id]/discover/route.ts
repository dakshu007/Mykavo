import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { discoverPages, DiscoveryError } from "@/lib/discovery";
import { rateLimit } from "@/lib/security/rate-limit";
import { isSameSite, normalizeUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

/**
 * Statuses of a website still being set up, as long as none of its pages has
 * an approved baseline yet. ERROR is here for a failed first discovery or
 * baseline, so retrying discovery puts the site back to PENDING.
 */
const ONBOARDING_STATUSES = ["PENDING", "DISCOVERING", "BASELINING", "ERROR"] as const;

export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Discovery makes several outbound requests - bound it per workspace.
  const limit = rateLimit(`discover:${ctx.workspace.id}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many discovery runs - please wait a few minutes." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // "Monitored pages" (web and mobile) also runs discovery on websites that
  // are monitored or paused. Only a website still being set up has its
  // status and base URL changed here: rewriting any other would drop a
  // monitored site out of the scheduler, or keep a site paused at the end of
  // a trial from resuming on upgrade (only PAUSED sites are resumed).
  const claimed = await prisma.website.updateMany({
    where: {
      id: website.id,
      status: { in: [...ONBOARDING_STATUSES] },
      baselines: { none: { status: "ACTIVE" } },
      // A site that has finished a scan was monitored once (trigger.ts uses
      // the same test to stop calling scans BASELINE): never onboarding.
      scans: { none: { status: { in: ["COMPLETED", "PARTIAL"] } } },
    },
    data: { status: "DISCOVERING" },
  });
  const onboarding = claimed.count === 1;
  // Later writes apply only while this run's DISCOVERING still stands, so a
  // pause or a baseline scan started meanwhile is not overwritten.
  const stillDiscovering = { id: website.id, status: "DISCOVERING" as const };

  try {
    const result = await discoverPages(website.url);
    if (!onboarding) {
      // A monitored site keeps its address. If its homepage now redirects to
      // a different host, those pages cannot be saved here, so do not offer
      // them; say why instead. (www and https variants are the same site.)
      const base = new URL(website.url);
      if (isSameSite(new URL(result.finalUrl), base)) return NextResponse.json(result);
      const movedTo = new URL(result.finalUrl).hostname;
      return NextResponse.json({
        ...result,
        pages: result.pages.filter((p) => isSameSite(new URL(p.url), base)),
        warnings: [
          ...result.warnings,
          `The homepage now redirects to ${movedTo}, a different website. Pages there can't be monitored under ${base.hostname}; add ${movedTo} as its own website to monitor it.`,
        ],
      });
    }

    // The homepage may redirect (apex → www, http → https). Adopt the final
    // URL as the website's base so monitored pages pass same-origin checks.
    const finalNormalized = normalizeUrl(result.finalUrl, { stripAllParams: true });
    const data: { status: "PENDING"; url?: string; normalizedUrl?: string } = {
      status: "PENDING",
    };
    if (finalNormalized !== website.normalizedUrl) {
      data.url = result.finalUrl;
      data.normalizedUrl = finalNormalized;
    }
    try {
      await prisma.website.updateMany({ where: stillDiscovering, data });
    } catch {
      // Unique conflict on normalizedUrl (same site added twice under
      // different aliases) - keep the original URL rather than failing.
      await prisma.website.updateMany({
        where: stillDiscovering,
        data: { status: "PENDING" },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    if (onboarding) {
      await prisma.website.updateMany({
        where: stillDiscovering,
        data: { status: "ERROR" },
      });
    }
    if (err instanceof DiscoveryError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 400 });
    }
    logger.error(
      "discovery failed unexpectedly",
      { websiteId: website.id, workspaceId: ctx.workspace.id },
      err,
    );
    return NextResponse.json(
      { error: "Page discovery failed. Please try again." },
      { status: 500 },
    );
  }
}
