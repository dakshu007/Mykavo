/**
 * Shared by the popup and the background worker: where MyKavo lives, how a
 * page's site is identified, and the little bit of state the extension
 * keeps. Stored state is deliberately minimal - per connected site, the
 * site-scoped token and the last status shown; never page content, never
 * browsing history, never a password.
 */

export const MYKAVO = "https://mykavo.app";
export const VERSION = chrome.runtime.getManifest().version;

/* ------------------------------------------------------------- sites -- */

/**
 * The site a page belongs to: its origin, and the hostname without "www."
 * that MyKavo matches websites by. Null for anything that isn't a public
 * http(s) page (browser pages, files, localhost, the Web Store).
 */
export function siteOf(rawUrl) {
  let url;
  try {
    url = new URL(rawUrl);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  const hostname = url.hostname.toLowerCase();
  if (!hostname.includes(".") || hostname.endsWith(".localhost")) return null;
  if (/^(chrome\.google\.com|chromewebstore\.google\.com)$/.test(hostname)) return null;
  url.hash = "";
  return {
    origin: url.origin,
    host: hostname.replace(/^www\./, ""),
    page: url.toString(),
    path: `${url.pathname}${url.search}`,
  };
}

/** A private, loopback or link-local address: checkable, never monitorable. */
export function isPrivateHost(host) {
  return (
    /^(10|127)\.\d+\.\d+\.\d+$/.test(host) ||
    /^192\.168\.\d+\.\d+$/.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(host) ||
    /^169\.254\.\d+\.\d+$/.test(host) ||
    host.startsWith("[")
  );
}

/* ----------------------------------------------------------- storage -- */

/** @typedef {{ token: string, websiteId: string, name: string, url: string, dashboardUrl: string, connectedAt: number, status?: object, statusAt?: number }} SiteRecord */

export async function getSites() {
  const { sites } = await chrome.storage.local.get("sites");
  return sites && typeof sites === "object" ? sites : {};
}

/** @returns {Promise<SiteRecord | null>} */
export async function getSite(host) {
  const sites = await getSites();
  return sites[host] ?? null;
}

export async function putSite(host, record) {
  const sites = await getSites();
  sites[host] = record;
  await chrome.storage.local.set({ sites });
}

export async function patchSite(host, patch) {
  const sites = await getSites();
  if (!sites[host]) return;
  sites[host] = { ...sites[host], ...patch };
  await chrome.storage.local.set({ sites });
}

export async function removeSite(host) {
  const sites = await getSites();
  delete sites[host];
  await chrome.storage.local.set({ sites });
}

export async function getSettings() {
  const { telemetry = true, installId = null } = await chrome.storage.local.get(["telemetry", "installId"]);
  return { telemetry: telemetry !== false, installId };
}

/* -------------------------------------------------------------- PKCE -- */

export function randomToken(bytes = 32) {
  const buf = crypto.getRandomValues(new Uint8Array(bytes));
  return base64Url(buf);
}

export function base64Url(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** RFC 7636 S256: BASE64URL(SHA256(verifier)). */
export async function pkceChallenge(verifier) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

/* -------------------------------------------------------------- time -- */

export function timeAgo(iso, now = Date.now()) {
  if (!iso) return null;
  const s = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? "" : "s"} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? "" : "s"} ago`;
  const d = Math.round(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function timeUntil(iso, now = Date.now()) {
  if (!iso) return null;
  const s = Math.round((new Date(iso).getTime() - now) / 1000);
  if (s <= 60) return "any minute";
  const m = Math.round(s / 60);
  if (m < 60) return `in ${m} minute${m === 1 ? "" : "s"}`;
  const h = Math.round(m / 60);
  if (h < 24) return `in ${h} hour${h === 1 ? "" : "s"}`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}
