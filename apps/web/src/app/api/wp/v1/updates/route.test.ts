import { beforeEach, describe, expect, it, vi } from "vitest";

const create = vi.fn(async (args: unknown) => args);
vi.mock("@mykavo/database", () => ({ prisma: { siteUpdateEvent: { create: (a: unknown) => create(a) } } }));

type Trigger = { ok: true; scan: { id: string; status: string } } | { ok: false; reason: string; scanId?: string; error?: string };
const trigger = vi.fn<() => Promise<Trigger>>();
vi.mock("@/lib/scans/trigger", () => ({ triggerWebsiteScan: () => trigger() }));

let platform: "wordpress" | "shopify" = "wordpress";
vi.mock("@/lib/integrations/site-auth", () => ({
  authenticateSiteRequest: async () => ({
    platform,
    connectionId: `conn-${Math.random()}`,
    workspaceId: "ws1",
    website: { id: "web1", name: "Site", url: "https://example.com" },
  }),
  unauthorizedSite: () => new Response(null, { status: 401 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { POST } = await import("./route");

const report = {
  trigger: "manual",
  items: [{ type: "plugin", name: "PHP Compatibility Checker", from: "1.6.2", to: "1.6.3", action: "update" }],
};
const post = (body: unknown = report) =>
  POST(new Request("https://mykavo.app/api/wp/v1/updates", { method: "POST", body: JSON.stringify(body) }));

describe("POST /api/wp/v1/updates", () => {
  beforeEach(() => {
    create.mockClear();
    trigger.mockReset();
    platform = "wordpress";
  });

  it("stores a Free plan update with the reason no check ran", async () => {
    trigger.mockResolvedValue({ ok: false, reason: "PLAN", error: "Pro only" });
    const res = await post();
    expect(res.status).toBe(200);
    expect((await res.json()).reason).toBe("PLAN");
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        websiteId: "web1",
        workspaceId: "ws1",
        trigger: "manual",
        note: "Updated PHP Compatibility Checker 1.6.2 → 1.6.3",
        items: report.items,
        scanId: null,
        reason: "PLAN",
      }),
    });
  });

  it("stores the check that started on a paid plan", async () => {
    trigger.mockResolvedValue({ ok: true, scan: { id: "scan1", status: "QUEUED" } });
    expect((await post()).status).toBe(201);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ scanId: "scan1", reason: null }) });
  });

  it("links an update to the check already running", async () => {
    trigger.mockResolvedValue({ ok: false, reason: "BUSY", scanId: "scan0" });
    await post();
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ scanId: "scan0", reason: null }) });
  });

  it("still answers the plugin when the history row cannot be written", async () => {
    trigger.mockResolvedValue({ ok: false, reason: "PLAN" });
    create.mockRejectedValueOnce(new Error("relation does not exist"));
    expect((await post()).status).toBe(200);
  });

  it("stores nothing for invalid reports or other platforms", async () => {
    expect((await post({ trigger: "manual", items: [] })).status).toBe(400);
    platform = "shopify";
    expect((await post()).status).toBe(404);
    expect(create).not.toHaveBeenCalled();
  });
});
