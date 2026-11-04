import { beforeEach, describe, expect, it, vi } from "vitest";

type Row = { slug: string; name: string; version: string; active: boolean; wporgStatus: string; lastUpdated: Date | null; reason: string | null };
let rows: Row[] = [];
const ops: string[] = [];
vi.mock("@mykavo/database", () => ({
  isMissingTableError: () => false,
  prisma: {
    wpPluginInventory: {
      findMany: async (args: { where: { websiteId?: unknown; wporgStatus?: { in: string[] } } }) => {
        if (typeof args.where.websiteId === "object") return []; // other sites' verdicts
        if (args.where.wporgStatus) return rows.filter((r) => args.where.wporgStatus!.in.includes(r.wporgStatus));
        return rows;
      },
      deleteMany: (args: { where: { slug: { in: string[] } } }) => {
        ops.push(`delete:${args.where.slug.in.join(",")}`);
        rows = rows.filter((r) => !args.where.slug.in.includes(r.slug));
        return Promise.resolve();
      },
      createMany: (args: { data: Array<Omit<Row, "wporgStatus" | "lastUpdated" | "reason">> }) => {
        ops.push(`create:${args.data.map((d) => d.slug).join(",")}`);
        rows.push(...args.data.map((d) => ({ ...d, wporgStatus: "unknown", lastUpdated: null, reason: null })));
        return Promise.resolve();
      },
      update: (args: { where: { websiteId_slug: { slug: string } }; data: Partial<Row> }) => {
        ops.push(`update:${args.where.websiteId_slug.slug}`);
        const row = rows.find((r) => r.slug === args.where.websiteId_slug.slug);
        if (row) Object.assign(row, args.data);
        return Promise.resolve();
      },
    },
    $transaction: async (writes: Promise<unknown>[]) => Promise.all(writes),
  },
}));

let health = true;
vi.mock("@/lib/limits", () => ({ getWorkspacePlan: async () => ({ limits: { wpPluginHealth: health } }) }));
vi.mock("@/lib/integrations/site-auth", () => ({
  authenticateSiteRequest: async () => ({
    platform: "wordpress",
    connectionId: `conn-${Math.random()}`,
    workspaceId: "ws1",
    website: { id: "web1", name: "Site", url: "https://example.com" },
  }),
  unauthorizedSite: () => new Response(null, { status: 401 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { POST } = await import("./route");

const post = (plugins: unknown) =>
  POST(new Request("https://mykavo.app/api/wp/v1/plugins", { method: "POST", body: JSON.stringify({ plugins }) }));

describe("POST /api/wp/v1/plugins", () => {
  beforeEach(() => {
    health = true;
    ops.length = 0;
    rows = [
      { slug: "old-forms", name: "Old Forms", version: "1.0", active: true, wporgStatus: "closed", lastUpdated: null, reason: "Closed." },
      { slug: "gone", name: "Gone", version: "1.0", active: true, wporgStatus: "ok", lastUpdated: null, reason: null },
    ];
  });

  it("stores the inventory and lists flagged plugins", async () => {
    const res = await post([
      { slug: "old-forms", name: "Old Forms", version: "1.1", active: false },
      { slug: "woocommerce", name: "WooCommerce", version: "9.4.0", active: true },
    ]);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      allowed: true,
      flagged: [{ slug: "old-forms", name: "Old Forms", status: "closed", lastUpdated: null, reason: "Closed." }],
    });
    expect(ops).toEqual(["delete:gone", "create:woocommerce", "update:old-forms"]);
  });

  it("stores the inventory but lists nothing without the plan", async () => {
    health = false;
    const res = await post([{ slug: "old-forms", name: "Old Forms", version: "1.0", active: true }]);
    expect(await res.json()).toEqual({ allowed: false, flagged: [] });
    expect(ops).toEqual(["delete:gone"]);
  });

  it("rejects bad slugs", async () => {
    expect((await post([{ slug: "../x", name: "x", version: "1", active: true }])).status).toBe(400);
  });
});
