import { beforeEach, describe, expect, it, vi } from "vitest";

const countMcpCall = vi.fn<(workspaceId: string) => Promise<number | null>>();
vi.mock("./usage", () => ({ countMcpCall: (id: string) => countMcpCall(id) }));
vi.mock("@/lib/app-url", () => ({ appBaseUrl: () => "https://mykavo.app" }));

const { guardTools } = await import("./context");
const { getPlan } = await import("@/config/plans");
import type { McpContext } from "./context";
import type { McpTool } from "./protocol";

let runs = 0;
const tool: McpTool<McpContext> = {
  name: "workspace_summary",
  title: "Summary",
  description: "",
  inputSchema: { type: "object", properties: {} },
  run: async () => {
    runs += 1;
    return { content: [{ type: "text", text: "data" }] };
  },
};

function ctx(planId: "free" | "starter" | "pro" | "agency", workspaceId = "ws1"): McpContext {
  return { workspaceId, workspaceName: "Acme", via: "oauth", principalId: "g1", plan: getPlan(planId) };
}

describe("guardTools", () => {
  beforeEach(() => {
    runs = 0;
    countMcpCall.mockReset();
  });

  it("answers Free and Starter with an upgrade note, without touching data or the counter", async () => {
    const [guarded] = guardTools([tool]);
    for (const plan of ["free", "starter"] as const) {
      const out = await guarded.run({}, ctx(plan));
      expect(out.content[0].text).toContain("Pro and Agency");
      expect(out.content[0].text).toContain("https://mykavo.app/dashboard/billing");
    }
    expect(runs).toBe(0);
    expect(countMcpCall).not.toHaveBeenCalled();
  });

  it("runs the tool on Pro and Agency within the daily cap", async () => {
    countMcpCall.mockResolvedValue(1);
    const [guarded] = guardTools([tool]);
    expect((await guarded.run({}, ctx("pro", "ws-pro"))).content[0].text).toBe("data");
    expect((await guarded.run({}, ctx("agency", "ws-agency"))).content[0].text).toBe("data");
    expect(runs).toBe(2);
  });

  it("stops at the plan's daily cap", async () => {
    countMcpCall.mockResolvedValue(getPlan("pro").limits.aiAssistantCallsPerDay + 1);
    const [guarded] = guardTools([tool]);
    const out = await guarded.run({ a: 1 }, ctx("pro", "ws-capped"));
    expect(out.isError).toBe(true);
    expect(out.content[0].text).toContain("resets at midnight UTC");
    expect(runs).toBe(0);
  });

  it("keeps working when the counter is unavailable", async () => {
    countMcpCall.mockResolvedValue(null);
    const [guarded] = guardTools([tool]);
    expect((await guarded.run({ b: 1 }, ctx("pro", "ws-null"))).content[0].text).toBe("data");
  });

  it("answers an identical call within a minute from cache, without counting it again", async () => {
    countMcpCall.mockResolvedValue(1);
    const [guarded] = guardTools([tool]);
    await guarded.run({ c: 1 }, ctx("pro", "ws-cache"));
    await guarded.run({ c: 1 }, ctx("pro", "ws-cache"));
    expect(runs).toBe(1);
    expect(countMcpCall).toHaveBeenCalledTimes(1);
  });
});
