import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { assertCanAddWebsite, LimitError } from "@/lib/limits";
import { rateLimit } from "@/lib/security/rate-limit";
import { assertSafeUrl, UnsafeUrlError } from "@/lib/security/ssrf";
import { normalizeUrl, parseUrlInput } from "@/lib/url";
import { logger } from "@/lib/logger";

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

  const parsed = parseUrlInput(input.url);
  if (!parsed) {
    return NextResponse.json(
      { error: "That doesn't look like a valid URL." },
      { status: 400 },
    );
  }

  try {
    await assertSafeUrl(parsed.href);
  } catch (err) {
    const message =
      err instanceof UnsafeUrlError && err.code === "DNS_FAILURE"
        ? "We couldn't resolve that hostname. Check the spelling and try again."
        : "This URL can't be monitored.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    await assertCanAddWebsite(ctx.workspace.id);
  } catch (err) {
    if (err instanceof LimitError) {
      return NextResponse.json({ error: err.message, code: err.code }, { status: 403 });
    }
    throw err;
  }

  const normalized = normalizeUrl(parsed, { stripAllParams: true });
  const existing = await prisma.website.findUnique({
    where: {
      workspaceId_normalizedUrl: {
        workspaceId: ctx.workspace.id,
        normalizedUrl: normalized,
      },
    },
  });
  if (existing) {
    return NextResponse.json(
      { error: "This website is already in your workspace." },
      { status: 409 },
    );
  }

  const website = await prisma.website.create({
    data: {
      workspaceId: ctx.workspace.id,
      name: input.name || parsed.hostname.replace(/^www\./, ""),
      url: parsed.href,
      normalizedUrl: normalized,
      status: "PENDING",
    },
  });

  logger.info("website added", {
    workspaceId: ctx.workspace.id,
    websiteId: website.id,
  });
  return NextResponse.json({ website }, { status: 201 });
}
