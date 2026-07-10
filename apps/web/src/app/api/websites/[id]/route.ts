import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const website = await prisma.website.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { monitoredPages: { orderBy: { createdAt: "asc" } } },
  });
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ website });
}

const patchSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  scanFrequency: z.enum(["WEEKLY", "DAILY"]).optional(),
  paused: z.boolean().optional(),
  // Maintenance window (spec §25): mute alerts for N hours; null = unmute.
  muteHours: z.union([z.literal(1), z.literal(8), z.literal(24)]).nullable().optional(),
  // Public status badge; enabling mints a token once, disabling keeps it.
  badgeEnabled: z.boolean().optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let input: z.infer<typeof patchSchema>;
  try {
    input = patchSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Scan frequency is plan-gated: Free = weekly only (spec §37).
  if (input.scanFrequency === "DAILY") {
    const plan = await getWorkspacePlan(ctx.workspace.id);
    if (plan.limits.scanFrequency !== "DAILY") {
      return NextResponse.json(
        { error: `Daily scans require a paid plan. Your ${plan.name} plan scans weekly.` },
        { status: 403 },
      );
    }
  }

  const updated = await prisma.website.update({
    where: { id: website.id },
    data: {
      name: input.name,
      scanFrequency: input.scanFrequency,
      status:
        input.paused === undefined
          ? undefined
          : input.paused
            ? "PAUSED"
            : "PENDING",
      muteAlertsUntil:
        input.muteHours === undefined
          ? undefined
          : input.muteHours === null
            ? null
            : new Date(Date.now() + input.muteHours * 60 * 60 * 1000),
      badgeEnabled: input.badgeEnabled,
      // The badge URL identifier — opaque, never the website id (spec §59).
      publicToken:
        input.badgeEnabled === true && !website.publicToken
          ? randomBytes(18).toString("base64url")
          : undefined,
    },
  });

  return NextResponse.json({ website: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.website.delete({ where: { id: website.id } });
  logger.info("website deleted", {
    workspaceId: ctx.workspace.id,
    websiteId: website.id,
  });
  return NextResponse.json({ ok: true });
}
