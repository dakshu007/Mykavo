import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import { mapScanListItem } from "@/lib/mobile/mapping";

/**
 * Mobile scan history: the workspace's latest scans (optionally filtered to
 * one website via ?websiteId=). Mirrors dashboard/scans/page.tsx; implements
 * ScansListResponse in apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const websiteId = new URL(request.url).searchParams.get("websiteId");
  const scans = await prisma.scan.findMany({
    where: {
      website: { workspaceId: ctx.workspace.id },
      ...(websiteId ? { websiteId } : {}),
    },
    include: { website: { select: { name: true, url: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({
    scans: scans.map((scan) => mapScanListItem(scan, scan.website)),
  });
}
