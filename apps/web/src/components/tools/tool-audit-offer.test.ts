import { describe, expect, it } from "vitest";
import { siteRoot } from "./tool-audit-offer";

describe("siteRoot", () => {
  it("audits the whole site from its home page", () => {
    expect(siteRoot("https://www.example.com/pricing?x=1")).toBe("https://www.example.com/");
    expect(siteRoot("http://shop.example.com")).toBe("http://shop.example.com/");
  });
  it("leaves something it cannot parse alone", () => {
    expect(siteRoot("not a url")).toBe("not a url");
  });
});
