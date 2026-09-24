import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  THEME_EDIT_THROTTLE_MS,
  adminAppUrl,
  decideThemeCheck,
  isShopDomain,
  looksLikeJwt,
  signLinkToken,
  storePages,
  themeNote,
  themeTopic,
  verifyLinkToken,
  verifySessionToken,
  verifyWebhookHmac,
} from "./shopify";

const API_KEY = "test-client-id";
const SECRET = "test-client-secret";
const NOW = Date.UTC(2026, 8, 25, 12, 0, 0);
const nowS = Math.floor(NOW / 1000);

function jwt(claims: Record<string, unknown>, opts: { secret?: string; alg?: string } = {}): string {
  const head = Buffer.from(JSON.stringify({ alg: opts.alg ?? "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(claims)).toString("base64url");
  const sig = createHmac("sha256", opts.secret ?? SECRET).update(`${head}.${body}`).digest("base64url");
  return `${head}.${body}.${sig}`;
}

const good = {
  iss: "https://acme.myshopify.com/admin",
  dest: "https://acme.myshopify.com",
  aud: API_KEY,
  sub: "42",
  exp: nowS + 60,
  nbf: nowS - 1,
  iat: nowS - 1,
};
const verify = (token: string) => verifySessionToken(token, { apiKey: API_KEY, apiSecret: SECRET, nowMs: NOW });

describe("verifySessionToken", () => {
  it("accepts a token Shopify signed for this app and store", () => {
    expect(verify(jwt(good))).toEqual({ shop: "acme.myshopify.com", userId: "42" });
  });

  it.each([
    ["another app's secret", jwt(good, { secret: "other" })],
    ["another app", jwt({ ...good, aud: "other-app" })],
    ["an expired token", jwt({ ...good, exp: nowS - 60 })],
    ["a token not valid yet", jwt({ ...good, nbf: nowS + 120 })],
    ["a non-Shopify destination", jwt({ ...good, dest: "https://evil.example.com", iss: "https://evil.example.com/admin" })],
    ["an issuer for another store", jwt({ ...good, iss: "https://other.myshopify.com/admin" })],
    ["alg none", jwt(good, { alg: "none" })],
    ["garbage", "not.a.token"],
  ])("rejects %s", (_label, token) => {
    expect(verify(token)).toBeNull();
  });

  it("tolerates a little clock skew", () => {
    expect(verify(jwt({ ...good, exp: nowS - 5 }))).not.toBeNull();
  });

  it("tells session tokens apart from WordPress keys", () => {
    expect(looksLikeJwt(jwt(good))).toBe(true);
    expect(looksLikeJwt("mkv_wp_abc123")).toBe(false);
  });
});

describe("verifyWebhookHmac", () => {
  const body = JSON.stringify({ id: 1, name: "Dawn", role: "main" });
  const hmac = createHmac("sha256", SECRET).update(body, "utf8").digest("base64");

  it("accepts Shopify's signature and nothing else", () => {
    expect(verifyWebhookHmac(body, hmac, SECRET)).toBe(true);
    expect(verifyWebhookHmac(`${body} `, hmac, SECRET)).toBe(false);
    expect(verifyWebhookHmac(body, hmac, "other")).toBe(false);
    expect(verifyWebhookHmac(body, null, SECRET)).toBe(false);
  });
});

describe("link tokens", () => {
  it("round-trips the store and expires after an hour", () => {
    const token = signLinkToken("acme.myshopify.com", SECRET, NOW);
    expect(verifyLinkToken(token, SECRET, NOW + 1000)).toBe("acme.myshopify.com");
    expect(verifyLinkToken(token, SECRET, NOW + 61 * 60 * 1000)).toBeNull();
    expect(verifyLinkToken(token, "other", NOW)).toBeNull();
  });

  it("cannot be edited to name another store", () => {
    const [, sig] = signLinkToken("acme.myshopify.com", SECRET, NOW).split(".");
    const forged = Buffer.from(JSON.stringify({ s: "victim.myshopify.com", e: NOW + 1e6 })).toString("base64url");
    expect(verifyLinkToken(`${forged}.${sig}`, SECRET, NOW)).toBeNull();
    expect(verifyLinkToken(null, SECRET, NOW)).toBeNull();
  });
});

describe("theme checks", () => {
  const base = { topic: "publish" as const, role: "main", themeChecks: true, connected: true, lastThemeCheckAt: null, nowMs: NOW };

  it("checks when the live theme is published or edited", () => {
    expect(decideThemeCheck(base)).toEqual({ check: true });
    expect(decideThemeCheck({ ...base, topic: "update" })).toEqual({ check: true });
  });

  it("ignores draft themes, unlinked stores and switched-off checks", () => {
    expect(decideThemeCheck({ ...base, role: "unpublished" })).toEqual({ check: false, reason: "IGNORED" });
    expect(decideThemeCheck({ ...base, connected: false })).toEqual({ check: false, reason: "NOT_CONNECTED" });
    expect(decideThemeCheck({ ...base, themeChecks: false })).toEqual({ check: false, reason: "OFF" });
  });

  it("throttles bursts of edits but never a publish", () => {
    const recent = new Date(NOW - THEME_EDIT_THROTTLE_MS / 2);
    expect(decideThemeCheck({ ...base, topic: "update", lastThemeCheckAt: recent })).toEqual({ check: false, reason: "THROTTLED" });
    expect(decideThemeCheck({ ...base, topic: "publish", lastThemeCheckAt: recent })).toEqual({ check: true });
    const old = new Date(NOW - THEME_EDIT_THROTTLE_MS - 1000);
    expect(decideThemeCheck({ ...base, topic: "update", lastThemeCheckAt: old })).toEqual({ check: true });
  });

  it("names the change", () => {
    expect(themeNote("publish", "Dawn")).toBe("Published theme Dawn");
    expect(themeNote("update", " ")).toBe("Edited theme Untitled theme");
    expect(themeTopic("themes/publish")).toBe("publish");
    expect(themeTopic("themes/update")).toBe("update");
    expect(themeTopic("themes/delete")).toBeNull();
  });
});

describe("store helpers", () => {
  it("accepts only permanent myshopify domains", () => {
    expect(isShopDomain("acme-store.myshopify.com")).toBe(true);
    for (const bad of ["acme.com", "ACME.myshopify.com", "evil.com/.myshopify.com", "a.myshopify.com.evil.com", ""]) {
      expect(isShopDomain(bad)).toBe(false);
    }
  });

  it("builds admin and storefront links", () => {
    expect(adminAppUrl("acme.myshopify.com", "key")).toBe("https://admin.shopify.com/store/acme/apps/key");
    expect(storePages("https://shop.example.com/").map((p) => p.url)).toEqual([
      "https://shop.example.com/",
      "https://shop.example.com/collections/all",
      "https://shop.example.com/cart",
      "https://shop.example.com/search",
    ]);
  });
});
