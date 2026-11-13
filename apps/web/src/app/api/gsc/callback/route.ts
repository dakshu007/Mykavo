import { NextResponse } from "next/server";
import { enqueueGscSync } from "@/lib/queue";
import { prisma } from "@mykavo/database";
import { encryptToken, exchangeAuthCode, verifyOauthState } from "@mykavo/shared";
import { getApiContext } from "@/lib/api-auth";
import { gscConfigured, gscKey } from "@/lib/gsc";
import { appBaseUrl } from "@/lib/app-url";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * OAuth callback: verify the HMAC state, exchange the code, store encrypted
 * tokens (property chosen in a second step), then bounce to the dashboard.
 */
export async function GET(request: Request) {
  const ctx = await getApiContext();
  const url = new URL(request.url);
  const fail = (reason: string) =>
    NextResponse.redirect(`${appBaseUrl()}/dashboard/search-console?error=${reason}`);

  if (!ctx || !gscConfigured()) return fail("auth");
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!code || !state) return fail("denied");
  const websiteId = verifyOauthState(state, gscKey());
  if (!websiteId) return fail("state");
  const website = await prisma.website.findFirst({
    where: { id: websiteId, workspaceId: ctx.workspace.id },
    select: { id: true },
  });
  if (!website) return fail("website");

  try {
    const tokens = await exchangeAuthCode({
      code,
      clientId: env.GOOGLE_CLIENT_ID!,
      clientSecret: env.GOOGLE_CLIENT_SECRET!,
      redirectUri: `${appBaseUrl()}/api/gsc/callback`,
    });
    if (!tokens.refreshToken) return fail("norefresh");
    const data = {
      connectedById: ctx.userId,
      accessTokenEnc: encryptToken(tokens.accessToken, gscKey()),
      refreshTokenEnc: encryptToken(tokens.refreshToken, gscKey()),
      expiresAt: tokens.expiresAt,
      lastError: null,
    };
    const saved = await prisma.gscConnection.upsert({
      where: { websiteId: website.id },
      create: { websiteId: website.id, ...data },
      update: data,
      select: { property: true },
    });
    logger.info("gsc connected", { websiteId: website.id, workspaceId: ctx.workspace.id });
    // A reconnect keeps the property chosen before: no setup step, and fresh
    // data straight away instead of at the next daily sync.
    if (saved.property) {
      await enqueueGscSync({ websiteId: website.id }).catch((err) =>
        logger.error("gsc sync enqueue after reconnect failed", { websiteId: website.id }, err),
      );
      return NextResponse.redirect(`${appBaseUrl()}/dashboard/search-console/${website.id}?reconnected=1`);
    }
    return NextResponse.redirect(
      `${appBaseUrl()}/dashboard/search-console/${website.id}?setup=1`,
    );
  } catch (err) {
    logger.error("gsc oauth exchange failed", { websiteId }, err);
    return fail("exchange");
  }
}
