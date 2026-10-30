import { NextResponse } from "next/server";
import { appBaseUrl } from "@/lib/app-url";
import { getWorkspacePlan } from "@/lib/billing/subscription";
import { authenticateApiKey } from "@/lib/mcp/api-keys";
import { bearerKey } from "@/lib/mcp/api-key-format";
import { guardTools, type McpContext } from "@/lib/mcp/context";
import { CORS_HEADERS, preflight } from "@/lib/mcp/http";
import { ACCESS_TOKEN_PREFIX, wwwAuthenticate } from "@/lib/mcp/oauth-core";
import { authenticateAccessToken } from "@/lib/mcp/oauth";
import { handleBody } from "@/lib/mcp/protocol";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { logger } from "@/lib/logger";

/**
 * MyKavo's MCP server (Model Context Protocol, Streamable HTTP transport,
 * stateless). Lets ChatGPT, Claude, Cursor and other AI assistants read a
 * workspace's monitoring data - "what changed on my sites this week?".
 *
 * Auth, either:
 *   - OAuth: ChatGPT and Claude add the server by URL and the person signs
 *     in and approves (see lib/mcp/oauth-core.ts). A request without a token
 *     gets a 401 pointing at the OAuth metadata.
 *   - Authorization: Bearer mk_live_... - a workspace API key from the
 *     dashboard, for Claude Code, Cursor and scripts.
 * Read-only tools only, for workspaces on Pro and Agency (lib/mcp/context.ts).
 */
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 256 * 1024;
const TOOLS = guardTools(MCP_TOOLS);

function unauthorized(invalid: boolean): NextResponse {
  return NextResponse.json(
    { error: "Sign in to MyKavo to use this MCP server, or send a MyKavo API key: Authorization: Bearer mk_live_..." },
    { status: 401, headers: { ...CORS_HEADERS, "WWW-Authenticate": wwwAuthenticate(appBaseUrl(), invalid ? "invalid_token" : undefined) } },
  );
}

async function authenticate(request: Request): Promise<Omit<McpContext, "plan"> | "invalid" | null> {
  const header = request.headers.get("authorization");
  const bearer = /^Bearer\s+(\S+)$/i.exec(header ?? "")?.[1] ?? null;
  if (!bearer) return null;
  if (bearer.startsWith(ACCESS_TOKEN_PREFIX)) {
    const ctx = await authenticateAccessToken(bearer);
    return ctx ? { workspaceId: ctx.workspaceId, workspaceName: ctx.workspaceName, via: "oauth", principalId: ctx.grantId } : "invalid";
  }
  if (bearerKey(header)) {
    const ctx = await authenticateApiKey(request);
    return ctx ? { workspaceId: ctx.workspaceId, workspaceName: ctx.workspaceName, via: "api_key", principalId: ctx.keyId } : "invalid";
  }
  return "invalid";
}

export async function POST(request: Request) {
  const who = await authenticate(request);
  if (!who || who === "invalid") return unauthorized(who === "invalid");

  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "Request too large." }, { status: 413, headers: CORS_HEADERS });
  }

  const started = Date.now();
  const ctx: McpContext = { ...who, plan: await getWorkspacePlan(who.workspaceId) };
  const response = await handleBody(raw, TOOLS, ctx);
  logger.info("mcp request", { workspaceId: ctx.workspaceId, via: ctx.via, principalId: ctx.principalId, ms: Date.now() - started });

  // Notifications only: accepted, nothing to say.
  if (response === null) return new NextResponse(null, { status: 202, headers: CORS_HEADERS });
  return NextResponse.json(response, { headers: { ...CORS_HEADERS, "Cache-Control": "no-store" } });
}

/** Stateless server: no server-initiated stream, no sessions to end. */
export function GET() {
  return NextResponse.json(
    { error: "Use POST. This MCP server does not offer an SSE stream." },
    { status: 405, headers: { ...CORS_HEADERS, Allow: "POST" } },
  );
}

export function DELETE() {
  return NextResponse.json({ error: "This MCP server keeps no sessions." }, { status: 405, headers: { ...CORS_HEADERS, Allow: "POST" } });
}

export const OPTIONS = preflight;
