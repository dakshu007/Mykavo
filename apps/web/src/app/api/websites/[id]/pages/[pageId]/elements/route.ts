import { NextResponse } from "next/server";
import { prisma } from "@fluxen/database";
import { getApiContext, getOwnedMonitoredPage, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import {
  createElementSchema,
  normalizePin,
  MAX_ELEMENTS_PER_PAGE,
} from "@/lib/monitored-elements";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; pageId: string }> };

/** Create a conversion element to monitor on a page (Pro only, spec §23). */
export async function POST(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id, pageId } = await params;
  const page = await getOwnedMonitoredPage(ctx, id, pageId);
  if (!page) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await getWorkspacePlan(ctx.workspace.id);
  if (!plan.limits.conversionElementMonitoring) {
    return NextResponse.json(
      {
        error:
          "Conversion element monitoring is a Pro feature. Upgrade to monitor buttons, forms, and CTAs.",
      },
      { status: 403 },
    );
  }

  let input: ReturnType<typeof createElementSchema.parse>;
  try {
    input = createElementSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const count = await prisma.monitoredElement.count({ where: { monitoredPageId: page.id } });
  if (count >= MAX_ELEMENTS_PER_PAGE) {
    return NextResponse.json(
      { error: `Each page can monitor up to ${MAX_ELEMENTS_PER_PAGE} elements.` },
      { status: 400 },
    );
  }

  const element = await prisma.monitoredElement.create({
    data: {
      monitoredPageId: page.id,
      name: input.name,
      selector: input.selector,
      importance: input.importance,
      expectedExistence: input.expectedExistence,
      expectedVisibility: input.expectedVisibility,
      expectedText: normalizePin(input.expectedText) ?? null,
      expectedHref: normalizePin(input.expectedHref) ?? null,
    },
  });

  logger.info("monitored element created", {
    workspaceId: ctx.workspace.id,
    websiteId: id,
    monitoredPageId: page.id,
    monitoredElementId: element.id,
  });
  return NextResponse.json({ element }, { status: 201 });
}
