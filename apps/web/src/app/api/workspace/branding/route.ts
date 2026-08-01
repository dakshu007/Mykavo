import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { prisma } from "@mykavo/database";
import { getDefaultStorage } from "@mykavo/scanner/storage";
import { getApiContext, requireRole } from "@/lib/api-auth";
import { getWorkspacePlan } from "@/lib/limits";
import { logger } from "@/lib/logger";
import { BRAND_NAME_MAX_LENGTH, brandingUpdateSchema } from "./schema";

/**
 * Workspace branding for white-label client reports (Pro, spec §37). Logos
 * follow the avatar pattern: bytes go to object storage under an unguessable
 * name, Postgres stores only the served /api/brand-logos/<name> path, and a
 * replaced or removed logo deletes the old object.
 */

const LOGO_URL_PATTERN = /^\/api\/brand-logos\/([a-f0-9]{32}\.(?:jpg|png))$/;

async function deleteStoredLogo(logoUrl: string | null): Promise<void> {
  const match = logoUrl?.match(LOGO_URL_PATTERN);
  if (!match) return;
  try {
    await getDefaultStorage().delete(`brand-logos/${match[1]}`);
  } catch (err) {
    logger.warn("stale brand logo delete failed", {
      key: match[1],
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function POST(request: Request) {
  const ctx = await getApiContext();
  if (!ctx) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Branding speaks for the whole agency - members can't rewrite it.
  const denied = requireRole(ctx, "OWNER", "ADMIN");
  if (denied) return denied;

  // Server-side plan gate (spec §39): white-label branding is Pro.
  const plan = await getWorkspacePlan(ctx.workspace.id);
  if (!plan.limits.whiteLabelReports) {
    return NextResponse.json(
      { error: "White-label reports are a Pro feature. Upgrade to brand your client reports." },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = brandingUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: `Enter a name up to ${BRAND_NAME_MAX_LENGTH} characters, a #rrggbb color, and a JPEG or PNG logo under 200 KB.`,
      },
      { status: 400 },
    );
  }

  const { brandName, brandColor, logo } = parsed.data;
  const current = await prisma.workspace.findUnique({
    where: { id: ctx.workspace.id },
    select: { brandLogoUrl: true },
  });

  let logoUpdate: { brandLogoUrl: string | null } | Record<string, never> = {};
  if (logo === null) {
    await deleteStoredLogo(current?.brandLogoUrl ?? null);
    logoUpdate = { brandLogoUrl: null };
  } else if (typeof logo === "string") {
    const [header, base64] = logo.split(",", 2);
    const extension = header.includes("image/png") ? "png" : "jpg";
    const name = randomBytes(16).toString("hex");
    await getDefaultStorage().put(
      `brand-logos/${name}.${extension}`,
      Buffer.from(base64, "base64"),
      extension === "png" ? "image/png" : "image/jpeg",
    );
    await deleteStoredLogo(current?.brandLogoUrl ?? null);
    logoUpdate = { brandLogoUrl: `/api/brand-logos/${name}.${extension}` };
  }

  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: { brandName, brandColor, ...logoUpdate },
  });

  logger.info("workspace branding updated", {
    workspaceId: ctx.workspace.id,
    logo: logo === undefined ? "unchanged" : logo === null ? "removed" : "replaced",
  });
  return NextResponse.json({ ok: true });
}
