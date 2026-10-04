import { NextResponse } from "next/server";
import { prisma, OPEN_STATUSES } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import {
  mapChangeListItem,
  mapScanListItem,
  pathOf,
  sortChangesBySeverity,
} from "@/lib/mobile/mapping";

type Params = { params: Promise<{ id: string }> };

/**
 * Mobile scan detail: the scan summary, its changes (most severe first), and
 * per-page snapshot results with baseline chips. Mirrors
 * dashboard/scans/[id]/page.tsx; implements ScanDetailResponse in
 * apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  // Both queries scope to the workspace, so they run in parallel.
  const [scan, changes] = await Promise.all([
    prisma.scan.findFirst({
      where: { id, website: { workspaceId: ctx.workspace.id } },
      include: {
        website: { select: { name: true, url: true } },
        // Polled every 3 s by the app while a scan runs: select only the
        // columns the response uses, never the large JSON ones.
        snapshots: {
          select: {
            id: true,
            url: true,
            title: true,
            httpStatus: true,
            responseTimeMs: true,
            pageWeightBytes: true,
            requestCount: true,
            errorCode: true,
            errorMessage: true,
            screenshotStorageKey: true,
            monitoredPage: {
              select: {
                baselines: {
                  where: { status: "ACTIVE" },
                  select: { pageSnapshotId: true, version: true },
                },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    prisma.changeEvent.findMany({
      where: { scanId: id, website: { workspaceId: ctx.workspace.id } },
      select: {
        id: true,
        title: true,
        severity: true,
        category: true,
        status: true,
        detectedAt: true,
        websiteId: true,
        website: { select: { name: true } },
        monitoredPage: { select: { url: true } },
      },
      orderBy: [{ detectedAt: "desc" }],
    }),
  ]);
  if (!scan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const openChangeCount = changes.filter((c) =>
    OPEN_STATUSES.includes(c.status),
  ).length;

  return NextResponse.json({
    scan: mapScanListItem(scan, scan.website),
    changes: sortChangesBySeverity(changes).map(mapChangeListItem),
    pages: scan.snapshots.map((snap) => {
      const activeBaseline = snap.monitoredPage.baselines[0];
      const isBaseline = activeBaseline?.pageSnapshotId === snap.id;
      return {
        snapshotId: snap.id,
        url: snap.url,
        path: pathOf(snap.url),
        title: snap.title,
        httpStatus: snap.httpStatus,
        responseTimeMs: snap.responseTimeMs,
        pageWeightBytes: snap.pageWeightBytes,
        requestCount: snap.requestCount,
        errorCode: snap.errorCode,
        errorMessage: snap.errorMessage,
        hasScreenshot: snap.screenshotStorageKey !== null,
        isBaseline,
        baselineVersion: isBaseline ? activeBaseline.version : null,
      };
    }),
    openChangeCount,
  });
}
