import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  body: z.string().trim().min(1).max(2000),
});

/** The parent change, only if it belongs to the caller's workspace. */
async function getOwnedChange(workspaceId: string, changeId: string) {
  return prisma.changeEvent.findFirst({
    where: { id: changeId, website: { workspaceId } },
    select: { id: true },
  });
}

/** List a change's notes (read-only — viewers included). */
export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const change = await getOwnedChange(ctx.workspace.id, id);
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const notes = await prisma.changeNote.findMany({
    where: { changeEventId: id },
    include: { author: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ notes });
}

/** Add a note to a change (mutation — viewers are read-only). */
export async function POST(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const change = await getOwnedChange(ctx.workspace.id, id);
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "A note needs between 1 and 2,000 characters." },
      { status: 400 },
    );
  }

  const note = await prisma.changeNote.create({
    data: { changeEventId: id, authorId: ctx.userId, body: body.body },
    include: { author: { select: { id: true, name: true } } },
  });
  logger.info("change note added", {
    workspaceId: ctx.workspace.id,
    changeId: id,
    noteId: note.id,
  });
  return NextResponse.json({ note }, { status: 201 });
}
