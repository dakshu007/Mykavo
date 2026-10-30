import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * OAuth 2.1 for the MCP server, the pure parts: token formats, PKCE,
 * redirect URI rules, discovery documents and request validation. No
 * database and no request objects, so every rule here is unit-tested.
 *
 * The flow (what ChatGPT and Claude do when a person adds MyKavo):
 *   1. POST /api/mcp without a token -> 401 naming the protected resource
 *      metadata (RFC 9728), which names this server as the authorization
 *      server (RFC 8414 metadata at /.well-known/oauth-authorization-server).
 *   2. The app registers itself (RFC 7591, /api/oauth/register).
 *   3. The person signs in and approves the app for one workspace on
 *      /oauth/authorize; the app receives a single-use code (PKCE S256 only).
 *   4. The app trades the code for an access token (1 hour) and a refresh
 *      token (rotated on every use) at /api/oauth/token.
 */

export const MCP_SCOPE = "mcp:read";
export const ACCESS_TOKEN_PREFIX = "mko_at_";
export const REFRESH_TOKEN_PREFIX = "mko_rt_";
export const CLIENT_SECRET_PREFIX = "mko_cs_";

export const CODE_TTL_MS = 10 * 60 * 1000;
export const ACCESS_TTL_MS = 60 * 60 * 1000;
export const REFRESH_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export const MAX_REDIRECT_URIS = 10;
const MAX_URI_LENGTH = 2000;
const MAX_CLIENT_NAME = 80;

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function randomToken(prefix = ""): string {
  return `${prefix}${randomBytes(32).toString("base64url")}`;
}

/** Constant-time comparison of two hex digests. */
export function sameHash(a: string, b: string): boolean {
  const x = Buffer.from(a, "hex");
  const y = Buffer.from(b, "hex");
  return x.length === y.length && x.length > 0 && timingSafeEqual(x, y);
}

// --- PKCE (RFC 7636) ---------------------------------------------------------

/** code_verifier: 43-128 characters from the unreserved set. */
const VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
/** An S256 challenge is base64url of a SHA-256: exactly 43 characters. */
const CHALLENGE = /^[A-Za-z0-9\-_]{43}$/;

export function isValidChallenge(challenge: string): boolean {
  return CHALLENGE.test(challenge);
}

export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!VERIFIER.test(verifier) || !CHALLENGE.test(challenge)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  const a = Buffer.from(computed);
  const b = Buffer.from(challenge);
  return a.length === b.length && timingSafeEqual(a, b);
}

// --- Redirect URIs -----------------------------------------------------------

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);
const BLOCKED_SCHEMES = new Set(["javascript:", "data:", "vbscript:", "file:", "blob:", "about:", "ftp:", "ws:", "wss:"]);

/**
 * A redirect URI an app may register: https anywhere, http only to this
 * machine (desktop apps such as Claude Code listen on a loopback port), or
 * a private-use app scheme like cursor:// (RFC 8252). Never script or data
 * schemes, fragments or embedded credentials.
 */
export function isAllowedRedirectUri(raw: string): boolean {
  if (typeof raw !== "string" || raw.length === 0 || raw.length > MAX_URI_LENGTH) return false;
  if (/[\u0000- \u007f\\]/.test(raw)) return false;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return false;
  }
  if (url.hash || raw.includes("#")) return false;
  if (url.username || url.password) return false;
  const scheme = url.protocol.toLowerCase();
  if (BLOCKED_SCHEMES.has(scheme)) return false;
  if (scheme === "https:") return url.hostname.length > 0;
  if (scheme === "http:") return LOOPBACK_HOSTS.has(url.hostname);
  // Private-use schemes: letters first, as RFC 3986 requires.
  return /^[a-z][a-z0-9+.-]*:$/.test(scheme);
}

/**
 * Apps whose callbacks we recognise, shown as such on the consent screen.
 * Anything else still works, but the screen names the exact destination so
 * nobody approves a look-alike app by mistake.
 */
const KNOWN_CALLBACK_HOSTS: Record<string, string> = {
  "claude.ai": "Claude",
  "claude.com": "Claude",
  "chatgpt.com": "ChatGPT",
  "chat.openai.com": "ChatGPT",
};

