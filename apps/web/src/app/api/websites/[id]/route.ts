import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedWebsite } from "@/lib/api-auth";
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
});

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    },
  });

  return NextResponse.json({ website: updated });
}

export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
