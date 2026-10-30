import { isMissingTableError, prisma } from "@mykavo/database";
import { logger } from "@/lib/logger";

/**
 * Counts one MCP tool call for the workspace today (UTC) and returns the new
 * total, in a single statement. Returns null if counting fails (for example
 * a pending migration): the plan check still applies, and a counter problem
 * never takes the assistant down.
 */
export async function countMcpCall(workspaceId: string): Promise<number | null> {
  try {
    const rows = await prisma.$queryRaw<Array<{ calls: number }>>`
      INSERT INTO "mcp_usage" ("workspaceId", "day", "calls")
      VALUES (${workspaceId}, (now() AT TIME ZONE 'UTC')::date, 1)
      ON CONFLICT ("workspaceId", "day") DO UPDATE SET "calls" = "mcp_usage"."calls" + 1
      RETURNING "calls"`;
    return rows[0]?.calls ?? null;
  } catch (err) {
    logger.warn("mcp usage count failed", { workspaceId, error: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

/** Tool calls today and over the last 30 days, for the AI assistants page. */
export async function mcpUsageSummary(workspaceId: string): Promise<{ today: number; last30: number } | null> {
  try {
    const rows = await prisma.mcpUsage.findMany({
      where: { workspaceId, day: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { day: true, calls: true },
    });
    const todayKey = new Date().toISOString().slice(0, 10);
    return {
      today: rows.find((r) => r.day.toISOString().slice(0, 10) === todayKey)?.calls ?? 0,
      last30: rows.reduce((sum, r) => sum + r.calls, 0),
    };
  } catch (err) {
    if (isMissingTableError(err)) return null;
    throw err;
  }
}
