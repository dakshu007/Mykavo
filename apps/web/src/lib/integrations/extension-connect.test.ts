import { describe, expect, it } from "vitest";
import {
  cleanVersion,
  connectErrorMessage,
  connectQuery,
  isExtensionEvent,
  isValidInstallId,
  parseExtensionConnectRequest,
} from "./extension-connect";

const STATE = "s".repeat(24);
const CHALLENGE = "a".repeat(43);

function parse(over: Record<string, string | null> = {}) {
  return parseExtensionConnectRequest({
    site: "https://www.Example.com",
    page: "https://www.example.com/pricing?plan=pro#faq",
    state: STATE,
    challenge: CHALLENGE,
    v: "2.0.0",
    install: "inst_1234567890abcdef",
    ...over,
  });
}

describe("parseExtensionConnectRequest", () => {
  it("normalises the site and keeps a same-site page without its fragment", () => {
    const r = parse();
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.siteUrl).toBe("https://www.example.com");
    expect(r.value.siteHost).toBe("example.com");
    expect(r.value.pageUrl).toBe("https://www.example.com/pricing?plan=pro");
    expect(r.value.extensionVersion).toBe("2.0.0");
    expect(r.value.installId).toBe("inst_1234567890abcdef");
  });

  it("uses only the origin of the site URL", () => {
    const r = parse({ site: "https://example.com/blog/post?x=1" });
    expect(r.ok && r.value.siteUrl).toBe("https://example.com");
  });

  it("drops a page on another host instead of trusting it", () => {
    const r = parse({ page: "https://evil.test/phish" });
    expect(r.ok && r.value.pageUrl).toBeNull();
  });

  it.each([
    ["chrome://extensions", "non-http scheme"],
    ["file:///etc/passwd", "file scheme"],
    ["https://user:pw@example.com", "credentials"],
    ["http://localhost:3000", "dotless host"],
    ["not a url", "garbage"],
  ])("rejects %s (%s)", (site) => {
    expect(parse({ site }).ok).toBe(false);
  });

  it("requires a well-formed state and PKCE challenge", () => {
    expect(parse({ state: "short" }).ok).toBe(false);
    expect(parse({ state: null }).ok).toBe(false);
    expect(parse({ challenge: "x".repeat(42) }).ok).toBe(false);
    expect(parse({ challenge: null }).ok).toBe(false);
  });

  it("ignores a malformed version or install id rather than failing", () => {
    const r = parse({ v: "<script>", install: "x" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.extensionVersion).toBeNull();
    expect(r.value.installId).toBeNull();
  });
});

describe("connectQuery", () => {
  it("round-trips through the parser", () => {
    const r = parse();
    if (!r.ok) throw new Error("parse failed");
    const q = Object.fromEntries(new URLSearchParams(connectQuery(r.value)));
    const again = parseExtensionConnectRequest(q);
    expect(again).toEqual(r);
  });
});

describe("small validators", () => {
  it("knows only the listed error codes", () => {
    expect(connectErrorMessage("limit")).toMatch(/limit/);
    expect(connectErrorMessage("constructor")).toBeNull();
    expect(connectErrorMessage("nope")).toBeNull();
    expect(connectErrorMessage(null)).toBeNull();
  });

  it("accepts only listed extension events", () => {
    expect(isExtensionEvent("opened")).toBe(true);
    expect(isExtensionEvent("page_url")).toBe(false);
    expect(isExtensionEvent(42)).toBe(false);
  });

  it("validates install ids and versions", () => {
    expect(isValidInstallId("abcdefghijklmnop")).toBe(true);
    expect(isValidInstallId("short")).toBe(false);
    expect(isValidInstallId("has space in it 123")).toBe(false);
    expect(cleanVersion("2.0.1")).toBe("2.0.1");
    expect(cleanVersion("2.0.1-beta")).toBeNull();
  });
});
