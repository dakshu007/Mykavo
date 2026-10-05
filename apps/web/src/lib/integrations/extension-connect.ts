/**
 * Pure building blocks for connecting the MyKavo Chrome extension to a
 * website. No database or Next.js imports - everything here is unit-tested.
 *
 * It is the WordPress plugin's handshake (authorization code + PKCE, see
 * site-connection.ts) with one difference: there is no return URL. The
 * extension opens /connect/chrome in a normal tab, so the user's existing
 * MyKavo session (or a fresh signup) just works. After approval the one-time
 * code is shown to the extension on /connect/chrome/done - read there by the
 * extension's content script - and the extension's background worker trades
 * it, with the PKCE verifier only it holds, for a token scoped to that one
 * website. A code read off that page by anything else is useless.
 */

import { bareHost, isValidChallenge } from "@/lib/integrations/site-connection";

export const EXTENSION_PLATFORM = "chrome";

export interface ExtensionConnectRequest {
  /** Origin of the site the extension was on, e.g. https://www.example.com. */
  siteUrl: string;
  /** Hostname without "www." - how sites are matched to websites. */
  siteHost: string;
  /** The page the user was on, when it is on the same site. */
  pageUrl: string | null;
  state: string;
  challenge: string;
  extensionVersion: string | null;
  /** Anonymous per-install id, for the acquisition funnel. */
  installId: string | null;
}

export type ExtensionConnectCheck =
  | { ok: true; value: ExtensionConnectRequest }
  | { ok: false; error: string };

export interface ExtensionConnectParams {
  site?: string | null;
  page?: string | null;
  state?: string | null;
  challenge?: string | null;
  v?: string | null;
  install?: string | null;
}

const RESTART = "This link is incomplete or expired. Open the MyKavo extension and press Protect again.";

function parseHttpUrl(raw: string | null | undefined): URL | null {
  if (!raw || raw.length > 2048) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (url.username || url.password) return null;
    // A dotless host (localhost, intranet names) can never be monitored.
    if (!url.hostname.includes(".")) return null;
    return url;
  } catch {
    return null;
  }
}

export function isValidInstallId(raw: string | null | undefined): raw is string {
  return typeof raw === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(raw);
}

export function cleanVersion(raw: string | null | undefined): string | null {
  return raw && /^\d{1,3}(?:\.\d{1,4}){0,3}$/.test(raw) ? raw : null;
}

/**
 * Validate what the extension sends to /connect/chrome. Nothing here is
 * trusted beyond its shape: the site is re-validated (DNS + SSRF rules)
 * before MyKavo ever fetches it, and workspace and website come from the
 * signed-in session, never from the query.
 */
export function parseExtensionConnectRequest(params: ExtensionConnectParams): ExtensionConnectCheck {
  const site = parseHttpUrl(params.site);
  if (!site) return { ok: false, error: "This page can't be monitored. Open a public website and try again." };
  const state = params.state ?? "";
  if (!/^[A-Za-z0-9_-]{16,128}$/.test(state)) return { ok: false, error: RESTART };
  const challenge = params.challenge ?? "";
  if (!isValidChallenge(challenge)) return { ok: false, error: RESTART };

  let pageUrl: string | null = null;
  const page = parseHttpUrl(params.page);
  if (page && page.host.toLowerCase() === site.host.toLowerCase()) {
    page.hash = "";
    pageUrl = page.toString();
  }

  return {
    ok: true,
    value: {
      siteUrl: site.origin,
      siteHost: bareHost(site.hostname),
      pageUrl,
      state,
      challenge,
      extensionVersion: cleanVersion(params.v),
      installId: isValidInstallId(params.install) ? params.install : null,
    },
  };
}

/** The query string that reproduces a request - for sign-in round trips. */
export function connectQuery(req: ExtensionConnectRequest): string {
  const q = new URLSearchParams({ site: req.siteUrl, state: req.state, challenge: req.challenge });
  if (req.pageUrl) q.set("page", req.pageUrl);
  if (req.extensionVersion) q.set("v", req.extensionVersion);
  if (req.installId) q.set("install", req.installId);
  return q.toString();
}

/** Why approval failed, as shown back on /connect/chrome. */
export const CONNECT_ERRORS = {
  limit: "Your plan's website limit is reached. Upgrade, or connect one of your existing websites instead.",
  unsafe: "MyKavo can't monitor this address. Only public websites can be monitored.",
  dns: "We couldn't resolve this website's address. Check that it's online and try again.",
  invalid: RESTART,
  failed: "We couldn't connect this website. Nothing was changed. Please try again.",
} as const;
export type ConnectErrorCode = keyof typeof CONNECT_ERRORS;

export function connectErrorMessage(raw: string | null | undefined): string | null {
  return raw && Object.hasOwn(CONNECT_ERRORS, raw) ? CONNECT_ERRORS[raw as ConnectErrorCode] : null;
}

/** Funnel events the extension may report anonymously. No URLs, no hosts. */
export const EXTENSION_EVENTS = [
  "installed",
  "opened",
  "page_checked",
  "monitor_clicked",
  "dashboard_opened",
  "scan_triggered",
] as const;
export type ExtensionEvent = (typeof EXTENSION_EVENTS)[number];

export function isExtensionEvent(raw: unknown): raw is ExtensionEvent {
  return typeof raw === "string" && (EXTENSION_EVENTS as readonly string[]).includes(raw);
}
