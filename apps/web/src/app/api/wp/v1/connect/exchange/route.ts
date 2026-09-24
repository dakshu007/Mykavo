import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@mykavo/database";
import { appBaseUrl } from "@/lib/app-url";
import {
  bareHost,
  newAccessToken,
  sha256Hex,
  verifyPkce,
} from "@/lib/integrations/site-connection";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

const bodySchema = z.object({
  code: z.string().min(20).max(200),
  verifier: z.string().min(43).max(128),
  site: z.string().min(1).max(2048),
});

function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "unknown";
}

function hostOf(url: string): string | null {
  try {
    return bareHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

/** Every failure looks the same from outside - no hints for a guesser. */
function refused() {
  return NextResponse.json(
    { error: "This connect link expired or was already used. Start again from WordPress.", code: "INVALID_GRANT" },
    { status: 400 },
  );
}

/**
 * Called by the WordPress SERVER (not the browser) to finish connecting:
 * one-time code + PKCE verifier in, site-scoped access token out. The code
 * is consumed atomically, so it can be exchanged exactly once.
 */
export async function POST(request: Request) {
  const rl = rateLimit(`wp-exchange:${clientIp(request)}`, { limit: 20, windowMs: 60_000 });
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many attempts. Wait a minute." }, { status: 429 });
  }

  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await request.json());
  } catch {
    return refused();
  }

  const now = new Date();
  const pending = await prisma.siteConnection.findUnique({
    where: { codeHash: sha256Hex(body.code) },
    select: {
      id: true,
      websiteId: true,
      siteUrl: true,
      codeChallenge: true,
      codeExpiresAt: true,
      tokenHash: true,
      revokedAt: true,
      website: { select: { id: true, name: true, url: true } },
      workspace: { select: { name: true } },
    },
  });
  if (
    !pending ||
    pending.tokenHash ||
    pending.revokedAt ||
    !pending.codeChallenge ||
    !pending.codeExpiresAt ||
    pending.codeExpiresAt < now ||
    !verifyPkce(body.verifier, pending.codeChallenge) ||
    hostOf(body.site) === null ||
    hostOf(body.site) !== hostOf(pending.siteUrl)
  ) {
    return refused();
  }

  const token = newAccessToken();
  // Consume the code and issue the token in one conditional write: a second
  // exchange racing this one matches zero rows.
  const issued = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteConnection.updateMany({
      where: { id: pending.id, codeHash: sha256Hex(body.code), tokenHash: null },
      data: {
        tokenHash: sha256Hex(token),
        tokenPrefix: token.slice(0, 12),
        codeHash: null,
        codeChallenge: null,
        codeExpiresAt: null,
        connectedAt: now,
      },
    });
    if (updated.count !== 1) return false;
    // Reconnecting the same site replaces its old token rather than
    // leaving a second live credential behind.
    await tx.siteConnection.updateMany({
      where: {
        websiteId: pending.websiteId,
        platform: "wordpress",
        siteUrl: pending.siteUrl,
        id: { not: pending.id },
        revokedAt: null,
      },
      data: { revokedAt: now },
    });
    return true;
  });
  if (!issued) return refused();

  logger.info("wordpress connection completed", { websiteId: pending.websiteId, connectionId: pending.id });
  return NextResponse.json({
    token,
    website: pending.website,
    workspace: { name: pending.workspace.name },
    dashboardUrl: `${appBaseUrl()}/dashboard/websites/${pending.websiteId}`,
  });
}
