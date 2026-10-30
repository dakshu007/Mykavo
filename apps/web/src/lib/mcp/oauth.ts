import { prisma } from "@mykavo/database";
import { touchActivity } from "@/lib/activity/record";
import {
  ACCESS_TOKEN_PREFIX,
  ACCESS_TTL_MS,
  CLIENT_SECRET_PREFIX,
  CODE_TTL_MS,
  MCP_SCOPE,
  REFRESH_TOKEN_PREFIX,
  REFRESH_TTL_MS,
  randomToken,
  sameHash,
  sha256,
  verifyPkce,
  type ClientRegistration,
} from "./oauth-core";

/**
 * The database side of MCP OAuth: registering apps, issuing codes and
 * tokens, and turning a bearer token back into a workspace. Every secret is
 * stored as a SHA-256 hash only; codes are single-use and refresh tokens
 * rotate, so a leaked one is useful once at most.
 */

const LAST_USED_WRITE_INTERVAL_MS = 5 * 60 * 1000;

export interface OAuthTokenSet {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export type TokenError = { error: "invalid_grant" | "invalid_client" | "invalid_request"; description: string };

export async function registerClient(reg: ClientRegistration) {
  const id = randomToken("mko_ci_").slice(0, 40);
  const secret = reg.authMethod === "none" ? null : randomToken(CLIENT_SECRET_PREFIX);
  const client = await prisma.oAuthClient.create({
    data: { id, name: reg.name, redirectUris: reg.redirectUris, secretHash: secret ? sha256(secret) : null },
    select: { id: true, createdAt: true },
  });
  return { clientId: client.id, clientSecret: secret, issuedAt: client.createdAt };
}

export function findClient(clientId: string) {
  return prisma.oAuthClient.findUnique({
    where: { id: clientId },
    select: { id: true, name: true, redirectUris: true, secretHash: true },
  });
}

/**
 * A confidential client must present its secret; a public one (PKCE only)
 * must not need one. Returns the client or null.
 */
export async function authenticateClient(clientId: string, secret: string | null) {
  const client = await findClient(clientId);
  if (!client) return null;
  if (client.secretHash) {
    if (!secret || !sameHash(sha256(secret), client.secretHash)) return null;
  }
  return client;
}

/**
 * The person approved the app for this workspace: reuse their active grant
 * for the same app and workspace (one row per connection in the dashboard),
 * then issue a single-use code bound to the redirect URI and PKCE challenge.
 */
export async function issueCode(input: {
  clientId: string;
  workspaceId: string;
  userId: string;
  redirectUri: string;
  codeChallenge: string;
}): Promise<string> {
  const existing = await prisma.oAuthGrant.findFirst({
    where: { clientId: input.clientId, workspaceId: input.workspaceId, userId: input.userId, revokedAt: null },
    select: { id: true },
  });
  const grantId =
    existing?.id ??
    (
      await prisma.oAuthGrant.create({
        data: { clientId: input.clientId, workspaceId: input.workspaceId, userId: input.userId, scope: MCP_SCOPE },
        select: { id: true },
      })
    ).id;
  const code = randomToken("mko_ac_");
  await prisma.oAuthCode.create({
    data: {
      codeHash: sha256(code),
      grantId,
      clientId: input.clientId,
      redirectUri: input.redirectUri,
      codeChallenge: input.codeChallenge,
      expiresAt: new Date(Date.now() + CODE_TTL_MS),
    },
  });
  return code;
}

async function issueTokens(grantId: string): Promise<OAuthTokenSet> {
  const access = randomToken(ACCESS_TOKEN_PREFIX);
  const refresh = randomToken(REFRESH_TOKEN_PREFIX);
  const now = Date.now();
  await prisma.oAuthToken.create({
    data: {
      grantId,
      accessHash: sha256(access),
      refreshHash: sha256(refresh),
      accessExpiresAt: new Date(now + ACCESS_TTL_MS),
      refreshExpiresAt: new Date(now + REFRESH_TTL_MS),
    },
  });
  // Housekeeping for this grant only: rotated or expired rows are dead weight.
  void prisma.oAuthToken
    .deleteMany({
      where: {
        grantId,
        OR: [
          { refreshExpiresAt: { lt: new Date(now) }, accessExpiresAt: { lt: new Date(now) } },
          { revokedAt: { lt: new Date(now - 24 * 60 * 60 * 1000) } },
        ],
      },
    })
    .catch(() => undefined);
  return {
    access_token: access,
    token_type: "Bearer",
    expires_in: Math.floor(ACCESS_TTL_MS / 1000),
    refresh_token: refresh,
    scope: MCP_SCOPE,
  };
}

export async function exchangeCode(input: {
  code: string;
  clientId: string;
  redirectUri: string;
  verifier: string;
}): Promise<OAuthTokenSet | TokenError> {
  const codeHash = sha256(input.code);
  const row = await prisma.oAuthCode.findUnique({
    where: { codeHash },
    select: {
      clientId: true,
      redirectUri: true,
      codeChallenge: true,
      expiresAt: true,
      usedAt: true,
      grant: { select: { id: true, revokedAt: true } },
    },
  });
  const invalid: TokenError = { error: "invalid_grant", description: "The authorization code is invalid, expired or already used." };
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return invalid;
  if (row.clientId !== input.clientId || row.redirectUri !== input.redirectUri) return invalid;
  if (!verifyPkce(input.verifier, row.codeChallenge)) {
    return { error: "invalid_grant", description: "The code_verifier does not match the code_challenge." };
  }
  if (row.grant.revokedAt) return invalid;
  // Single use, even under a race: only one request can flip usedAt.
  const claimed = await prisma.oAuthCode.updateMany({ where: { codeHash, usedAt: null }, data: { usedAt: new Date() } });
  if (claimed.count !== 1) return invalid;
  return issueTokens(row.grant.id);
}

export async function refreshTokens(input: { refreshToken: string; clientId: string }): Promise<OAuthTokenSet | TokenError> {
  const refreshHash = sha256(input.refreshToken);
  const row = await prisma.oAuthToken.findUnique({
    where: { refreshHash },
    select: { id: true, refreshExpiresAt: true, revokedAt: true, grant: { select: { id: true, clientId: true, revokedAt: true } } },
  });
  const invalid: TokenError = { error: "invalid_grant", description: "The refresh token is invalid, expired or revoked." };
  const now = new Date();
  if (!row || row.revokedAt || row.grant.revokedAt || row.refreshExpiresAt.getTime() < now.getTime()) return invalid;
  if (row.grant.clientId !== input.clientId) return invalid;
  // Rotation: the old refresh token works exactly once. Its access token
  // keeps working until it expires (at most an hour), as OAuth expects;
  // revokedAt is kept for real revocation, which ends both at once.
  const rotated = await prisma.oAuthToken.updateMany({
    where: { id: row.id, revokedAt: null, refreshExpiresAt: { gt: now } },
    data: { refreshExpiresAt: now },
  });
  if (rotated.count !== 1) return invalid;
  return issueTokens(row.grant.id);
}

/** RFC 7009: revoking either token ends that token pair. Unknown tokens are fine. */
export async function revokeToken(token: string, clientId: string): Promise<void> {
  const hash = sha256(token);
  await prisma.oAuthToken.updateMany({
    where: { OR: [{ accessHash: hash }, { refreshHash: hash }], revokedAt: null, grant: { clientId } },
    data: { revokedAt: new Date() },
  });
}

/** Disconnect an app from the dashboard: the grant and all its tokens. */
export async function revokeGrant(grantId: string): Promise<void> {
  const now = new Date();
  await prisma.$transaction([
    prisma.oAuthGrant.updateMany({ where: { id: grantId, revokedAt: null }, data: { revokedAt: now } }),
    prisma.oAuthToken.updateMany({ where: { grantId, revokedAt: null }, data: { revokedAt: now } }),
  ]);
}

export interface OAuthContext {
  grantId: string;
  workspaceId: string;
  workspaceName: string;
  userId: string;
  clientName: string;
}

/**
 * The workspace an access token speaks for, or null. The person must still
 * be a member: removing someone from a workspace cuts off their connected
 * apps on the very next request.
 */
export async function authenticateAccessToken(token: string): Promise<OAuthContext | null> {
  const row = await prisma.oAuthToken.findUnique({
    where: { accessHash: sha256(token) },
    select: {
      accessExpiresAt: true,
      revokedAt: true,
      grant: {
        select: {
          id: true,
          revokedAt: true,
          lastUsedAt: true,
          userId: true,
          workspace: { select: { id: true, name: true } },
          client: { select: { name: true } },
        },
      },
    },
  });
  if (!row || row.revokedAt || row.grant.revokedAt || row.accessExpiresAt.getTime() < Date.now()) return null;
  const member = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: row.grant.workspace.id, userId: row.grant.userId } },
    select: { id: true },
  });
  if (!member) return null;

  const now = Date.now();
  if (!row.grant.lastUsedAt || now - row.grant.lastUsedAt.getTime() > LAST_USED_WRITE_INTERVAL_MS) {
    void prisma.oAuthGrant.update({ where: { id: row.grant.id }, data: { lastUsedAt: new Date(now) } }).catch(() => undefined);
  }
  touchActivity(row.grant.userId, "mcp");
  return {
    grantId: row.grant.id,
    workspaceId: row.grant.workspace.id,
    workspaceName: row.grant.workspace.name,
    userId: row.grant.userId,
    clientName: row.grant.client.name,
  };
}
