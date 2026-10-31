import { describe, expect, it, vi } from "vitest";
import {
  DODO_AGENCY_PRODUCT_ID,
  DODO_PRODUCT_ID,
  DODO_STARTER_PRODUCT_ID,
  buildCheckoutUrl,
  planForProductId,
  productIdForPlan,
} from "./config";

describe("Dodo product mapping", () => {
  it("sells Pro and Agency through different products", () => {
    expect(DODO_PRODUCT_ID).toBeTruthy();
    expect(DODO_AGENCY_PRODUCT_ID).toBeTruthy();
    expect(DODO_AGENCY_PRODUCT_ID).not.toBe(DODO_PRODUCT_ID);
  });

  it("sells Starter through its own product", () => {
    expect(DODO_STARTER_PRODUCT_ID).toBeTruthy();
    expect(new Set([DODO_STARTER_PRODUCT_ID, DODO_PRODUCT_ID, DODO_AGENCY_PRODUCT_ID]).size).toBe(3);
    expect(planForProductId(productIdForPlan("starter"))).toBe("starter");
    const url = new URL(buildCheckoutUrl({ checkoutToken: "tok", email: "a@b.test", plan: "starter" })!);
    expect(url.pathname.endsWith(`/${DODO_STARTER_PRODUCT_ID}`)).toBe(true);
    expect(url.searchParams.get("metadata_kind")).toBe("starter");
  });

  it("maps each plan to its product and back", () => {
    expect(planForProductId(productIdForPlan("pro"))).toBe("pro");
    expect(planForProductId(productIdForPlan("agency"))).toBe("agency");
    expect(planForProductId("pdt_someone_else")).toBeNull();
    expect(planForProductId(null)).toBeNull();
  });

  it("builds the Agency checkout on the Agency product", () => {
    const url = new URL(
      buildCheckoutUrl({ checkoutToken: "tok", email: "a@b.test", plan: "agency" })!,
    );
    expect(url.pathname.endsWith(`/${DODO_AGENCY_PRODUCT_ID}`)).toBe(true);
    expect(url.searchParams.get("quantity")).toBe("1");
    expect(url.searchParams.get("metadata_checkoutToken")).toBe("tok");
    expect(url.searchParams.get("metadata_kind")).toBe("agency");
  });

  it("defaults checkout to Pro", () => {
    const url = new URL(buildCheckoutUrl({ checkoutToken: "tok", email: "a@b.test" })!);
    expect(url.pathname.endsWith(`/${DODO_PRODUCT_ID}`)).toBe(true);
  });
});

describe("yearly products", () => {
  it("are on for every plan, each on its own product", async () => {
    const c = await import("./config");
    expect(c.yearlyBillingEnabled).toBe(true);
    const ids = (["starter", "pro", "agency"] as const).flatMap((p) => [c.productIdForPlan(p), c.productIdForPlan(p, "year")]);
    expect(new Set(ids).size).toBe(6);
    expect(c.productInfo(c.productIdForPlan("agency", "year"))).toEqual({ plan: "agency", interval: "year" });
  });

  it("map yearly products to their plan and interval, apart from monthly", async () => {
    vi.resetModules();
    vi.stubEnv("DODO_STARTER_YEARLY_PRODUCT_ID", "pdt_starter_y");
    vi.stubEnv("DODO_PRO_YEARLY_PRODUCT_ID", "pdt_pro_y");
    vi.stubEnv("DODO_AGENCY_YEARLY_PRODUCT_ID", "pdt_agency_y");
    try {
      const c = await import("./config");
      expect(c.yearlyBillingEnabled).toBe(true);
      expect(c.productIdForPlan("pro", "year")).toBe("pdt_pro_y");
      expect(c.productIdForPlan("pro")).toBe(c.DODO_PRODUCT_ID);
      expect(c.productInfo("pdt_agency_y")).toEqual({ plan: "agency", interval: "year" });
      expect(c.productInfo(c.DODO_PRODUCT_ID)).toEqual({ plan: "pro", interval: "month" });
      expect(c.planForProductId("pdt_starter_y")).toBe("starter");
      const url = new URL(c.buildCheckoutUrl({ checkoutToken: "t", email: "a@b.test", plan: "pro", interval: "year" })!);
      expect(url.pathname.endsWith("/pdt_pro_y")).toBe(true);
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});
