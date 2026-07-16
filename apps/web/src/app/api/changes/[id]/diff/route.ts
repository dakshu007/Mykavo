import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { getApiContext } from "@/lib/api-auth";

type Params = { params: Promise<{ id: string }> };

/** Serve a change event's visual diff PNG - authorized via workspace ownership. */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    select: { metadata: true },
  });
  const key =
    change?.metadata && typeof change.metadata === "object"
      ? (change.metadata as Record<string, unknown>).diffStorageKey
      : null;
  if (typeof key !== "string") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const storage = getDefaultStorage();
  const data = await storage.get(key);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return new NextResponse(new Uint8Array(data), {
    headers: { "content-type": "image/png", "cache-control": "private, max-age=3600" },
  });
}
