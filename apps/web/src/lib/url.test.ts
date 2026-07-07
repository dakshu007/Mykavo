import { describe, expect, it } from "vitest";
import { isSameOrigin, normalizeUrl, parseUrlInput, resolveHref } from "./url";

describe("parseUrlInput", () => {
  it("accepts full URLs", () => {
    expect(parseUrlInput("https://example.com/a")?.href).toBe("https://example.com/a");
  });

  it("assumes https for scheme-less input", () => {
    expect(parseUrlInput("example.com")?.href).toBe("https://example.com/");
  });

  it("returns null for empty and unparseable input", () => {
    expect(parseUrlInput("")).toBeNull();
    expect(parseUrlInput("   ")).toBeNull();
    expect(parseUrlInput("http://[invalid")).toBeNull();
  });
});

describe("normalizeUrl", () => {
  it("lowercases hostname and strips fragments", () => {
    expect(normalizeUrl("https://EXAMPLE.com/Path#section")).toBe(
      "https://example.com/Path",
    );
  });

  it("removes default ports", () => {
    expect(normalizeUrl("https://example.com:443/a")).toBe("https://example.com/a");
    expect(normalizeUrl("http://example.com:80/a")).toBe("http://example.com/a");
    expect(normalizeUrl("http://example.com:8080/a")).toBe("http://example.com:8080/a");
  });

  it("strips known tracking parameters and sorts the rest", () => {
    expect(
      normalizeUrl("https://example.com/?utm_source=x&b=2&a=1&fbclid=abc"),
    ).toBe("https://example.com/?a=1&b=2");
  });

  it("keeps all params when stripAllParams is false and removes them when true", () => {
    expect(normalizeUrl("https://example.com/?a=1", { stripAllParams: true })).toBe(
      "https://example.com/",
    );
  });

  it("collapses trailing slashes on non-root paths only", () => {
    expect(normalizeUrl("https://example.com/a/")).toBe("https://example.com/a");
    expect(normalizeUrl("https://example.com/")).toBe("https://example.com/");
  });

  it("strips credentials", () => {
    expect(normalizeUrl("https://user:pass@example.com/")).toBe("https://example.com/");
  });
});

describe("resolveHref / isSameOrigin", () => {
  it("resolves relative hrefs against a base", () => {
    expect(resolveHref("/about", "https://example.com/blog/post")?.href).toBe(
      "https://example.com/about",
    );
  });

  it("treats different subdomains as different origins", () => {
    const a = new URL("https://www.example.com/");
    const b = new URL("https://staging.example.com/");
    expect(isSameOrigin(a, b)).toBe(false);
    expect(isSameOrigin(a, new URL("https://www.example.com/x"))).toBe(true);
  });
});
