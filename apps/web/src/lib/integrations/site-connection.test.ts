import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  MEDIA_TTL_MS,
  TOKEN_PREFIX,
  bareHost,
  buildReturnUrl,
  newAccessToken,
  newConnectCode,
  parseConnectRequest,
  signMediaPath,
  verifyMediaParams,
  verifyPkce,
} from "./site-connection";

const VERIFIER = "a".repeat(20) + "B".repeat(20) + "-._~9";
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");

const good = {
  site: "https://www.example.com",
  return: "https://www.example.com/wp-admin/admin.php?page=mykavo",
  state: "state_abcdefghijklmnop",
  challenge: CHALLENGE,
  name: "  Example   Store ",
  pv: "1.0.0",
  wpv: "6.8",
};

describe("PKCE", () => {
  it("accepts the verifier that produced the challenge", () => {
    expect(verifyPkce(VERIFIER, CHALLENGE)).toBe(true);
  });

  it("rejects any other verifier, and malformed input", () => {
    expect(verifyPkce(VERIFIER.replace("a", "b"), CHALLENGE)).toBe(false);
    expect(verifyPkce("short", CHALLENGE)).toBe(false);
    expect(verifyPkce(VERIFIER, "not-a-challenge")).toBe(false);
    expect(verifyPkce(VERIFIER + " ", CHALLENGE)).toBe(false);
  });
});

describe("parseConnectRequest", () => {
  it("accepts a well-formed request and tidies it", () => {
    const result = parseConnectRequest(good);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.siteUrl).toBe("https://www.example.com");
    expect(result.value.siteHost).toBe("example.com");
    expect(result.value.siteName).toBe("Example Store");
  });

  it("refuses to send the code to another host", () => {
    const result = parseConnectRequest({
      ...good,
      return: "https://evil.test/wp-admin/admin.php?page=mykavo",
    });
    expect(result).toEqual({ ok: false, error: "The return address is not on the site being connected." });
  });

  it("refuses a return address outside wp-admin", () => {
    expect(parseConnectRequest({ ...good, return: "https://www.example.com/collect" }).ok).toBe(false);
  });

  it("refuses non-http schemes, credentials and missing PKCE", () => {
    expect(parseConnectRequest({ ...good, site: "javascript:alert(1)" }).ok).toBe(false);
    expect(parseConnectRequest({ ...good, site: "https://u:p@www.example.com" }).ok).toBe(false);
    expect(parseConnectRequest({ ...good, challenge: "" }).ok).toBe(false);
    expect(parseConnectRequest({ ...good, state: "x" }).ok).toBe(false);
  });
});

describe("buildReturnUrl", () => {
  it("keeps the admin page and adds the code and state", () => {
    const url = new URL(buildReturnUrl(good.return, "code123", good.state));
    expect(url.searchParams.get("page")).toBe("mykavo");
    expect(url.searchParams.get("mykavo_code")).toBe("code123");
    expect(url.searchParams.get("mykavo_state")).toBe(good.state);
  });
});

describe("secrets", () => {
  it("tokens carry the prefix and are unique", () => {
    const a = newAccessToken();
    expect(a.startsWith(TOKEN_PREFIX)).toBe(true);
    expect(a).not.toBe(newAccessToken());
    expect(newConnectCode()).not.toBe(newConnectCode());
  });

  it("bareHost ignores www and case", () => {
    expect(bareHost("WWW.Example.com")).toBe("example.com");
  });
});

describe("signed media links", () => {
  const SECRET = "s".repeat(40);
  const NOW = 1_800_000_000_000;

  function params(path: string) {
    const url = new URL(path, "https://mykavo.app");
    return {
      k: url.searchParams.get("k"),
      id: url.searchParams.get("id"),
      exp: url.searchParams.get("exp"),
      sig: url.searchParams.get("sig"),
    };
  }

  it("verifies its own links", () => {
    const p = params(signMediaPath("shot", "snap1234567890", SECRET, NOW));
    expect(verifyMediaParams(p, SECRET, NOW)).toEqual({ kind: "shot", id: "snap1234567890" });
  });

  it("rejects a link for a different image, kind or secret", () => {
    const p = params(signMediaPath("shot", "snap1234567890", SECRET, NOW));
    expect(verifyMediaParams({ ...p, id: "snap0000000000" }, SECRET, NOW)).toBeNull();
    expect(verifyMediaParams({ ...p, k: "diff" }, SECRET, NOW)).toBeNull();
    expect(verifyMediaParams(p, "t".repeat(40), NOW)).toBeNull();
  });

  it("expires, and refuses an expiry pushed into the future", () => {
    const p = params(signMediaPath("diff", "change1234567", SECRET, NOW));
    expect(verifyMediaParams(p, SECRET, NOW + MEDIA_TTL_MS + 1)).toBeNull();
    const far = { ...p, exp: String(NOW + 10 * MEDIA_TTL_MS) };
    expect(verifyMediaParams(far, SECRET, NOW)).toBeNull();
  });
});
