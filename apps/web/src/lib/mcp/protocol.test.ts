import { describe, expect, it } from "vitest";
import { RPC, ToolInputError, handleBody, handleMessage, textResult, type McpTool } from "./protocol";

const tools: McpTool<{ workspaceId: string }>[] = [
  {
    name: "echo_workspace",
    title: "Echo",
    description: "Returns the workspace id",
    inputSchema: { type: "object", properties: {} },
    run: async (_args, ctx) => textResult(`workspace ${ctx.workspaceId}`),
  },
  {
    name: "needs_id",
    title: "Needs id",
    description: "Fails without an id",
    inputSchema: { type: "object", properties: { id: { type: "string" } }, required: ["id"] },
    run: async (args) => {
      if (typeof args.id !== "string") throw new ToolInputError("id is required.");
      return textResult("ok");
    },
  },
];
const ctx = { workspaceId: "ws_1" };
const call = (message: unknown) => handleMessage(message, tools, ctx);

describe("MCP protocol", () => {
  it("negotiates a supported protocol version and advertises tools", async () => {
    const res = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-03-26" } });
    expect(res?.result).toMatchObject({
      protocolVersion: "2025-03-26",
      capabilities: { tools: {} },
      serverInfo: { name: "mykavo" },
    });
  });

  it("answers an unknown protocol version with the latest it supports", async () => {
    const res = await call({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "1999-01-01" } });
    expect((res?.result as { protocolVersion: string }).protocolVersion).toBe("2025-06-18");
  });

  it("sends nothing back for notifications", async () => {
    expect(await call({ jsonrpc: "2.0", method: "notifications/initialized" })).toBeNull();
  });

  it("lists tools as read-only", async () => {
    const res = await call({ jsonrpc: "2.0", id: 2, method: "tools/list" });
    const listed = (res?.result as { tools: Array<{ name: string; annotations: { readOnlyHint: boolean } }> }).tools;
    expect(listed.map((t) => t.name)).toEqual(["echo_workspace", "needs_id"]);
    expect(listed.every((t) => t.annotations.readOnlyHint)).toBe(true);
  });

  it("runs a tool in the caller's workspace", async () => {
    const res = await call({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "echo_workspace", arguments: {} } });
    expect(res?.result).toEqual({ content: [{ type: "text", text: "workspace ws_1" }] });
  });

  it("turns bad tool arguments into a readable tool error, not a protocol error", async () => {
    const res = await call({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "needs_id" } });
    expect(res?.result).toEqual({ content: [{ type: "text", text: "id is required." }], isError: true });
  });

  it("rejects unknown tools and methods", async () => {
    expect((await call({ jsonrpc: "2.0", id: 5, method: "tools/call", params: { name: "nope" } }))?.error?.code).toBe(
      RPC.INVALID_PARAMS,
    );
    expect((await call({ jsonrpc: "2.0", id: 6, method: "resources/list" }))?.error?.code).toBe(RPC.METHOD_NOT_FOUND);
  });

  it("handles parse errors and batches", async () => {
    expect(await handleBody("{not json", tools, ctx)).toMatchObject({ error: { code: RPC.PARSE_ERROR } });
    const batch = await handleBody(
      JSON.stringify([
        { jsonrpc: "2.0", id: 1, method: "ping" },
        { jsonrpc: "2.0", method: "notifications/initialized" },
      ]),
      tools,
      ctx,
    );
    expect(batch).toEqual([{ jsonrpc: "2.0", id: 1, result: {} }]);
  });
});
