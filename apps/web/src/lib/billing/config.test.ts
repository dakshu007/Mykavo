import { describe, expect, it } from "vitest";
import {
  DODO_AGENCY_PRODUCT_ID,
  DODO_PRODUCT_ID,
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
