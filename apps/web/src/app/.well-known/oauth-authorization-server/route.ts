import { appBaseUrl } from "@/lib/app-url";
import { json, preflight } from "@/lib/mcp/http";
import { authorizationServerMetadata } from "@/lib/mcp/oauth-core";

/** RFC 8414 authorization server metadata for MCP clients. */
export function GET() {
  return json(authorizationServerMetadata(appBaseUrl()), 200, { "Cache-Control": "public, max-age=3600" });
}

export const OPTIONS = preflight;
