import { appBaseUrl } from "@/lib/app-url";
import { json, preflight } from "@/lib/mcp/http";
import { protectedResourceMetadata } from "@/lib/mcp/oauth-core";

/** Same document at the root path, for clients that look here first. */
export function GET() {
  return json(protectedResourceMetadata(appBaseUrl()), 200, { "Cache-Control": "public, max-age=3600" });
}

export const OPTIONS = preflight;
