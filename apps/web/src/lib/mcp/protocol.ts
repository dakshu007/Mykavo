/**
 * A minimal Model Context Protocol server core: JSON-RPC 2.0 over the
 * Streamable HTTP transport, stateless, tools only. Enough for Claude Code,
 * Claude Desktop (through mcp-remote), Cursor and other MCP clients to list
 * and call MyKavo's read-only tools.
 *
 * Pure - no database, no request objects - so the protocol is unit-tested
 * on its own. The route (app/api/mcp) authenticates and supplies the tools.
 */

export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-06-18", "2025-03-26", "2024-11-05"] as const;
const LATEST = SUPPORTED_PROTOCOL_VERSIONS[0];

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
}

export interface McpTool<Ctx> {
  name: string;
  title: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
    additionalProperties?: boolean;
  };
  run: (args: Record<string, unknown>, ctx: Ctx) => Promise<ToolResult>;
}

export const RPC = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL: -32603,
} as const;

export const SERVER_INFO = { name: "mykavo", title: "MyKavo", version: "1.0.0" };

export const SERVER_INSTRUCTIONS =
  "MyKavo monitors websites for important changes and regressions (visual, SEO, links, scripts, performance, conversion elements, AI crawler access). " +
  "Use workspace_summary first for an overview, then list_websites, get_changes and get_change for detail. All tools are read-only.";

const error = (id: JsonRpcResponse["id"], code: number, message: string): JsonRpcResponse => ({
  jsonrpc: "2.0",
  id,
  error: { code, message },
});

function isRequest(value: unknown): value is JsonRpcRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return v.jsonrpc === "2.0" && typeof v.method === "string";
}

/**
 * Handle one JSON-RPC message. Returns null for notifications (no id), which
 * get no response body.
 */
export async function handleMessage<Ctx>(
  message: unknown,
  tools: McpTool<Ctx>[],
  ctx: Ctx,
): Promise<JsonRpcResponse | null> {
  if (!isRequest(message)) {
    const id = message && typeof message === "object" && "id" in message ? ((message as { id: JsonRpcResponse["id"] }).id ?? null) : null;
    return error(id, RPC.INVALID_REQUEST, "Invalid JSON-RPC request.");
  }
  const isNotification = message.id === undefined;
  const id = message.id ?? null;
  const params = message.params ?? {};

  if (isNotification) return null; // notifications/initialized, cancelled, ... - nothing to answer

  switch (message.method) {
    case "initialize": {
      const requested = typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested)
        ? requested
        : LATEST;
      return {
        jsonrpc: "2.0",
        id,
        result: {
          protocolVersion,
          capabilities: { tools: { listChanged: false } },
          serverInfo: SERVER_INFO,
          instructions: SERVER_INSTRUCTIONS,
        },
      };
    }
    case "ping":
      return { jsonrpc: "2.0", id, result: {} };
    case "tools/list":
      return {
        jsonrpc: "2.0",
        id,
        result: {
          tools: tools.map((t) => ({
            name: t.name,
            title: t.title,
            description: t.description,
            inputSchema: t.inputSchema,
            annotations: { readOnlyHint: true, openWorldHint: false },
          })),
        },
      };
    case "tools/call": {
      const name = typeof params.name === "string" ? params.name : "";
      const tool = tools.find((t) => t.name === name);
      if (!tool) return error(id, RPC.INVALID_PARAMS, `Unknown tool: ${name || "(none)"}`);
      const args =
        params.arguments && typeof params.arguments === "object" && !Array.isArray(params.arguments)
          ? (params.arguments as Record<string, unknown>)
          : {};
      try {
        return { jsonrpc: "2.0", id, result: await tool.run(args, ctx) };
      } catch (err) {
        // Tool failures are results the model can read, not protocol errors.
        return {
          jsonrpc: "2.0",
          id,
          result: {
            content: [{ type: "text", text: err instanceof ToolInputError ? err.message : "The tool failed. Try again." }],
            isError: true,
          },
        };
      }
    }
    default:
      return error(id, RPC.METHOD_NOT_FOUND, `Method not found: ${message.method}`);
  }
}

/** A problem with the arguments, worded for the model to fix and retry. */
export class ToolInputError extends Error {}

/** Parse a request body: one message or a batch. */
export async function handleBody<Ctx>(
  raw: string,
  tools: McpTool<Ctx>[],
  ctx: Ctx,
): Promise<JsonRpcResponse | JsonRpcResponse[] | null> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return error(null, RPC.PARSE_ERROR, "Body is not valid JSON.");
  }
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return error(null, RPC.INVALID_REQUEST, "Empty batch.");
    const out = (await Promise.all(parsed.slice(0, 20).map((m) => handleMessage(m, tools, ctx)))).filter(
      (r): r is JsonRpcResponse => r !== null,
    );
    return out.length ? out : null;
  }
  return handleMessage(parsed, tools, ctx);
}

/** A text result the model reads: a one-line summary, then the data. */
export function textResult(summary: string, data?: unknown): ToolResult {
  return {
    content: [{ type: "text", text: data === undefined ? summary : `${summary}\n\n${JSON.stringify(data, null, 2)}` }],
  };
}
