import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma, applyChangeAction } from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { signMediaPath } from "@/lib/integrations/site-connection";
import { canUpdateBaseline, hasDiffImage, parseBrokenLinks } from "@/lib/mobile/mapping";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const actionSchema = z.object({
  action: z.enum(["review", "approve", "ignore", "resolve", "reopen"]),
});

/** One change of the connected website, with signed before/after/diff images. */
export async function GET(request: Request, { params }: Params) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: "Unavailable" }, { status: 503 });

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, websiteId: ctx.website.id },
    include: {
      monitoredPage: { select: { url: true, name: true } },
      previousSnapshot: { select: { id: true, screenshotStorageKey: true } },
      currentSnapshot: { select: { id: true, screenshotStorageKey: true, errorCode: true } },
    },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const base = appBaseUrl();
  const shot = (snapshot: { id: string; screenshotStorageKey: string | null } | null) =>
    snapshot?.screenshotStorageKey ? `${base}${signMediaPath("shot", snapshot.id, secret)}` : null;

  return NextResponse.json(
    {
      change: {
        id: change.id,
        title: change.title,
        description: change.description,
        severity: change.severity,
        category: change.category,
        changeType: change.changeType,
        status: change.status,
        detectedAt: change.detectedAt.toISOString(),
        previousValue: change.previousValue,
        currentValue: change.currentValue,
        brokenLinks: parseBrokenLinks(change.metadata),
        pageUrl: change.monitoredPage?.url ?? null,
        pageName: change.monitoredPage?.name ?? null,
        canUpdateBaseline: canUpdateBaseline(change),
        images: {
          before: shot(change.previousSnapshot),
          after: shot(change.currentSnapshot),
          diff: hasDiffImage(change.metadata)
            ? `${base}${signMediaPath("diff", change.id, secret)}`
            : null,
        },
        dashboardUrl: `${base}/dashboard/changes/${change.id}`,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}

/** Review / approve / ignore / resolve / reopen - the dashboard's own action. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();

  const { id } = await params;
  const change = await prisma.changeEvent.findFirst({
    where: { id, websiteId: ctx.website.id },
    select: { id: true },
  });
  if (!change) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let body: z.infer<typeof actionSchema>;
  try {
    body = actionSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  }

  const updated = await applyChangeAction(prisma, id, body.action);
  logger.info("change action applied from wordpress", {
    workspaceId: ctx.workspaceId,
    changeId: id,
    action: body.action,
    connectionId: ctx.connectionId,
  });
  return NextResponse.json({ change: { id: updated.id, status: updated.status } });
}
