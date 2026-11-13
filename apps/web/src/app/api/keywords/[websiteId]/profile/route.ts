import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { profileInput } from "@mykavo/keyword-agent/pure";
import { getOwnedWebsite } from "@/lib/api-auth";
import { agentContext, readBody } from "@/lib/keywords/api";

type Params = { params: Promise<{ websiteId: string }> };

/**
 * PUT: save (and confirm) the business details. Works with or without the
 * AI setup having run, so a user can always fill the five fields by hand.
 */
export async function PUT(request: Request, { params }: Params) {
  const gate = await agentContext({ mutate: true, bucket: "profile", limit: 20 });
  if (!gate.ok) return gate.response;
  const { websiteId } = await params;
  const website = await getOwnedWebsite(gate.ctx, websiteId);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = profileInput.safeParse(await readBody(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Check the fields: each needs a short answer, and country and language are 2-letter codes." }, { status: 400 });
  }
  const data = {
    ...parsed.data,
    country: parsed.data.country.toUpperCase(),
    language: parsed.data.language.toLowerCase(),
    confirmed: true,
  };
  const saved = await prisma.contentProfile.upsert({
    where: { websiteId: website.id },
    create: { ...data, websiteId: website.id, workspaceId: gate.ctx.workspace.id, pages: [{ url: website.url, title: website.name }] },
    update: data,
    select: { id: true, confirmed: true },
  });
  return NextResponse.json(saved);
}
