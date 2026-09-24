import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { changeEventWhere, parseChangeFilters } from "@/lib/change-filters";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { mapChangeListItem } from "@/lib/mobile/mapping";

/**
 * The connected website's changes (?status=open|all&severity=&category=
 * &scan=), newest first. Filters are parsed exactly like the dashboard's; the
 * website is always the token's own, whatever the query says. Each item says
 * whether it was found by an update check, and which update.
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
  const scanId = params.get("scan");
  const where = {
    ...changeEventWhere(ctx.workspaceId, filters),
    websiteId: ctx.website.id,
    ...(scanId && /^[A-Za-z0-9]{8,40}$/.test(scanId) ? { scanId } : {}),
  };

  const [changes, total] = await Promise.all([
    prisma.changeEvent.findMany({
      where,
      include: {
        website: { select: { name: true } },
        monitoredPage: { select: { url: true } },
        scan: { select: { id: true, triggerType: true, note: true } },
      },
      orderBy: [{ detectedAt: "desc" }],
      take: 100,
    }),
    prisma.changeEvent.count({ where }),
  ]);

  return NextResponse.json(
    {
      changes: changes.map((c) => ({
        ...mapChangeListItem(c),
        scanId: c.scan.id,
        afterUpdate: c.scan.triggerType === "DEPLOY" ? c.scan.note : null,
      })),
      total,
    },
    { headers: { "cache-control": "no-store" } },
  );
}
