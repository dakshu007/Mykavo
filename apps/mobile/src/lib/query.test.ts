import { describe, expect, it } from "vitest";

import { buildQuery } from "./query";

describe("buildQuery", () => {
  it("returns empty string with no defined params", () => {
    expect(buildQuery({})).toBe("");
    expect(buildQuery({ a: undefined, b: undefined })).toBe("");
    expect(buildQuery({ a: "" })).toBe("");
  });

  it("builds and orders pairs, skipping undefined", () => {
    expect(buildQuery({ status: "open", severity: undefined })).toBe("?status=open");
    expect(buildQuery({ status: "open", category: "SEO" })).toBe("?status=open&category=SEO");
  });

  it("percent-encodes keys and values", () => {
    expect(buildQuery({ q: "a b&c=d" })).toBe("?q=a%20b%26c%3Dd");
    expect(buildQuery({ "od d": "x/y" })).toBe("?od%20d=x%2Fy");
  });
});
