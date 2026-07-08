import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, applyChangeAction } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const bodySchema = z.object({
  action: z.enum(["review", "approve", "ignore", "resolve", "reopen"]),
});

/** Triage a change event (review / approve / ignore / resolve / reopen). */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, website: { workspaceId: ctx.workspace.id } },
    select: { id: true },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const updated = await applyChangeAction(prisma, id, body.action);
  logger.info("change action applied", {
    workspaceId: ctx.workspace.id,
    changeId: id,
    action: body.action,
  });
  return NextResponse.json({ change: updated });
}
