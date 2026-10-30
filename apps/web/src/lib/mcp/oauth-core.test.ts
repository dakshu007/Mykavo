import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  authorizationServerMetadata,
  basicCredentials,
  callbackUrl,
  describeRedirect,
  isAllowedRedirectUri,
  parseAuthorizeRequest,
  parseAuthorizeTarget,
  parseRegistration,
  protectedResourceMetadata,
  sameHash,
  sameResource,
  sha256,
  verifyPkce,
  wwwAuthenticate,
} from "./oauth-core";

const BASE = "https://mykavo.app";
const RESOURCE = `${BASE}/api/mcp`;
const verifier = "a".repeat(20) + "-._~" + "B".repeat(30);
const challenge = createHash("sha256").update(verifier).digest("base64url");

const goodAuthorize = {
  response_type: "code",
  client_id: "mko_ci_abc",
  redirect_uri: "https://claude.ai/api/mcp/auth_callback",
  code_challenge: challenge,
  code_challenge_method: "S256",
  state: "xyz",
  scope: "mcp:read",
};

describe("PKCE", () => {
  it("accepts the verifier that produced the challenge", () => {
    expect(verifyPkce(verifier, challenge)).toBe(true);
  });
  it("rejects a different verifier, a short verifier and a malformed challenge", () => {
    expect(verifyPkce(verifier.replace("a", "b"), challenge)).toBe(false);
    expect(verifyPkce("short", challenge)).toBe(false);
    expect(verifyPkce(verifier, "not-a-challenge")).toBe(false);
  });
});

describe("redirect URIs", () => {
  it("allows https, loopback http and app schemes", () => {
    expect(isAllowedRedirectUri("https://claude.ai/api/mcp/auth_callback")).toBe(true);
    expect(isAllowedRedirectUri("https://chatgpt.com/connector_platform_oauth_redirect")).toBe(true);
    expect(isAllowedRedirectUri("http://localhost:6274/oauth/callback")).toBe(true);
    expect(isAllowedRedirectUri("http://127.0.0.1:33418/callback")).toBe(true);
    expect(isAllowedRedirectUri("cursor://anysphere.cursor-mcp/oauth/callback")).toBe(true);
  });
  it("refuses remote http, script schemes, fragments, credentials and junk", () => {
    expect(isAllowedRedirectUri("http://evil.example/cb")).toBe(false);
    expect(isAllowedRedirectUri("javascript:alert(1)")).toBe(false);
    expect(isAllowedRedirectUri("data:text/html,hi")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai/cb#frag")).toBe(false);
    expect(isAllowedRedirectUri("https://user:pass@claude.ai/cb")).toBe(false);
    expect(isAllowedRedirectUri("https://claude.ai/c b")).toBe(false);
    expect(isAllowedRedirectUri("")).toBe(false);
    expect(isAllowedRedirectUri("not a url")).toBe(false);
  });
  it("names known apps, local apps and everything else by host", () => {
    expect(describeRedirect("https://claude.ai/api/mcp/auth_callback")).toEqual({ label: "claude.ai", knownApp: "Claude", local: false });
    expect(describeRedirect("https://chatgpt.com/x").knownApp).toBe("ChatGPT");
    expect(describeRedirect("http://localhost:3000/cb").local).toBe(true);
    expect(describeRedirect("https://claude.ai.evil.example/cb")).toEqual({
      label: "claude.ai.evil.example",
      knownApp: null,
      local: false,
    });
  });
});

describe("client registration", () => {
  it("registers a public client by default and dedupes URIs", () => {
    const r = parseRegistration({
      client_name: "  Claude\u0007 ",
      redirect_uris: ["https://claude.ai/api/mcp/auth_callback", "https://claude.ai/api/mcp/auth_callback"],
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
    });
    expect(r).toEqual({
      ok: true,
      value: { name: "Claude", redirectUris: ["https://claude.ai/api/mcp/auth_callback"], authMethod: "none" },
    });
  });
  it("accepts confidential clients", () => {
    const r = parseRegistration({ redirect_uris: ["https://chatgpt.com/cb"], token_endpoint_auth_method: "client_secret_post" });
    expect(r.ok && r.value.authMethod).toBe("client_secret_post");
  });
  it("rejects missing or bad redirect URIs and unsupported grants", () => {
    expect(parseRegistration({}).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: [] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["http://evil.example/cb"] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["https://a.example/cb"], grant_types: ["client_credentials"] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["https://a.example/cb"], response_types: ["token"] }).ok).toBe(false);
    expect(parseRegistration({ redirect_uris: ["https://a.example/cb"], token_endpoint_auth_method: "private_key_jwt" }).ok).toBe(false);
    expect(parseRegistration([1, 2]).ok).toBe(false);
  });
});

