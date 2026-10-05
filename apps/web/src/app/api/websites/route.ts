import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { rateLimit } from "@/lib/security/rate-limit";
import { createWebsite } from "@/lib/website-create";

export async function GET() {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const websites = await prisma.website.findMany({
    where: { workspaceId: ctx.workspace.id },
    include: { _count: { select: { monitoredPages: true } } },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json({ websites });
}

const createSchema = z.object({
  url: z.string().trim().min(1).max(2048),
  name: z.string().trim().max(120).optional(),
});

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const denied = requireRole(ctx, "OWNER", "ADMIN", "MEMBER");
  if (denied) return denied;

  // Website creation resolves DNS + fetches the target - cap it per workspace.
  const rl = rateLimit(`website-create:${ctx.workspace.id}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again." },
      { status: 429, headers: { "retry-after": String(rl.retryAfterSeconds) } },
    );
  }

  let input: z.infer<typeof createSchema>;
  try {
    input = createSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Please enter a valid URL." }, { status: 400 });
  }

  const result = await createWebsite(ctx.workspace.id, { url: input.url, name: input.name });
  if (!result.ok) {
    const status = result.reason === "LIMIT" ? 403 : result.reason === "EXISTS" ? 409 : 400;
    return NextResponse.json(
      { error: result.error, ...(result.reason === "LIMIT" && result.code ? { code: result.code } : {}) },
      { status },
    );
  }
  const website = result.website;

  return NextResponse.json({ website }, { status: 201 });
}