export interface RedirectDestination {
  /** What the person sees: a host, "this computer" or an app scheme. */
  label: string;
  /** Claude, ChatGPT, or null when unrecognised. */
  knownApp: string | null;
  local: boolean;
}

export function describeRedirect(raw: string): RedirectDestination {
  const url = new URL(raw);
  if (url.protocol === "http:" || LOOPBACK_HOSTS.has(url.hostname)) {
    return { label: "an app on this computer", knownApp: null, local: true };
  }
  if (url.protocol !== "https:") return { label: `${url.protocol}//${url.host}`, knownApp: null, local: true };
  const host = url.hostname.toLowerCase();
  return { label: host, knownApp: KNOWN_CALLBACK_HOSTS[host] ?? null, local: false };
}

// --- Client registration (RFC 7591) -----------------------------------------

export type TokenAuthMethod = "none" | "client_secret_post" | "client_secret_basic";

export interface ClientRegistration {
  name: string;
  redirectUris: string[];
  authMethod: TokenAuthMethod;
}

export type Validation<T> = { ok: true; value: T } | { ok: false; error: string; description: string };

const fail = (error: string, description: string) => ({ ok: false as const, error, description });

export function parseRegistration(body: unknown): Validation<ClientRegistration> {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return fail("invalid_client_metadata", "Body must be a JSON object.");
  }
  const b = body as Record<string, unknown>;
  const uris = b.redirect_uris;
  if (!Array.isArray(uris) || uris.length === 0 || uris.length > MAX_REDIRECT_URIS) {
    return fail("invalid_redirect_uri", `redirect_uris must list 1 to ${MAX_REDIRECT_URIS} URIs.`);
  }
  for (const uri of uris) {
    if (typeof uri !== "string" || !isAllowedRedirectUri(uri)) {
      return fail("invalid_redirect_uri", "Each redirect URI must be https, http to localhost, or an app scheme, without a fragment.");
    }
  }
  const grantTypes = b.grant_types;
  if (grantTypes !== undefined) {
    if (!Array.isArray(grantTypes) || !grantTypes.includes("authorization_code")) {
      return fail("invalid_client_metadata", "grant_types must include authorization_code.");
    }
    if (grantTypes.some((g) => g !== "authorization_code" && g !== "refresh_token")) {
      return fail("invalid_client_metadata", "Only authorization_code and refresh_token are supported.");
    }
  }
  const responseTypes = b.response_types;
  if (responseTypes !== undefined && (!Array.isArray(responseTypes) || responseTypes.some((r) => r !== "code"))) {
    return fail("invalid_client_metadata", "Only the code response type is supported.");
  }
  const method = b.token_endpoint_auth_method ?? "none";
  if (method !== "none" && method !== "client_secret_post" && method !== "client_secret_basic") {
    return fail("invalid_client_metadata", "token_endpoint_auth_method must be none, client_secret_post or client_secret_basic.");
  }
  const rawName = typeof b.client_name === "string" ? b.client_name : "";
  // Control characters and surrounding space never reach the consent screen.
  const name = rawName.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, MAX_CLIENT_NAME) || "AI assistant";
  return { ok: true, value: { name, redirectUris: [...new Set(uris as string[])], authMethod: method } };
}

// --- Authorization request ---------------------------------------------------

export interface AuthorizeRequest {
  clientId: string;
  redirectUri: string;
  state: string | null;
  codeChallenge: string;
  scope: string;
  resource: string | null;
}

type Params = Record<string, string | null | undefined>;

/**
 * Checks that never redirect: until client_id and redirect_uri are known to
 * match a registered app, an error must be shown here, not sent anywhere.
 */
export function parseAuthorizeTarget(p: Params): Validation<{ clientId: string; redirectUri: string }> {
  const clientId = p.client_id ?? "";
  const redirectUri = p.redirect_uri ?? "";
  if (!clientId || clientId.length > 200) return fail("invalid_request", "The link is missing its app (client_id).");
  if (!redirectUri || !isAllowedRedirectUri(redirectUri)) return fail("invalid_request", "The link has an invalid redirect_uri.");
  return { ok: true, value: { clientId, redirectUri } };
}

