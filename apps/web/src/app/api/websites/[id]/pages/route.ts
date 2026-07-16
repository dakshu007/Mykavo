import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getApiContext, getOwnedWebsite, requireRole } from "@/lib/api-auth";
import { assertPageLimit, LimitError } from "@/lib/limits";
import { isSameOrigin, normalizeUrl, parseUrlInput } from "@/lib/url";
import { logger } from "@/lib/logger";

type Params = { params: Promise<{ id: string }> };

const putSchema = z.object({
  pages: z
    .array(
      z.object({
        url: z.string().trim().min(1).max(2048),
        name: z.string().trim().max(120).optional(),
      }),
    )
    .max(500),
});

/** Replace the website's monitored page set. */
export async function PUT(request: Request, { params }: Params) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  const { id } = await params;
  const website = await getOwnedWebsite(ctx, id);
  if (!website) return NextResponse.json({ error: "Not found" }, { status: 404 });

  let input: z.infer<typeof putSchema>;
  try {
    input = putSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // Validate every page: parseable, same origin as the website, deduplicated.
  const websiteOrigin = new URL(website.url);
  const seen = new Set<string>();
  const pages: Array<{ url: string; normalizedUrl: string; name: string | null }> = [];
  for (const page of input.pages) {
    const parsed = parseUrlInput(page.url);
    if (!parsed) {
      return NextResponse.json(
        { error: `Not a valid URL: ${page.url.slice(0, 100)}` },
        { status: 400 },
      );
    }
    if (!isSameOrigin(parsed, websiteOrigin)) {
      return NextResponse.json(
        { error: `Page must belong to ${websiteOrigin.hostname}: ${parsed.href.slice(0, 100)}` },
        { status: 400 },
      );
    }
    const normalized = normalizeUrl(parsed);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    pages.push({ url: parsed.href, normalizedUrl: normalized, name: page.name ?? null });
  }

  if (pages.length === 0) {
    return NextResponse.json(
      { error: "Select at least one page to monitor." },
      { status: 400 },
    );
  }

  try {
    await assertPageLimit(ctx.workspace.id, website.id, pages.length);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  // Replace the set transactionally, preserving rows whose URL is unchanged.
  const saved = await prisma.$transaction(async (tx) => {
    await tx.monitoredPage.deleteMany({
      where: {
        websiteId: website.id,
        normalizedUrl: { notIn: pages.map((p) => p.normalizedUrl) },
      },
    });
    for (const page of pages) {
      await tx.monitoredPage.upsert({
        where: {
          websiteId_normalizedUrl: {
            websiteId: website.id,
            normalizedUrl: page.normalizedUrl,
          },
        },
        create: { websiteId: website.id, ...page },
        update: { name: page.name },
      });
    }
    return tx.monitoredPage.findMany({
      where: { websiteId: website.id },
      orderBy: { createdAt: "asc" },
    });
  });

  logger.info("monitored pages updated", {
    workspaceId: ctx.workspace.id,
    websiteId: website.id,
    pages: saved.length,
  });
  return NextResponse.json({ pages: saved });
}
