import { describe, expect, it, vi } from "vitest";

type FindManyArgs = { where: { workspaceId: string; platform: { in: string[] } } };
const findMany = vi.fn(async (args: FindManyArgs) => {
  void args;
  return [
    {
      id: "c1",
      platform: "chrome",
      siteUrl: "https://example.com",
      siteName: null,
      website: { name: "Example" },
      connectedAt: new Date("2026-10-01T10:00:00Z"),
      lastUsedAt: null,
      pluginVersion: "1.4.0",
      createdAt: new Date("2026-10-01T09:59:00Z"),
      createdByUser: { name: "", email: "dev@example.com" },
    },
  ];
});
vi.mock("@mykavo/database", () => ({
  prisma: { siteConnection: { findMany: (a: FindManyArgs) => findMany(a) } },
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { hostOfUrl, loadConnectedSites, websiteMatchesHost } = await import("./site-connections");

describe("websiteMatchesHost", () => {
  it("matches on the bare host, ignoring www. and case", () => {
    expect(websiteMatchesHost("https://www.Example.com/", ["example.com"])).toBe(true);
    expect(websiteMatchesHost("https://example.com/shop", ["WWW.EXAMPLE.COM"])).toBe(true);
  });

  it("refuses another website in the workspace", () => {
    expect(websiteMatchesHost("https://victim.example/", ["attacker.example"])).toBe(false);
    expect(websiteMatchesHost("https://sub.example.com/", ["example.com"])).toBe(false);
  });

  it("accepts any of several hosts (Shopify primary domain or myshopify host)", () => {
    expect(websiteMatchesHost("https://shop.myshopify.com/", [null, "shop.myshopify.com"])).toBe(true);
    expect(websiteMatchesHost("https://brand.com/", ["brand.com", "shop.myshopify.com"])).toBe(true);
  });

  it("never matches an unparseable URL or empty hosts", () => {
    expect(websiteMatchesHost("not a url", ["example.com"])).toBe(false);
    expect(websiteMatchesHost("https://example.com/", [null, undefined, ""])).toBe(false);
  });

  it("hostOfUrl returns the bare host", () => {
    expect(hostOfUrl("https://WWW.Brand.com/path")).toBe("brand.com");
    expect(hostOfUrl("nope")).toBeNull();
  });
});

describe("loadConnectedSites", () => {
  it("lists Chrome extension connections with who created them", async () => {
    const sites = await loadConnectedSites("ws1", "chrome");
    expect(findMany.mock.calls[0]?.[0].where.platform).toEqual({ in: ["chrome"] });
    expect(sites).toEqual([
      expect.objectContaining({
        id: "c1",
        platform: "chrome",
        createdAt: "2026-10-01T09:59:00.000Z",
        createdByName: "dev@example.com",
      }),
    ]);
  });

  it("accepts several platforms at once", async () => {
    await loadConnectedSites("ws1", ["wordpress", "chrome"]);
    expect(findMany.mock.calls.at(-1)?.[0].where.platform).toEqual({ in: ["wordpress", "chrome"] });
  });
});
