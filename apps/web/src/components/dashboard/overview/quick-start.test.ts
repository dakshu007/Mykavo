import { describe, expect, it } from "vitest";
import { QUICK_START_PAGES, quickStartPages } from "./quick-start";

const found = ["https://a.com/", "https://a.com/pricing", "https://a.com/blog", "https://a.com/about", "https://a.com/contact", "https://a.com/shop", "https://a.com/faq"].map((url) => ({ url }));

describe("quickStartPages", () => {
  it("watches the first five, homepage first, in discovery's order", () => {
    expect(quickStartPages(found, 15)).toEqual(found.slice(0, QUICK_START_PAGES).map((p) => p.url));
  });
  it("never goes over the plan's page budget", () => {
    expect(quickStartPages(found, 3)).toHaveLength(3);
  });
  it("drops duplicates", () => {
    expect(quickStartPages([{ url: "https://a.com/" }, { url: "https://a.com/" }], 5)).toEqual(["https://a.com/"]);
  });
});
