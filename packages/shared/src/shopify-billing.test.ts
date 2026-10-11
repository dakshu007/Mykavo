import { describe, expect, it } from "vitest";
import {
  ShopifyBillingError,
  fetchShopifySubscription,
  planFromHandle,
  planSelectionUrl,
  shopifyBillingConfig,
  subscriptionFromNode,
} from "./shopify-billing";

const env = {
  SHOPIFY_PARTNER_ORG_ID: "1234567",
  SHOPIFY_PARTNER_API_TOKEN: "prtapi_test",
  SHOPIFY_APP_ID: "998877",
  SHOPIFY_APP_HANDLE: "mykavo",
};

describe("shopifyBillingConfig", () => {
  it("reads complete settings and builds the app GID", () => {
    expect(shopifyBillingConfig(env)).toEqual({
      orgId: "1234567",
      accessToken: "prtapi_test",
      appGid: "gid://shopify/App/998877",
      appHandle: "mykavo",
    });
    expect(shopifyBillingConfig({ ...env, SHOPIFY_APP_ID: "gid://shopify/App/5" })?.appGid).toBe("gid://shopify/App/5");
  });

  it("is off while anything is missing or malformed", () => {
    expect(shopifyBillingConfig({})).toBeNull();
    expect(shopifyBillingConfig({ ...env, SHOPIFY_PARTNER_API_TOKEN: " " })).toBeNull();
    expect(shopifyBillingConfig({ ...env, SHOPIFY_PARTNER_ORG_ID: "abc" })).toBeNull();
    expect(shopifyBillingConfig({ ...env, SHOPIFY_APP_HANDLE: "My App" })).toBeNull();
    expect(shopifyBillingConfig({ ...env, SHOPIFY_APP_ID: "x" })).toBeNull();
  });
});

describe("planSelectionUrl", () => {
  it("builds Shopify's hosted plan page for the store", () => {
    expect(planSelectionUrl("cool-shop.myshopify.com", "mykavo")).toBe(
      "https://admin.shopify.com/store/cool-shop/charges/mykavo/pricing_plans",
    );
  });

  it("refuses anything that is not a myshopify store", () => {
    expect(planSelectionUrl("evil.com", "mykavo")).toBeNull();
    expect(planSelectionUrl("a.myshopify.com.evil.com", "mykavo")).toBeNull();
    expect(planSelectionUrl("cool-shop.myshopify.com", "../x")).toBeNull();
  });
});

describe("planFromHandle", () => {
  it("matches the plan word in a handle", () => {
    expect(planFromHandle("pro")).toBe("pro");
    expect(planFromHandle("mykavo-pro")).toBe("pro");
    expect(planFromHandle("pro_yearly")).toBe("pro");
    expect(planFromHandle("Agency")).toBe("agency");
    expect(planFromHandle("agency-annual")).toBe("agency");
  });

  it("grants nothing for free, test or unrelated handles", () => {
    expect(planFromHandle("free")).toBeNull();
    expect(planFromHandle("private-test-plan")).toBeNull();
    expect(planFromHandle("product")).toBeNull();
    expect(planFromHandle(null)).toBeNull();
  });
});

describe("subscriptionFromNode", () => {
  it("reads the plan, period end and cancellation", () => {
    expect(
      subscriptionFromNode({
        cancelAtEndOfCycle: true,
        trialEndsAt: null,
        currentBillingCycle: { endTime: "2026-11-01T00:00:00Z" },
        items: [{ handle: "pro" }],
      }),
    ).toEqual({ plan: "pro", handle: "pro", periodEnd: new Date("2026-11-01T00:00:00Z"), cancelAtEnd: true });
  });

  it("uses the trial end while in a trial, and the highest plan among items", () => {
    const s = subscriptionFromNode({
      trialEndsAt: "2026-10-20T00:00:00Z",
      currentBillingCycle: null,
      items: [{ handle: "pro" }, { handle: "agency" }],
    });
    expect(s.plan).toBe("agency");
    expect(s.periodEnd).toEqual(new Date("2026-10-20T00:00:00Z"));
  });

  it("treats no contract as no paid plan", () => {
    expect(subscriptionFromNode(null).plan).toBeNull();
    expect(subscriptionFromNode({ items: [{ handle: "free" }] })).toMatchObject({ plan: null, handle: "free" });
  });
});

describe("fetchShopifySubscription", () => {
  const config = shopifyBillingConfig(env)!;
  const reply = (status: number, body: unknown) =>
    (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

  it("queries the Partner API for the store and maps the answer", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ data: { activeSubscription: { items: [{ handle: "agency" }] } } }), { status: 200 });
    }) as unknown as typeof fetch;
    const sub = await fetchShopifySubscription(config, "gid://shopify/Shop/42", fetchImpl);
    expect(sub.plan).toBe("agency");
    expect(seen!.url).toBe("https://partners.shopify.com/1234567/api/2026-07/graphql.json");
    expect((seen!.init.headers as Record<string, string>)["x-shopify-access-token"]).toBe("prtapi_test");
    expect(JSON.parse(String(seen!.init.body)).variables).toEqual({ appId: "gid://shopify/App/998877", shopId: "gid://shopify/Shop/42" });
  });

  it("returns no plan when the store has no subscription", async () => {
    const sub = await fetchShopifySubscription(config, "gid://shopify/Shop/42", reply(200, { data: { activeSubscription: null } }));
    expect(sub.plan).toBeNull();
  });

  it("throws on throttling, errors and odd answers instead of reporting Free", async () => {
    await expect(fetchShopifySubscription(config, "gid://shopify/Shop/42", reply(429, {}))).rejects.toBeInstanceOf(ShopifyBillingError);
    await expect(
      fetchShopifySubscription(config, "gid://shopify/Shop/42", reply(200, { errors: [{ message: "Shop not found" }] })),
    ).rejects.toThrow("Shop not found");
    await expect(fetchShopifySubscription(config, "gid://shopify/Shop/42", reply(200, { data: {} }))).rejects.toThrow();
    await expect(fetchShopifySubscription(config, "not-a-gid", reply(200, {}))).rejects.toThrow("Invalid shop id");
  });
});
