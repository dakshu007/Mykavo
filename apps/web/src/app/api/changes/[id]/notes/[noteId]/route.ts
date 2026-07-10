import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; noteId: string }> };

/**
 * Delete a note. Allowed for the note's author, or for workspace
 * OWNER/ADMIN moderating the thread.
 */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id, noteId } = await params;
  const note = await prisma.changeNote.findFirst({
    where: {
      id: noteId,
      changeEventId: id,
      changeEvent: { website: { workspaceId: ctx.workspace.id } },
    },
    select: { id: true, authorId: true },
  });
  if (!note) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const canDelete =
    note.authorId === ctx.userId || ctx.role === "OWNER" || ctx.role === "ADMIN";
  if (!canDelete) {
    return NextResponse.json(
      { error: "Only the note's author or a workspace admin can delete it." },
      { status: 403 },
    );
  }

  await prisma.changeNote.delete({ where: { id: noteId } });
  logger.info("change note deleted", {
    workspaceId: ctx.workspace.id,
    changeId: id,
    noteId,
  });
  return NextResponse.json({ deleted: true });
}
