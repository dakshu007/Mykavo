import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { changeEventWhere, parseChangeFilters } from "@/lib/change-filters";
import { toCsv } from "@/lib/csv";

const MAX_ROWS = 5000;

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/**
 * CSV export of change events, honoring the same ?severity/&category/&status/
 * &website filters as the changes list page. A read — any signed-in member of
 * the workspace (viewers included) may export.
 */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const params = new URL(request.url).searchParams;
  const filters = parseChangeFilters({
    severity: params.get("severity") ?? undefined,
    category: params.get("category") ?? undefined,
    status: params.get("status") ?? undefined,
    website: params.get("website") ?? undefined,
  });

  const changes = await prisma.changeEvent.findMany({
    where: changeEventWhere(ctx.workspace.id, filters),
    include: {
      website: { select: { name: true } },
      monitoredPage: { select: { url: true } },
    },
    orderBy: [{ detectedAt: "desc" }],
    take: MAX_ROWS,
  });

  const csv = toCsv([
    [
      "detectedAt",
      "website",
      "page",
      "category",
      "changeType",
      "severity",
      "status",
      "title",
      "previousValue",
      "currentValue",
    ],
    ...changes.map((c) => [
      c.detectedAt.toISOString(),
      c.website.name,
      c.monitoredPage ? pathOf(c.monitoredPage.url) : "Site-wide",
      c.category,
      c.changeType,
      c.severity,
      c.status,
      c.title,
      c.previousValue ?? "",
      c.currentValue ?? "",
    ]),
  ]);

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="fluxen-changes-${date}.csv"`,
    },
  });
}
