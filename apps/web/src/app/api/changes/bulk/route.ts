import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, changeActionData, type ChangeAction } from "@fluxen/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(100),
  action: z.enum(["REVIEWED", "APPROVED", "IGNORED"]),
});

/** Target status → the same triage action the single-change PATCH applies. */
const ACTION_FOR_STATUS: Record<z.infer<typeof bodySchema>["action"], ChangeAction> = {
  REVIEWED: "review",
  APPROVED: "approve",
  IGNORED: "ignore",
};

/**
 * Bulk triage: apply one action to up to 100 change events at once. The ids
 * are never trusted — the update is scoped to the caller's workspace, and the
 * status/timestamp transition is the exact `changeActionData` payload the
 * single-change PATCH uses.
 */
export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return NextResponse.json(
      { error: "Provide 1–100 change ids and an action (REVIEWED, APPROVED, or IGNORED)." },
      { status: 400 },
    );
  }

  const result = await prisma.changeEvent.updateMany({
    where: {
      id: { in: body.ids },
      website: { workspaceId: ctx.workspace.id },
    },
    data: changeActionData(ACTION_FOR_STATUS[body.action]),
  });

  logger.info("bulk change action applied", {
    workspaceId: ctx.workspace.id,
    action: body.action,
    requested: body.ids.length,
    updated: result.count,
  });
  return NextResponse.json({ updated: result.count });
}
