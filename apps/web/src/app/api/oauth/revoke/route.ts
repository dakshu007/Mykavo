import { NextResponse } from "next/server";
import { CORS_HEADERS, clientIp, oauthError, preflight, readParams } from "@/lib/mcp/http";
import { basicCredentials } from "@/lib/mcp/oauth-core";
import { authenticateClient, revokeToken } from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/security/rate-limit";

/** Token revocation (RFC 7009): an app disconnecting itself. */
export async function POST(request: Request) {
  if (!rateLimit(`oauth-revoke:${clientIp(request)}`, { limit: 60, windowMs: 60_000 }).allowed) {
    return oauthError("slow_down", "Too many requests.", 429);
  }
  const p = await readParams(request);
  const basic = basicCredentials(request.headers.get("authorization"));
  const clientId = basic?.id ?? p.client_id ?? "";
  const client = clientId ? await authenticateClient(clientId, basic?.secret ?? p.client_secret ?? null).catch(() => null) : null;
  if (!client) return oauthError("invalid_client", "Unknown client or wrong client secret.", 401);
  if (p.token) await revokeToken(p.token, client.id);
  // Per the RFC, an unknown or already revoked token is still a 200.
  return new NextResponse(null, { status: 200, headers: CORS_HEADERS });
}

export const OPTIONS = preflight;
