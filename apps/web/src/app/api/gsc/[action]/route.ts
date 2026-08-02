import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import {
  listProperties,
  listSitemaps,
  submitSitemap,
  inspectUrl,
} from "@mykavo/shared";
import { getApiContext, getOwnedWebsite, requireRole, type ApiContext } from "@/lib/api-auth";
import { getGscConnection, gscAccessToken, gscConfigured } from "@/lib/gsc";
import { enqueueGscSync } from "@/lib/queue";
import { rateLimit } from "@/lib/security/rate-limit";
import { toCsv } from "@/lib/csv";
import { logger } from "@/lib/logger";

/**
 * GSC actions, one route: GET properties|export, POST property|sync|
 * disconnect|inspect|resubmit-sitemap. Every action re-checks workspace
 * ownership; tokens never leave the server.
 */

type Params = { params: Promise<{ action: string }> };

async function ownedConnection(ctx: ApiContext, websiteId: string) {
  const website = await getOwnedWebsite(ctx, websiteId);
  if (!website) return null;
  const connection = await getGscConnection(ctx.workspace.id, website.id);
  return connection ? { website, connection } : null;
}

export async function GET(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!gscConfigured())
    return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const { action } = await params;
  const websiteId = new URL(request.url).searchParams.get("website") ?? "";
  const owned = await ownedConnection(ctx, websiteId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (action === "properties") {
    const properties = await listProperties(await gscAccessToken(owned.connection));
    return NextResponse.json({ properties });
  }

  if (action === "export") {
    const dimension = new URL(request.url).searchParams.get("dimension") === "PAGE" ? "PAGE" : "QUERY";
    const rows = await prisma.gscDimensionRow.findMany({
      where: { websiteId, dimension, period: "CURRENT" },
      orderBy: { clicks: "desc" },
    });
    const csv = toCsv([
      [dimension === "PAGE" ? "Page" : "Query", "Clicks", "Impressions", "CTR", "Position"],
      ...rows.map((r) => [
        r.key, String(r.clicks), String(r.impressions),
        `${(r.ctr * 100).toFixed(2)}%`, r.position.toFixed(1),
      ]),
    ]);
    return new NextResponse(csv, {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": `attachment; filename="mykavo-gsc-${dimension.toLowerCase()}s.csv"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 404 });
}

const postSchema = z.object({
  websiteId: z.string().min(1),
  property: z.string().max(300).optional(),
  url: z.string().url().max(2000).optional(),
  feedpath: z.string().url().max(2000).optional(),
});

export async function POST(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;
  if (!gscConfigured())
    return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const rl = rateLimit(`gsc:${ctx.workspace.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed)
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });

  const { action } = await params;
  let input: z.infer<typeof postSchema>;
  try {
    input = postSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const owned = await ownedConnection(ctx, input.websiteId);
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const { website, connection } = owned;

  switch (action) {
    case "property": {
      if (!input.property)
        return NextResponse.json({ error: "Pick a property." }, { status: 400 });
      // Only allow properties the Google account can actually see.
      const properties = await listProperties(await gscAccessToken(connection));
      if (!properties.some((p) => p.siteUrl === input.property))
        return NextResponse.json({ error: "Property not available on this Google account." }, { status: 400 });
      await prisma.gscConnection.update({
        where: { id: connection.id },
        data: { property: input.property },
      });
      await enqueueGscSync({ websiteId: website.id });
      logger.info("gsc property selected", { websiteId: website.id, property: input.property });
      return NextResponse.json({ ok: true });
    }
    case "sync": {
      await enqueueGscSync({ websiteId: website.id });
      return NextResponse.json({ ok: true });
    }
    case "disconnect": {
      // Spec: delete stored tokens on disconnect (row carries them all).
      await prisma.$transaction([
        prisma.gscConnection.delete({ where: { id: connection.id } }),
        prisma.gscDaily.deleteMany({ where: { websiteId: website.id } }),
        prisma.gscDimensionRow.deleteMany({ where: { websiteId: website.id } }),
      ]);
      logger.info("gsc disconnected", { websiteId: website.id });
      return NextResponse.json({ ok: true });
    }
    case "inspect": {
      if (!input.url || !connection.property)
        return NextResponse.json({ error: "URL and a selected property are required." }, { status: 400 });
      const result = await inspectUrl({
        accessToken: await gscAccessToken(connection),
        property: connection.property,
        url: input.url,
      });
      return NextResponse.json({ result });
    }
    case "sitemaps": {
      if (!connection.property)
        return NextResponse.json({ error: "Select a property first." }, { status: 400 });
      const sitemaps = await listSitemaps(await gscAccessToken(connection), connection.property);
      return NextResponse.json({ sitemaps });
    }
    case "resubmit-sitemap": {
      if (!input.feedpath || !connection.property)
        return NextResponse.json({ error: "Sitemap path required." }, { status: 400 });
      await submitSitemap(await gscAccessToken(connection), connection.property, input.feedpath);
      return NextResponse.json({ ok: true });
    }
    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 404 });
  }
}
