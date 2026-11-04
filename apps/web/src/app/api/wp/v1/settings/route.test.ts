import { beforeEach, describe, expect, it, vi } from "vitest";

let stored: unknown = {};
const update = vi.fn(async (args: { data: { settings: unknown } }) => {
  stored = args.data.settings;
  return {};
});
const findUnique = vi.fn(async () => ({ settings: stored }));
vi.mock("@mykavo/database", () => {
  class PrismaClientKnownRequestError extends Error {
    code = "";
  }
  const siteConnection = { findUnique: () => findUnique(), update: (a: { data: { settings: unknown } }) => update(a) };
  return {
    Prisma: { PrismaClientKnownRequestError },
    prisma: { siteConnection, $transaction: async (fn: (tx: unknown) => Promise<unknown>) => fn({ siteConnection }) },
  };
});

let windows = true;
vi.mock("@/lib/limits", () => ({ getWorkspacePlan: async () => ({ limits: { wpUpdateWindows: windows } }) }));
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

const { GET, PUT } = await import("./route");

const window = { enabled: true, days: [0, 6], startHour: 1, endHour: 5, timezone: "Europe/London" };
const put = (body: unknown) =>
  PUT(new Request("https://mykavo.app/api/wp/v1/settings", { method: "PUT", body: JSON.stringify(body) }));
const get = () => GET(new Request("https://mykavo.app/api/wp/v1/settings"));

describe("/api/wp/v1/settings", () => {
  beforeEach(() => {
    stored = { other: true };
    windows = true;
    update.mockClear();
  });

  it("saves and serves the update window on Agency", async () => {
    const res = await put({ updateWindow: window });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ updateWindow: window, allowed: { updateWindows: true } });
    expect(stored).toEqual({ other: true, updateWindow: window });
    expect(await (await get()).json()).toEqual({ updateWindow: window, allowed: { updateWindows: true } });
  });

  it("clears the window with null", async () => {
    stored = { updateWindow: window };
    expect(await (await put({ updateWindow: null })).json()).toEqual({ updateWindow: null, allowed: { updateWindows: true } });
    expect(stored).toEqual({});
  });

  it("refuses to save without the plan and serves no window", async () => {
    windows = false;
    stored = { updateWindow: window };
    const res = await put({ updateWindow: window });
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("PLAN");
    expect(update).not.toHaveBeenCalled();
    expect(await (await get()).json()).toEqual({ updateWindow: null, allowed: { updateWindows: false } });
  });

  it("rejects an invalid window", async () => {
    expect((await put({ updateWindow: { ...window, endHour: 1 } })).status).toBe(400);
    expect((await put({ updateWindow: { ...window, timezone: "Nowhere/Land" } })).status).toBe(400);
    expect((await put({})).status).toBe(400);
  });
});
