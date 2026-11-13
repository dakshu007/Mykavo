import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { liveDone, parseLiveQuery, type LiveItem, type LiveStatus } from "@/lib/live-status";

/**
 * GET /api/live-status?scan=ID | ?audits=ID,ID
 *
 * The one row (or few rows) a page needs to know whether its scan or site
 * audit has moved, and nothing else - see lib/live-status.ts for why this
 * replaced full-page refreshes. Scoped to the caller's workspace: an id from
 * another workspace reads as not found.
 */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const query = parseLiveQuery(new URL(request.url).searchParams);
  if (!query) return NextResponse.json({ error: "Pass ?scan=ID or ?audits=ID,ID" }, { status: 400 });

  let items: LiveItem[];
  if (query.kind === "scan") {
    const scan = await prisma.scan.findFirst({
      where: { id: query.ids[0], website: { workspaceId: ctx.workspace.id } },
      select: { status: true, pagesScanned: true, pagesFailed: true },
    });
    if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });
    items = [{ status: scan.status, progress: scan.pagesScanned + scan.pagesFailed }];
  } else {
    const audits = await prisma.siteAudit.findMany({
      where: { id: { in: query.ids }, website: { workspaceId: ctx.workspace.id } },
      select: { id: true, status: true, pagesCrawled: true },
    });
    if (audits.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const byId = new Map(audits.map((a) => [a.id, a]));
    items = query.ids
      .map((id) => byId.get(id))
      .filter((a) => a !== undefined)
      .map((a) => ({ status: a.status, progress: a.pagesCrawled }));
  }

  const body: LiveStatus = { items, done: liveDone(items) };
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" } });
}
