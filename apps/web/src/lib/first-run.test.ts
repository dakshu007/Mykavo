import { describe, expect, it } from "vitest";
import { hostFromInput, siteNameFromHost } from "./first-run";

describe("hostFromInput", () => {
  it("finds the host in what was typed", () => {
    expect(hostFromInput("example.com")).toBe("example.com");
    expect(hostFromInput(" https://Shop.Example.co.uk/pricing?x=1 ")).toBe("shop.example.co.uk");
  });

  it("is null until it looks like a host", () => {
    expect(hostFromInput("")).toBeNull();
    expect(hostFromInput("example")).toBeNull();
    expect(hostFromInput("exa mple.com")).toBeNull();
  });
});

describe("siteNameFromHost", () => {
  it("makes a readable name", () => {
    expect(siteNameFromHost("www.northwind-roasters.co.uk")).toBe("Northwind Roasters");
    expect(siteNameFromHost("mykavo.app")).toBe("Mykavo");
    expect(siteNameFromHost("shop.example.com")).toBe("Shop");
  });
});
