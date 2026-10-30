import { isMissingTableError } from "@mykavo/database";
import { clientIp, json, oauthError, preflight, readParams } from "@/lib/mcp/http";
import { basicCredentials } from "@/lib/mcp/oauth-core";
import { authenticateClient, exchangeCode, refreshTokens } from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/security/rate-limit";

/**
 * The token endpoint: an authorization code (with its PKCE verifier) or a
 * refresh token in, a fresh access token and rotated refresh token out.
 */
export async function POST(request: Request) {
  if (!rateLimit(`oauth-token:${clientIp(request)}`, { limit: 60, windowMs: 60_000 }).allowed) {
    return oauthError("slow_down", "Too many token requests. Try again in a minute.", 429);
  }
  const p = await readParams(request);
  const basic = basicCredentials(request.headers.get("authorization"));
  const clientId = basic?.id ?? p.client_id ?? "";
  const secret = basic?.secret ?? p.client_secret ?? null;
  if (!clientId) return oauthError("invalid_client", "client_id is required.", 401);

  try {
    const client = await authenticateClient(clientId, secret);
    if (!client) return oauthError("invalid_client", "Unknown client or wrong client secret.", 401);

    if (p.grant_type === "authorization_code") {
      if (!p.code || !p.redirect_uri || !p.code_verifier) {
        return oauthError("invalid_request", "code, redirect_uri and code_verifier are required.");
      }
      const result = await exchangeCode({ code: p.code, clientId, redirectUri: p.redirect_uri, verifier: p.code_verifier });
      return "error" in result ? oauthError(result.error, result.description) : json(result);
    }
    if (p.grant_type === "refresh_token") {
      if (!p.refresh_token) return oauthError("invalid_request", "refresh_token is required.");
      const result = await refreshTokens({ refreshToken: p.refresh_token, clientId });
      return "error" in result ? oauthError(result.error, result.description) : json(result);
    }
    return oauthError("unsupported_grant_type", "Use authorization_code or refresh_token.");
  } catch (err) {
    if (isMissingTableError(err)) return oauthError("temporarily_unavailable", "Connections are not set up yet.", 503);
    throw err;
  }
}

export const OPTIONS = preflight;