describe("authorization requests", () => {
  it("accepts a well-formed PKCE request", () => {
    const r = parseAuthorizeRequest(goodAuthorize, RESOURCE);
    expect(r).toEqual({
      ok: true,
      value: {
        clientId: "mko_ci_abc",
        redirectUri: goodAuthorize.redirect_uri,
        state: "xyz",
        codeChallenge: challenge,
        scope: "mcp:read",
        resource: null,
      },
    });
  });
  it("tolerates offline_access and an omitted scope", () => {
    expect(parseAuthorizeRequest({ ...goodAuthorize, scope: "mcp:read offline_access" }, RESOURCE).ok).toBe(true);
    expect(parseAuthorizeRequest({ ...goodAuthorize, scope: undefined }, RESOURCE).ok).toBe(true);
  });
  it("requires S256 PKCE and the code response type", () => {
    expect(parseAuthorizeRequest({ ...goodAuthorize, code_challenge_method: "plain" }, RESOURCE)).toMatchObject({ ok: false });
    expect(parseAuthorizeRequest({ ...goodAuthorize, code_challenge: undefined }, RESOURCE)).toMatchObject({ ok: false });
    expect(parseAuthorizeRequest({ ...goodAuthorize, response_type: "token" }, RESOURCE)).toMatchObject({
      ok: false,
      error: "unsupported_response_type",
    });
  });
  it("rejects other scopes and other resources", () => {
    expect(parseAuthorizeRequest({ ...goodAuthorize, scope: "admin" }, RESOURCE)).toMatchObject({ error: "invalid_scope" });
    expect(parseAuthorizeRequest({ ...goodAuthorize, resource: "https://other.example/mcp" }, RESOURCE)).toMatchObject({
      error: "invalid_target",
    });
    expect(parseAuthorizeRequest({ ...goodAuthorize, resource: `${RESOURCE}/` }, RESOURCE).ok).toBe(true);
    expect(parseAuthorizeRequest({ ...goodAuthorize, resource: BASE }, RESOURCE).ok).toBe(true);
  });
  it("never trusts a missing client or a bad redirect enough to redirect", () => {
    expect(parseAuthorizeTarget({ redirect_uri: goodAuthorize.redirect_uri }).ok).toBe(false);
    expect(parseAuthorizeTarget({ client_id: "x", redirect_uri: "javascript:alert(1)" }).ok).toBe(false);
  });
});

describe("helpers", () => {
  it("builds callback URLs, keeping existing query and skipping nulls", () => {
    expect(callbackUrl("https://chatgpt.com/cb?a=1", { code: "c", state: null, iss: BASE })).toBe(
      "https://chatgpt.com/cb?a=1&code=c&iss=https%3A%2F%2Fmykavo.app",
    );
  });
  it("compares resources and hashes", () => {
    expect(sameResource("https://mykavo.app/api/mcp/", RESOURCE)).toBe(true);
    expect(sameResource("https://mykavo.app/api", RESOURCE)).toBe(false);
    expect(sameHash(sha256("a"), sha256("a"))).toBe(true);
    expect(sameHash(sha256("a"), sha256("b"))).toBe(false);
    expect(sameHash("", "")).toBe(false);
  });
  it("reads HTTP Basic client credentials", () => {
    const header = `Basic ${Buffer.from("client%3A1:s3cr:et").toString("base64")}`;
    expect(basicCredentials(header)).toEqual({ id: "client:1", secret: "s3cr:et" });
    expect(basicCredentials("Bearer x")).toBeNull();
    expect(basicCredentials(null)).toBeNull();
  });
  it("publishes discovery documents that point at each other", () => {
    const pr = protectedResourceMetadata(BASE);
    const as = authorizationServerMetadata(BASE);
    expect(pr.resource).toBe(RESOURCE);
    expect(pr.authorization_servers).toEqual([as.issuer]);
    expect(as.code_challenge_methods_supported).toEqual(["S256"]);
    expect(as.scopes_supported).toContain("offline_access");
    expect(wwwAuthenticate(BASE)).toContain(`resource_metadata="${BASE}/.well-known/oauth-protected-resource/api/mcp"`);
    expect(wwwAuthenticate(BASE, "invalid_token")).toContain('error="invalid_token"');
  });
});
