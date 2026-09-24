import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";

/** The connected website's monitored pages, with baseline version and open changes. */
export async function GET(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const pages = await prisma.monitoredPage.findMany({
    where: { websiteId: ctx.website.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      url: true,
      name: true,
      enabled: true,
      baselines: { where: { status: "ACTIVE" }, select: { version: true, approvedAt: true } },
      _count: { select: { changeEvents: { where: { status: { in: ["NEW", "REVIEWED"] } } } } },
    },
  });

  return NextResponse.json(
    {
      pages: pages.map((p) => ({
        id: p.id,
        url: p.url,
        name: p.name,
        enabled: p.enabled,
        baselineVersion: p.baselines[0]?.version ?? null,
        baselineApprovedAt: p.baselines[0]?.approvedAt ?? null,
        openChanges: p._count.changeEvents,
      })),
    },
    { headers: { "cache-control": "no-store" } },
  );
}
