import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { changeEventWhere, parseChangeFilters } from "@/lib/change-filters";
import { mapChangeListItem } from "@/lib/mobile/mapping";

/**
 * Mobile changes list. Filters (?status=open|all&severity=&category=&websiteId=)
 * are interpreted by the same parseChangeFilters/changeEventWhere pair as the
 * web dashboard, so unknown values mean "no filter" and the default is open
 * (NEW/REVIEWED) changes. Implements ChangesListResponse in
 * apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const filters = parseChangeFilters({
    severity: params.get("severity") ?? undefined,
    status: params.get("status") ?? undefined,
    category: params.get("category") ?? undefined,
    website: params.get("websiteId") ?? undefined,
  });
  const where = changeEventWhere(ctx.workspace.id, filters);

  const [changes, total, websites] = await Promise.all([
    prisma.changeEvent.findMany({
      where,
      include: {
        website: { select: { name: true } },
        monitoredPage: { select: { url: true } },
      },
      orderBy: [{ detectedAt: "desc" }],
      take: 100,
    }),
    prisma.changeEvent.count({ where }),
    // Filter options: workspace websites with at least one change event,
    // matching the web page's filter pills.
    prisma.website.findMany({
      where: { workspaceId: ctx.workspace.id, changeEvents: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    changes: changes.map(mapChangeListItem),
    total,
    websites,
  });
}
