import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { brandKitEdit } from "@mykavo/brand-video/pure";
import { getOwnedWebsite } from "@/lib/api-auth";
import { noStore, readBody, videoContext } from "@/lib/brand-video/api";
import { kitView } from "@/lib/brand-video/data";
import { toJson } from "@/lib/brand-video/jobs";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ websiteId: string }> };

/** GET: the brand kit (null until the first capture) and any refresh in progress. */
export async function GET(_request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: false, bucket: "read", limit: 120 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const [kit, job] = await Promise.all([
    prisma.brandKit.findUnique({ where: { websiteId: website.id } }),
    prisma.aiJob.findFirst({
      where: { websiteId: website.id, kind: "brand" },
      orderBy: { createdAt: "desc" },
      select: { id: true, kind: true, status: true, step: true, progress: true, error: true },
    }),
  ]);
  return NextResponse.json({ kit: kit ? await kitView(kit) : null, job }, { headers: noStore });
}

/** PATCH: the owner's edits. An edited kit is never overwritten by a scan. */
export async function PATCH(request: Request, { params }: Params) {
  const gate = await videoContext({ mutate: true, bucket: "kit", limit: 30 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const parsed = brandKitEdit.safeParse(await readBody(request));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json({ error: issue ? `${issue.path.join(".") || "Kit"}: ${issue.message}` : "Check the brand kit." }, { status: 400 });
  }
  const kit = await prisma.brandKit.findUnique({ where: { websiteId: website.id }, select: { id: true } });
  if (!kit) return NextResponse.json({ error: "The brand kit isn't ready yet." }, { status: 409 });
  const d = parsed.data;
  const saved = await prisma.brandKit.update({
    where: { websiteId: website.id },
    data: {
      name: d.name,
      headline: d.headline,
      description: d.description,
      ctaText: d.ctaText,
      ctaUrl: d.ctaUrl,
      valuePoints: toJson(d.valuePoints),
      stats: toJson(d.stats),
      services: d.services,
      colors: toJson(d.colors),
      headingFont: d.headingFont,
      bodyFont: d.bodyFont,
      editedAt: new Date(),
    },
  });
  logger.info("brand kit edited", { websiteId: website.id, workspaceId: gate.ctx.workspace.id });
  return NextResponse.json({ kit: await kitView(saved) }, { headers: noStore });
}
