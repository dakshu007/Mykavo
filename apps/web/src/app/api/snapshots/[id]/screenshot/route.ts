import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getDefaultStorage } from "@fluxen/scanner/storage";
import { getApiContext } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** Serve a snapshot's screenshot — authorized via workspace ownership. */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const snapshot = await prisma.pageSnapshot.findFirst({
    where: { id, scan: { website: { workspaceId: ctx.workspace.id } } },
    select: { screenshotStorageKey: true },
  });
  if (!snapshot?.screenshotStorageKey) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storage = getDefaultStorage();
  const data = await storage.get(snapshot.screenshotStorageKey);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": "image/jpeg",
      "cache-control": "private, max-age=3600",
    },
  });
}