/** Checks reported back to the app as an OAuth error redirect. */
export function parseAuthorizeRequest(p: Params, resourceUrl: string): Validation<AuthorizeRequest> {
  const target = parseAuthorizeTarget(p);
  if (!target.ok) return target;
  if (p.response_type !== "code") return fail("unsupported_response_type", "Only response_type=code is supported.");
  const challenge = p.code_challenge ?? "";
  if (p.code_challenge_method !== "S256" || !isValidChallenge(challenge)) {
    return fail("invalid_request", "PKCE with code_challenge_method=S256 is required.");
  }
  const scopes = (p.scope ?? MCP_SCOPE).split(/\s+/).filter(Boolean);
  // Clients ask for whatever their defaults are; read-only is all there is.
  if (scopes.some((s) => s !== MCP_SCOPE && s !== "openid" && s !== "profile" && s !== "email" && s !== "offline_access")) {
    return fail("invalid_scope", `The only scope is ${MCP_SCOPE}.`);
  }
  const resource = p.resource ?? null;
  if (resource && !sameResource(resource, resourceUrl)) {
    return fail("invalid_target", "This server only issues tokens for its own MCP endpoint.");
  }
  const state = p.state ?? null;
  if (state && state.length > 1000) return fail("invalid_request", "state is too long.");
  return {
    ok: true,
    value: { ...target.value, state, codeChallenge: challenge, scope: MCP_SCOPE, resource },
  };
}

/** The MCP endpoint, its origin, or either with a trailing slash. */
export function sameResource(requested: string, resourceUrl: string): boolean {
  const norm = (s: string) => s.replace(/\/+$/, "");
  const r = norm(requested);
  return r === norm(resourceUrl) || r === new URL(resourceUrl).origin;
}

/** Where the app is sent after the person decides. */
export function callbackUrl(redirectUri: string, params: Record<string, string | null>): string {
  const url = new URL(redirectUri);
  for (const [k, v] of Object.entries(params)) if (v !== null) url.searchParams.set(k, v);
  return url.toString();
}

// --- Discovery documents -----------------------------------------------------

export function protectedResourceMetadata(base: string) {
  return {
    resource: `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported: [MCP_SCOPE],
    bearer_methods_supported: ["header"],
    resource_name: "MyKavo",
    resource_documentation: `${base}/dashboard/ai-assistants`,
  };
}

export function authorizationServerMetadata(base: string) {
  return {
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    revocation_endpoint: `${base}/api/oauth/revoke`,
    // offline_access is advertised because ChatGPT only expects refresh
    // tokens from servers that list it. Every grant here gets one anyway.
    scopes_supported: [MCP_SCOPE, "offline_access"],
    response_types_supported: ["code"],
    response_modes_supported: ["query"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    revocation_endpoint_auth_methods_supported: ["none", "client_secret_post", "client_secret_basic"],
    authorization_response_iss_parameter_supported: true,
    service_documentation: `${base}/dashboard/ai-assistants`,
  };
}

/** The 401 header that tells an MCP client where to start signing in. */
export function wwwAuthenticate(base: string, error?: "invalid_token"): string {
  const parts = [`Bearer realm="MyKavo MCP"`, `resource_metadata="${base}/.well-known/oauth-protected-resource/api/mcp"`];
  if (error) parts.push(`error="${error}"`);
  return parts.join(", ");
}

/** client_id and client_secret from an HTTP Basic header, if any. */
export function basicCredentials(header: string | null): { id: string; secret: string } | null {
  const m = /^Basic\s+([A-Za-z0-9+/=]+)$/i.exec(header ?? "");
  if (!m) return null;
  const decoded = Buffer.from(m[1], "base64").toString("utf8");
  const i = decoded.indexOf(":");
  if (i < 1) return null;
  try {
    return { id: decodeURIComponent(decoded.slice(0, i)), secret: decodeURIComponent(decoded.slice(i + 1)) };
  } catch {
    return null;
  }
}
