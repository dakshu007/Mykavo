import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/mcp/api-keys";
import { handleBody } from "@/lib/mcp/protocol";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { logger } from "@/lib/logger";

/**
 * MyKavo's MCP server (Model Context Protocol, Streamable HTTP transport,
 * stateless). Lets Claude, Cursor and other AI assistants read a
 * workspace's monitoring data - "what changed on my sites this week?".
 *
 * Auth: Authorization: Bearer mk_live_... - a workspace API key created in
 * the dashboard (Integrations > AI assistants). Read-only tools only.
 */
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;

function unauthorized(): NextResponse {
  return NextResponse.json(
    { error: "A MyKavo API key is required: Authorization: Bearer mk_live_..." },
    { status: 401, headers: { "WWW-Authenticate": 'Bearer realm="MyKavo MCP"' } },
  );
}

export async function POST(request: Request) {
  const ctx = await authenticateApiKey(request);
  if (!ctx) return unauthorized();

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413 });
  }

  const started = Date.now();
  const response = await handleBody(raw, MCP_TOOLS, ctx);
  logger.info("mcp request", { workspaceId: ctx.workspaceId, keyId: ctx.keyId, ms: Date.now() - started });

  // Notifications only: accepted, nothing to say.
  if (response === null) return new NextResponse(null, { status: 202 });
  return NextResponse.json(response, { headers: { "Cache-Control": "no-store" } });
}

/** Stateless server: no server-initiated stream, no sessions to end. */
export function GET() {
  return NextResponse.json({ error: "Use POST. This MCP server does not offer an SSE stream." }, { status: 405, headers: { Allow: "POST" } });
}

export function DELETE() {
  return NextResponse.json({ error: "This MCP server keeps no sessions." }, { status: 405, headers: { Allow: "POST" } });
}
