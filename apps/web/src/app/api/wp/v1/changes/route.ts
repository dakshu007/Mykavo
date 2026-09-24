import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { changeEventWhere, parseChangeFilters } from "@/lib/change-filters";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { mapChangeListItem } from "@/lib/mobile/mapping";

/**
 * The connected website's changes (?status=open|all&severity=&category=),
 * newest first. Filters are parsed exactly like the dashboard's; the website
 * is always the token's own, whatever the query says.
 */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const params = new URL(request.url).searchParams;
  const filters = parseChangeFilters({
    severity: params.get("severity") ?? undefined,
    status: params.get("status") ?? undefined,
    category: params.get("category") ?? undefined,
    website: ctx.website.id,
  });
  const where = { ...changeEventWhere(ctx.workspaceId, filters), websiteId: ctx.website.id };

  const [changes, total] = await Promise.all([
    prisma.changeEvent.findMany({
      where,
      include: { website: { select: { name: true } }, monitoredPage: { select: { url: true } } },
      orderBy: [{ detectedAt: "desc" }],
      take: 100,
    }),
    prisma.changeEvent.count({ where }),
  ]);

  return NextResponse.json(
    { changes: changes.map(mapChangeListItem), total },
    { headers: { "cache-control": "no-store" } },
  );
}
