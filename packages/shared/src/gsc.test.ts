import { describe, expect, it } from "vitest";
import {
  encryptToken, decryptToken, signOauthState, verifyOauthState,
  mergePeriods, buildOpportunities, gscDate,
  GscAuthError, isGscReauthMessage,
} from "./gsc";

const KEY = "a".repeat(64);

describe("gsc token crypto", () => {
  it("round-trips and never stores plaintext", () => {
    const stored = encryptToken("ya29.secret-token", KEY);
    expect(stored).not.toContain("secret");
    expect(decryptToken(stored, KEY)).toBe("ya29.secret-token");
  });
  it("rejects tampered ciphertext and wrong keys", () => {
    const stored = encryptToken("tok", KEY);
    expect(() => decryptToken(stored, "b".repeat(64))).toThrow();
    const [iv, data, tag] = stored.split(".");
    expect(() => decryptToken([iv, data.slice(0, -2) + "AA", tag].join("."), KEY)).toThrow();
  });
});

describe("oauth state", () => {
  it("signs and verifies, rejects tampering and expiry", () => {
    const state = signOauthState("web_1", KEY, 1000);
    expect(verifyOauthState(state, KEY, 60_000, 2000)).toBe("web_1");
    expect(verifyOauthState(state.replace("web_1", "web_2"), KEY, 60_000, 2000)).toBeNull();
    expect(verifyOauthState(state, KEY, 60_000, 100_000)).toBeNull();
  });
});

describe("mergePeriods", () => {
  it("computes click and position deltas (negative position = improved)", () => {
    const merged = mergePeriods(
      [{ key: "/a", clicks: 100, impressions: 1000, ctr: 0.1, position: 3.0 }],
      [{ key: "/a", clicks: 80, impressions: 900, ctr: 0.09, position: 5.5 }],
    );
    expect(merged[0].clicksDelta).toBe(20);
    expect(merged[0].positionDelta).toBe(-2.5);
  });
});

describe("buildOpportunities", () => {
  const page = (key: string, over: object) => ({
    key, clicks: 200, impressions: 5000, ctr: 0.04, position: 5, clicksDelta: null, positionDelta: null, ...over,
  });
  it("flags noindex-with-impressions and high-traffic errors as HIGH", () => {
    const out = buildOpportunities(
      [page("/x", {}), page("/y", {})],
      new Map([
        ["/x", { issues: [{ title: "Noindex page", severity: "WARNING" as const, checkId: "noindex-page" }] }],
        ["/y", { issues: [{ title: "4XX page", severity: "ERROR" as const, checkId: "http-4xx" }] }],
      ]),
    );
    expect(out.map((o) => o.priority)).toEqual(["HIGH", "HIGH"]);
  });
  it("flags low CTR at rankable positions and missing descriptions as MEDIUM", () => {
    const out = buildOpportunities(
      [page("/ctr", { ctr: 0.01, position: 8 }), page("/desc", {})],
      new Map([["/desc", { issues: [{ title: "Missing meta description", severity: "WARNING" as const, checkId: "desc-missing" }] }]]),
    );
    expect(out).toHaveLength(2);
    expect(out.every((o) => o.priority === "MEDIUM")).toBe(true);
  });
  it("returns nothing for healthy low-stakes pages", () => {
    expect(buildOpportunities([page("/ok", { impressions: 50 })], new Map())).toEqual([]);
  });
});

describe("gscDate", () => {
  it("formats UTC dates offset by days", () => {
    expect(gscDate(2, new Date("2026-08-03T05:00:00Z"))).toBe("2026-08-01");
  });
});

describe("dead-grant detection (GSC reconnect flow)", () => {
  it("classifies the canonical GscAuthError message as needing reconnect", () => {
    const err = new GscAuthError("invalid_grant");
    expect(err.reauthRequired).toBe(true);
    expect(err.googleError).toBe("invalid_grant");
    expect(isGscReauthMessage(err.message)).toBe(true);
  });

  it("still classifies raw errors written by earlier builds", () => {
    // Rows already in production carry this exact text - they must classify
    // without a migration or backfill.
    expect(isGscReauthMessage("Google token endpoint: invalid_grant")).toBe(true);
    expect(isGscReauthMessage("Google token endpoint: unauthorized_client")).toBe(true);
  });

  it("does not treat transient or unrelated failures as reconnect-worthy", () => {
    expect(isGscReauthMessage("Google token endpoint: 503")).toBe(false);
    expect(isGscReauthMessage("fetch failed")).toBe(false);
    expect(isGscReauthMessage("Search Console API: 429")).toBe(false);
  });

  it("handles a missing lastError", () => {
    expect(isGscReauthMessage(null)).toBe(false);
    expect(isGscReauthMessage(undefined)).toBe(false);
    expect(isGscReauthMessage("")).toBe(false);
  });
});
