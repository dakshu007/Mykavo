import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getApiContext } from "@/lib/api-auth";
import {
  canUpdateBaseline,
  hasDiffImage,
  parseBrokenLinks,
} from "@/lib/mobile/mapping";

type Params = { params: Promise<{ id: string }> };

/**
 * Mobile change detail: the full change with notes, broken-link metadata, and
 * update-baseline eligibility. Mirrors dashboard/changes/[id]/page.tsx;
 * implements ChangeDetailResponse in apps/mobile/src/lib/types.ts. Read-only.
 */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    include: {
      website: { select: { name: true, url: true } },
      monitoredPage: { select: { url: true } },
      currentSnapshot: { select: { errorCode: true } },
      notes: {
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
    change: {
      id: change.id,
      title: change.title,
      description: change.description,
      severity: change.severity,
      category: change.category,
      status: change.status,
      changeType: change.changeType,
      detectedAt: change.detectedAt.toISOString(),
      previousValue: change.previousValue,
      currentValue: change.currentValue,
      brokenLinks: parseBrokenLinks(change.metadata),
      websiteId: change.websiteId,
      websiteName: change.website.name,
      websiteUrl: change.website.url,
      pageUrl: change.monitoredPage?.url ?? null,
      previousSnapshotId: change.previousSnapshotId,
      currentSnapshotId: change.currentSnapshotId,
      hasDiff: hasDiffImage(change.metadata),
      canUpdateBaseline: canUpdateBaseline(change),
      notes: change.notes.map((note) => ({
        id: note.id,
        body: note.body,
        authorName: note.author.name,
        createdAt: note.createdAt.toISOString(),
      })),
    },
  });
}
