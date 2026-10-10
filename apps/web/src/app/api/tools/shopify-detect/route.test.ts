import { beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "./route";

/** Network replaced by canned pages so input validation and SSRF error mapping run as in production. */
const pages = new Map<string, { status: number; body: string }>();

vi.mock("@/lib/security/ssrf", async () => {
  const actual = await vi.importActual<typeof import("@mykavo/shared/ssrf")>("@mykavo/shared/ssrf");
  return {
    ...actual,
    safeFetch: vi.fn(async (url: string) => {
      if (url.includes("blocked.internal")) throw new actual.UnsafeUrlError("BLOCKED_HOST", "x");
      const p = pages.get(url) ?? { status: 404, body: "" };
      return { finalUrl: url, status: p.status, headers: new Headers(), body: p.body, bodyBytes: p.body.length, redirectChain: [], responseTimeMs: 1 };
    }),
  };
});

function post(body: unknown) {
  return new Request("http://localhost/api", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 250)}` },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  pages.clear();
});

describe("POST /api/tools/shopify-detect", () => {
  it("reports the theme and apps of a Shopify store", async () => {
    pages.set("https://shop.example/", {
      status: 200,
      body: `<script>Shopify.shop = "shop-example.myshopify.com"; Shopify.theme = {"name":"Main","schema_name":"Dawn","schema_version":"15.0.0","theme_store_id":887,"role":"main"};</script><script src="https://static.klaviyo.com/onsite/js/klaviyo.js"></script>`,
    });
    const res = await POST(post({ url: "https://shop.example/" }));
    expect(res.status).toBe(200);
    const { report } = await res.json();
    expect(report.isShopify).toBe(true);
    expect(report.theme).toMatchObject({ name: "Main", schemaName: "Dawn", themeStoreId: 887 });
    expect(report.fromThemeStore).toBe(true);
    expect(report.apps.map((a: { name: string }) => a.name)).toEqual(["Klaviyo"]);
  });

  it("maps SSRF errors to a friendly 400 and rejects empty input", async () => {
    const blocked = await POST(post({ url: "http://blocked.internal/" }));
    expect(blocked.status).toBe(400);
    expect((await blocked.json()).error).toBe("This host can't be checked.");
    expect((await POST(post({ url: "" }))).status).toBe(400);
  });
});
