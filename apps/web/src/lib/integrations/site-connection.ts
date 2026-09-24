/**
 * Pure building blocks for CMS plugin connections (the MyKavo WordPress
 * plugin). No database or Next.js imports - everything here is unit-tested.
 *
 * The handshake is OAuth's authorization-code flow with PKCE, minus the
 * client registry (every WordPress site is its own public client):
 *
 *   1. The plugin opens /connect/wordpress on mykavo.app with its site URL,
 *      its wp-admin return URL, a CSRF `state`, and an S256 PKCE challenge.
 *   2. A signed-in workspace member picks the website and approves.
 *      mykavo.app records a one-time code (hash only) and redirects back to
 *      the return URL with it.
 *   3. The plugin's SERVER trades code + PKCE verifier for an access token
 *      scoped to that one website. Only the token's hash is stored.
 *
 * A code seen in a browser history, a log or a referrer is useless without
 * the verifier, which never leaves the WordPress server.
 */

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const TOKEN_PREFIX = "mkv_wp_";
export const CODE_TTL_MS = 10 * 60 * 1000;
/** How long a signed screenshot / diff link works. */
export const MEDIA_TTL_MS = 30 * 60 * 1000;

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function newConnectCode(): string {
  return randomBytes(32).toString("base64url");
}

export function newAccessToken(): string {
  return `${TOKEN_PREFIX}${randomBytes(32).toString("base64url")}`;
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

/* ---------------------------------- PKCE --------------------------------- */

const PKCE_VERIFIER = /^[A-Za-z0-9\-._~]{43,128}$/;
const PKCE_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;

export function isValidChallenge(challenge: string): boolean {
  return PKCE_CHALLENGE.test(challenge);
}

/** RFC 7636 S256: BASE64URL(SHA256(verifier)) must equal the challenge. */
export function verifyPkce(verifier: string, challenge: string): boolean {
  if (!PKCE_VERIFIER.test(verifier) || !isValidChallenge(challenge)) return false;
  const computed = createHash("sha256").update(verifier).digest("base64url");
  return safeEqual(computed, challenge);
}

/* --------------------------- connect request ---------------------------- */

export interface ConnectRequest {
  siteUrl: string;
  /** Origin + path of the site, for matching against MyKavo websites. */
  siteHost: string;
  returnUrl: string;
  state: string;
  challenge: string;
  siteName: string | null;
  pluginVersion: string | null;
  platformVersion: string | null;
}

export type ConnectRequestCheck = { ok: true; value: ConnectRequest } | { ok: false; error: string };

function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function shortText(raw: string | null | undefined, max: number): string | null {
  if (!raw) return null;
  const trimmed = raw.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, max) : null;
}

/** Hostname without a leading "www." - how sites are matched to websites. */
export function bareHost(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, "");
}

/**
 * Validate the query a plugin sends to /connect/wordpress. The return URL
 * must be the same site's wp-admin: a connect link that bounced the code to
 * any other host would hand it to whoever crafted the link.
 */
export function parseConnectRequest(params: {
  site?: string | null;
  return?: string | null;
  state?: string | null;
  challenge?: string | null;
  name?: string | null;
  pv?: string | null;
  wpv?: string | null;
}): ConnectRequestCheck {
  const site = parseHttpUrl(params.site);
  if (!site) return { ok: false, error: "The plugin sent an invalid site address." };
  const back = parseHttpUrl(params.return);
  if (!back) return { ok: false, error: "The plugin sent an invalid return address." };
  if (back.host.toLowerCase() !== site.host.toLowerCase()) {
    return { ok: false, error: "The return address is not on the site being connected." };
  }
  if (!back.pathname.includes("/wp-admin/")) {
    return { ok: false, error: "The return address must be the site's WordPress admin." };
  }
  const state = params.state ?? "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(state)) {
    return { ok: false, error: "The connect link is incomplete. Start again from WordPress." };
  }
  const challenge = params.challenge ?? "";
  if (!isValidChallenge(challenge)) {
    return { ok: false, error: "The connect link is incomplete. Start again from WordPress." };
  }
  site.hash = "";
  back.hash = "";
  return {
    ok: true,
    value: {
      siteUrl: site.toString().replace(/\/$/, ""),
      siteHost: bareHost(site.hostname),
      returnUrl: back.toString(),
      state,
      challenge,
      siteName: shortText(params.name, 120),
      pluginVersion: shortText(params.pv, 20),
      platformVersion: shortText(params.wpv, 20),
    },
  };
}

/** The return URL with the one-time code and the plugin's own state added. */
export function buildReturnUrl(returnUrl: string, code: string, state: string): string {
  const url = new URL(returnUrl);
  url.searchParams.set("mykavo_code", code);
  url.searchParams.set("mykavo_state", state);
  return url.toString();
}

/* ------------------------------ signed media ----------------------------- */

export type MediaKind = "shot" | "diff";

function mediaKey(secret: string): Buffer {
  return createHmac("sha256", secret).update("mykavo:plugin-media:v1").digest();
}

function mediaMac(kind: MediaKind, id: string, exp: number, secret: string): string {
  return createHmac("sha256", mediaKey(secret))
    .update(`${kind}:${id}:${exp}`)
    .digest("base64url");
}

/**
 * A short-lived link the wp-admin browser can load an image from directly,
 * so screenshots never pass through (or slow down) the WordPress server and
 * the access token never reaches the browser. Issued only for images of the
 * connection's own website.
 */
export function signMediaPath(
  kind: MediaKind,
  id: string,
  secret: string,
  now: number = Date.now(),
): string {
  const exp = now + MEDIA_TTL_MS;
  const params = new URLSearchParams({ k: kind, id, exp: String(exp), sig: mediaMac(kind, id, exp, secret) });
  return `/api/wp/v1/media?${params.toString()}`;
}

export function verifyMediaParams(
  params: { k?: string | null; id?: string | null; exp?: string | null; sig?: string | null },
  secret: string,
  now: number = Date.now(),
): { kind: MediaKind; id: string } | null {
  const kind = params.k === "shot" || params.k === "diff" ? params.k : null;
  const id = params.id ?? "";
  const exp = Number(params.exp);
  const sig = params.sig ?? "";
  if (!kind || !/^[a-z0-9]{10,40}$/i.test(id) || !Number.isFinite(exp) || !sig) return null;
  if (now > exp || exp - now > MEDIA_TTL_MS + 60_000) return null;
  return safeEqual(sig, mediaMac(kind, id, exp, secret)) ? { kind, id } : null;
}
