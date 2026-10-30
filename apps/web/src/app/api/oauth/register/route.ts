import { isMissingTableError } from "@mykavo/database";
import { clientIp, json, oauthError, preflight } from "@/lib/mcp/http";
import { parseRegistration } from "@/lib/mcp/oauth-core";
import { registerClient } from "@/lib/mcp/oauth";
import { rateLimit } from "@/lib/security/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Dynamic client registration (RFC 7591). ChatGPT, Claude and other MCP
 * clients register themselves the first time someone adds MyKavo.
 * Registering grants nothing on its own: every connection still needs a
 * signed-in person to approve it on the consent screen.
 */
export async function POST(request: Request) {
  const ip = clientIp(request);
  if (!rateLimit(`oauth-register:${ip}`, { limit: 20, windowMs: 60 * 60 * 1000 }).allowed) {
    return oauthError("slow_down", "Too many registrations. Try again later.", 429);
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return oauthError("invalid_client_metadata", "Body must be JSON.");
  }
  const parsed = parseRegistration(body);
  if (!parsed.ok) return oauthError(parsed.error, parsed.description);

  try {
    const { clientId, clientSecret, issuedAt } = await registerClient(parsed.value);
    logger.info("oauth client registered", { clientId, name: parsed.value.name });
    return json(
      {
        client_id: clientId,
        client_id_issued_at: Math.floor(issuedAt.getTime() / 1000),
        ...(clientSecret ? { client_secret: clientSecret, client_secret_expires_at: 0 } : {}),
        client_name: parsed.value.name,
        redirect_uris: parsed.value.redirectUris,
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: parsed.value.authMethod,
        scope: "mcp:read",
      },
      201,
    );
  } catch (err) {
    if (isMissingTableError(err)) return oauthError("temporarily_unavailable", "Connections are not set up yet.", 503);
    throw err;
  }
}

export const OPTIONS = preflight;
