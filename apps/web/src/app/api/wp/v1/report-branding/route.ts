import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getWorkspacePlan } from "@/lib/limits";
import { isValidBrandColor } from "@/lib/client-report";
import { authenticateSiteRequest, unauthorizedSite } from "@/lib/integrations/site-auth";
import { BRAND_NAME_MAX_LENGTH } from "@/app/api/workspace/branding/schema";

const bodySchema = z.object({
  brandName: z.string().trim().max(BRAND_NAME_MAX_LENGTH).nullable().optional(),
  color: z.string().refine(isValidBrandColor, "Use a #rrggbb color.").nullable().optional(),
});

/**
 * WordPress plugin 1.3.1: the brand name and colour on the site report, from
 * the Reports tab. The logo is uploaded in MyKavo (Settings > Agency
 * branding), never fetched from an address the site sends.
 */
export async function PUT(request: Request) {
  const ctx = await authenticateSiteRequest(request);
  if (!ctx) return unauthorizedSite();
  // Branding is workspace-wide, but a site token speaks for one website (an
  // agency's client may hold the WordPress admin). Only a WordPress
  // connection made by a current owner or admin may change it.
  const actor = ctx.platform === "wordpress" && ctx.actingUserId
    ? await prisma.workspaceMember.findFirst({
        where: { workspaceId: ctx.workspaceId, userId: ctx.actingUserId },
        select: { role: true },
      })
    : null;
  if (!actor || (actor.role !== "OWNER" && actor.role !== "ADMIN")) {
    return NextResponse.json(
      { error: "Only a workspace owner or admin can change report branding. Change it in MyKavo under Settings > Agency branding.", reason: "ROLE" },
      { status: 403 },
    );
  }
  const plan = await getWorkspacePlan(ctx.workspaceId);
  if (!plan.limits.whiteLabelReports) {
    return NextResponse.json(
      { error: "Your branded site report comes with the Agency plan.", reason: "PLAN" },
      { status: 403 },
    );
  }
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const data: { brandName?: string | null; brandColor?: string | null } = {};
  if (parsed.data.brandName !== undefined) data.brandName = parsed.data.brandName || null;
  if (parsed.data.color !== undefined) data.brandColor = parsed.data.color;
  const workspace = await prisma.workspace.update({
    where: { id: ctx.workspaceId },
    data,
    select: { brandName: true, brandColor: true },
  });
  return NextResponse.json({ branding: { name: workspace.brandName, color: workspace.brandColor } });
}
