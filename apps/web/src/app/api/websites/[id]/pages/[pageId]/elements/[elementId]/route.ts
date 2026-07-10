import { NextResponse } from "next/server";
import { prisma, type MonitoredElement } from "@fluxen/database";
import { getApiContext, getOwnedMonitoredPage, type ApiContext, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { updateElementSchema, normalizePin } from "@/lib/monitored-elements";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string; pageId: string; elementId: string }> };

/** Load an element scoped to a page the caller's workspace owns. */
async function getOwnedElement(
  ctx: ApiContext,
  websiteId: string,
  pageId: string,
  elementId: string,
): Promise<MonitoredElement | null> {
  const page = await getOwnedMonitoredPage(ctx, websiteId, pageId);
  if (!page) return null;
  return prisma.monitoredElement.findFirst({
    where: { id: elementId, monitoredPageId: page.id },
  });
}

export async function PATCH(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id, pageId, elementId } = await params;
  const element = await getOwnedElement(ctx, id, pageId, elementId);
  if (!element) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const plan = await getWorkspacePlan(ctx.workspace.id);
  if (!plan.limits.conversionElementMonitoring) {
    return NextResponse.json(
      { error: "Conversion element monitoring is a Pro feature." },
      { status: 403 },
    );
  }

  let input: ReturnType<typeof updateElementSchema.parse>;
  try {
    input = updateElementSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const updated = await prisma.monitoredElement.update({
    where: { id: element.id },
    data: {
      name: input.name,
      selector: input.selector,
      importance: input.importance,
      expectedExistence: input.expectedExistence,
      expectedVisibility: input.expectedVisibility,
      // undefined = leave unchanged; "" = clear the pin.
      expectedText: normalizePin(input.expectedText),
      expectedHref: normalizePin(input.expectedHref),
      enabled: input.enabled,
    },
  });

  return NextResponse.json({ element: updated });
}

/** Delete is always allowed (so downgraded workspaces can still clean up). */
export async function DELETE(_request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id, pageId, elementId } = await params;
  const element = await getOwnedElement(ctx, id, pageId, elementId);
  if (!element) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.monitoredElement.delete({ where: { id: element.id } });
  logger.info("monitored element deleted", {
    workspaceId: ctx.workspace.id,
    websiteId: id,
    monitoredPageId: pageId,
    monitoredElementId: elementId,
  });
  return NextResponse.json({ ok: true });
}
