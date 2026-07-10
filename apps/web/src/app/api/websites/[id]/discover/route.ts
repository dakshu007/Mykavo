import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { discoverPages, DiscoveryError } from "@/lib/discovery";
import { rateLimit } from "@/lib/security/rate-limit";
import { normalizeUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Discovery makes several outbound requests — bound it per workspace.
  const limit = rateLimit(`discover:${ctx.workspace.id}`, {
    limit: 10,
    windowMs: 10 * 60_000,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many discovery runs — please wait a few minutes." },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } },
    );
  }

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.website.update({
    where: { id: website.id },
    data: { status: "DISCOVERING" },
  });

  try {
    const result = await discoverPages(website.url);

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
      await prisma.website.update({ where: { id: website.id }, data });
    } catch {
      // Unique conflict on normalizedUrl (same site added twice under
      // different aliases) — keep the original URL rather than failing.
      await prisma.website.update({
        where: { id: website.id },
        data: { status: "PENDING" },
      });
    }

    return NextResponse.json(result);
  } catch (err) {
    await prisma.website.update({
      where: { id: website.id },
      data: { status: "ERROR" },
    });
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
