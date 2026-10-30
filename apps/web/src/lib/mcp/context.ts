import type { Plan } from "@/config/plans";
import { appBaseUrl } from "@/lib/app-url";
import { countMcpCall } from "./usage";
import { textResult, type McpTool, type ToolResult } from "./protocol";

/** Who is asking, however they signed in (API key or OAuth app). */
export interface McpContext {
  workspaceId: string;
  workspaceName: string;
  via: "api_key" | "oauth";
  /** The API key id or OAuth grant id, for logs. */
  principalId: string;
  plan: Plan;
}

/** Identical calls within this window are answered from memory. */
const CACHE_TTL_MS = 60 * 1000;
const CACHE_MAX = 500;
const cache = new Map<string, { at: number; result: ToolResult }>();

function cached(key: string): ToolResult | null {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.result;
}

function remember(key: string, result: ToolResult): void {
  if (cache.size >= CACHE_MAX) {
    const now = Date.now();
    for (const [k, v] of cache) if (now - v.at > CACHE_TTL_MS) cache.delete(k);
    if (cache.size >= CACHE_MAX) cache.clear();
  }
  cache.set(key, { at: Date.now(), result });
}

/**
 * Wraps every tool with the checks that apply to all of them, in order:
 * the plan must include AI assistants (answered in the chat itself, with an
 * upgrade link, so the person knows why), the workspace's daily call cap,
 * then a one-minute cache - assistants often repeat a call within one answer.
 */
export function guardTools(tools: McpTool<McpContext>[]): McpTool<McpContext>[] {
  return tools.map((tool) => ({
    ...tool,
    run: async (args, ctx) => {
      if (!ctx.plan.limits.aiAssistants) {
        return textResult(
          `AI assistant access to MyKavo is part of the Pro and Agency plans, and ${ctx.workspaceName} is on ${ctx.plan.name}. ` +
            `Upgrade at ${appBaseUrl()}/dashboard/billing to keep asking about your websites here.`,
        );
      }
      const key = `${ctx.workspaceId}:${tool.name}:${JSON.stringify(args)}`;
      const hit = cached(key);
      if (hit) return hit;

      const calls = await countMcpCall(ctx.workspaceId);
      const cap = ctx.plan.limits.aiAssistantCallsPerDay;
      if (calls !== null && calls > cap) {
        return {
          content: [
            {
              type: "text",
              text: `${ctx.workspaceName} has used today's ${cap.toLocaleString("en-US")} MyKavo assistant lookups. The limit resets at midnight UTC; everything is still in the dashboard at ${appBaseUrl()}/dashboard.`,
            },
          ],
          isError: true,
        };
      }
      const result = await tool.run(args, ctx);
      if (!result.isError) remember(key, result);
      return result;
    },
  }));
}
