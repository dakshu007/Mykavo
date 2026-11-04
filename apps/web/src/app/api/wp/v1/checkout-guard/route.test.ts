import { beforeEach, describe, expect, it, vi } from "vitest";

type Page = { id: string; normalizedUrl: string; monitoredElements: Array<{ selector: string }> };
let pages: Page[] = [];
const createElement = vi.fn(async (args: { data: { monitoredPageId: string; selector: string } }) => {
  pages.find((p) => p.id === args.data.monitoredPageId)?.monitoredElements.push({ selector: args.data.selector });
  return {};
});
vi.mock("@mykavo/database", () => ({
  prisma: {
    monitoredPage: {
      findMany: async (args: { where: { normalizedUrl?: { in: string[] } } }) => {
        const wanted = args.where.normalizedUrl?.in;
        return (wanted ? pages.filter((p) => wanted.includes(p.normalizedUrl)) : pages).map((p) => ({
          ...p,
          monitoredElements: [...p.monitoredElements],
        }));
      },
      createMany: async (args: { data: Array<{ normalizedUrl: string }> }) => {
        for (const d of args.data) pages.push({ id: `p${pages.length + 1}`, normalizedUrl: d.normalizedUrl, monitoredElements: [] });
        return { count: args.data.length };
      },
    },
    monitoredElement: { create: (a: { data: { monitoredPageId: string; selector: string } }) => createElement(a) },
  },
}));

let conversion = true;
let pageLimit = 25;
vi.mock("@/lib/limits", () => {
  class LimitError extends Error {
    constructor(
      public code: string,
      message: string,
    ) {
      super(message);
    }
  }
  return {
    LimitError,
    getWorkspacePlan: async () => ({ limits: { conversionElementMonitoring: conversion } }),
    assertPageLimit: async (_w: string, _s: string, n: number) => {
      if (n > pageLimit) throw new LimitError("PAGE_LIMIT", "Too many pages.");
    },
  };
});
vi.mock("@/lib/integrations/site-auth", () => ({
  authenticateSiteRequest: async () => ({
    platform: "wordpress",
    connectionId: `conn-${Math.random()}`,
    workspaceId: "ws1",
    website: { id: "web1", name: "Shop", url: "https://shop.example.com/" },
  }),
  unauthorizedSite: () => new Response(null, { status: 401 }),
}));
vi.mock("@/lib/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

const { POST } = await import("./route");

const body = {
  checkoutUrl: "https://shop.example.com/checkout/",
  cartUrl: "https://shop.example.com/cart/",
  productUrl: "https://shop.example.com/product/hat/",
};
const post = (b: unknown = body) =>
  POST(new Request("https://mykavo.app/api/wp/v1/checkout-guard", { method: "POST", body: JSON.stringify(b) }));

describe("POST /api/wp/v1/checkout-guard", () => {
  beforeEach(() => {
    pages = [];
    conversion = true;
    pageLimit = 25;
    createElement.mockClear();
  });

  it("adds the pages and their buttons once", async () => {
    const first = await post();
    expect(first.status).toBe(201);
    expect(await first.json()).toEqual({ pages: 3, elements: 3 });
    expect(createElement).toHaveBeenCalledTimes(3);

    const again = await post();
    expect(again.status).toBe(200);
    expect(await again.json()).toEqual({ pages: 3, elements: 3 });
    expect(createElement).toHaveBeenCalledTimes(3);
  });

  it("needs the plan", async () => {
    conversion = false;
    const res = await post();
    expect(res.status).toBe(403);
    expect((await res.json()).reason).toBe("PLAN");
  });

  it("respects the page limit", async () => {
    pageLimit = 2;
    const res = await post();
    expect(res.status).toBe(403);
    expect(pages).toEqual([]);
  });

  it("refuses pages on another site", async () => {
    expect((await post({ checkoutUrl: "https://evil.test/checkout/" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
  });
});
