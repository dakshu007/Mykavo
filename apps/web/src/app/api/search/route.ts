import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@fluxen/database";
import { getApiContext } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * Workspace-scoped search backing the ⌘K command palette. Returns up to five
 * websites, monitored pages, and change events matching the query. Empty
 * queries return empty results — the palette shows static navigation/actions
 * without hitting the network at all.
 */

const querySchema = z.object({ q: z.string().max(100) });

export async function GET(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Typed-search traffic: debounced client-side, but cap it per workspace too.
  const rl = rateLimit(`search:${ctx.workspace.id}`, { limit: 60, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  const parsed = querySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Search query is too long." }, { status: 400 });
  }

  const q = parsed.data.q.trim();
  if (!q) {
    return NextResponse.json({ websites: [], pages: [], changes: [] });
  }

  const contains = { contains: q, mode: "insensitive" as const };

  const [websites, pages, changes] = await Promise.all([
    prisma.website.findMany({
      where: {
        workspaceId: ctx.workspace.id,
        OR: [{ name: contains }, { url: contains }],
      },
      select: { id: true, name: true, url: true },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.monitoredPage.findMany({
      where: { website: { workspaceId: ctx.workspace.id }, url: contains },
      select: {
        id: true,
        url: true,
        websiteId: true,
        website: { select: { name: true } },
      },
      orderBy: { createdAt: "asc" },
      take: 5,
    }),
    prisma.changeEvent.findMany({
      where: { website: { workspaceId: ctx.workspace.id }, title: contains },
      select: { id: true, title: true, severity: true, status: true },
      orderBy: { detectedAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({
    websites,
    pages: pages.map((page) => ({
      id: page.id,
      url: page.url,
      websiteId: page.websiteId,
      websiteName: page.website.name,
    })),
    changes,
  });
}
