import { appBaseUrl } from "@/lib/app-url";
import { json, preflight } from "@/lib/mcp/http";
import { protectedResourceMetadata } from "@/lib/mcp/oauth-core";

/** RFC 9728 metadata for the MCP endpoint: who issues its tokens. */
export function GET() {
  return json(protectedResourceMetadata(appBaseUrl()), 200, { "Cache-Control": "public, max-age=3600" });
}

export const OPTIONS = preflight;
