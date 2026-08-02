/**
 * Server-side GSC helpers for the web app: config gate, workspace-scoped
 * connection lookup, and access-token retrieval with auto-refresh (rotated
 * tokens re-encrypted and persisted). Tokens are never returned to clients.
 */

import { prisma, type GscConnection } from "@mykavo/database";
import { decryptToken, encryptToken, refreshAccessToken } from "@mykavo/shared";
import { env } from "@/lib/env";

export function gscConfigured(): boolean {
  return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GSC_TOKEN_KEY);
}

export function gscKey(): string {
  if (!env.GSC_TOKEN_KEY) throw new Error("GSC_TOKEN_KEY not configured");
  return env.GSC_TOKEN_KEY;
}

/** Connection for a website the workspace owns, or null. */
export async function getGscConnection(
  workspaceId: string,
  websiteId: string,
): Promise<GscConnection | null> {
  return prisma.gscConnection.findFirst({
    where: { websiteId, website: { workspaceId } },
  });
}

/** Decrypted, refreshed-if-stale access token for API calls. */
export async function gscAccessToken(connection: GscConnection): Promise<string> {
  if (connection.expiresAt > new Date(Date.now() + 2 * 60 * 1000)) {
    return decryptToken(connection.accessTokenEnc, gscKey());
  }
  const tokens = await refreshAccessToken({
    refreshToken: decryptToken(connection.refreshTokenEnc, gscKey()),
    clientId: env.GOOGLE_CLIENT_ID!,
    clientSecret: env.GOOGLE_CLIENT_SECRET!,
  });
  await prisma.gscConnection.update({
    where: { id: connection.id },
    data: {
      accessTokenEnc: encryptToken(tokens.accessToken, gscKey()),
      expiresAt: tokens.expiresAt,
      ...(tokens.refreshToken
        ? { refreshTokenEnc: encryptToken(tokens.refreshToken, gscKey()) }
        : {}),
    },
  });
  return tokens.accessToken;
}
