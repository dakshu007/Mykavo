/**
 * MyKavo background worker.
 *
 * Owns everything that must outlive the popup (which closes the moment a tab
 * opens): the connect handshake, the code-for-token exchange, the
 * right-click action and the anonymous usage counts.
 *
 * Connect handshake (authorization code + PKCE, the same one the MyKavo
 * WordPress plugin uses):
 *   1. startConnect opens mykavo.app/connect/chrome in a normal tab with the
 *      site, a random state and an S256 challenge. The verifier stays here,
 *      in session storage.
 *   2. The person signs in or signs up there and approves.
 *   3. mykavo.app/connect/chrome/done shows a one-time code; the content
 *      script (content/handoff.js) passes it here; this worker trades code +
 *      verifier for a token scoped to that ONE website.
 */

import {
  MYKAVO,
  VERSION,
  getSettings,
  getSite,
  pkceChallenge,
  putSite,
  randomToken,
  siteOf,
} from "./lib/core.js";

/** A connect link is good for as long as the server's one-time code. */
const PENDING_TTL_MS = 15 * 60 * 1000;

/* ---------------------------------------------------------- install -- */

chrome.runtime.onInstalled.addListener(async (details) => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "mykavo-monitor-page",
      title: "Monitor this page with MyKavo",
      contexts: ["page"],
      documentUrlPatterns: ["http://*/*", "https://*/*"],
    });
  });
  const { installId } = await chrome.storage.local.get("installId");
  if (!installId) await chrome.storage.local.set({ installId: randomToken(18) });
  if (details.reason === "install") void track("installed");
});

/* --------------------------------------------------------- tracking -- */

/**
 * Anonymous funnel counts: an install id, an event name and the version.
 * Never a URL or a hostname. Off when the person switches it off.
 */
async function track(event) {
  const { telemetry, installId } = await getSettings();
  if (!telemetry || !installId) return;
  try {
    await fetch(`${MYKAVO}/api/extension/events`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ install: installId, event, v: VERSION }),
      credentials: "omit",
    });
  } catch {
    // Counting is never worth an error.
  }
}

/* ---------------------------------------------------------- connect -- */

async function getPending() {
  const { pending = {} } = await chrome.storage.session.get("pending");
  const now = Date.now();
  for (const [state, p] of Object.entries(pending)) {
    if (now - p.createdAt > PENDING_TTL_MS) delete pending[state];
  }
  return pending;
}

/** Open MyKavo's connect page for the site a page belongs to. */
async function startConnect(pageUrl) {
  const site = siteOf(pageUrl);
  if (!site) return { ok: false, error: "This page can't be monitored." };
  const state = randomToken(24);
  const verifier = randomToken(48);
  const challenge = await pkceChallenge(verifier);

  const pending = await getPending();
  pending[state] = { verifier, origin: site.origin, host: site.host, createdAt: Date.now() };
  await chrome.storage.session.set({ pending });

  const { telemetry, installId } = await getSettings();
  const q = new URLSearchParams({ site: site.origin, page: site.page, state, challenge, v: VERSION });
  if (telemetry && installId) q.set("install", installId);
  await chrome.tabs.create({ url: `${MYKAVO}/connect/chrome?${q.toString()}` });
  return { ok: true };
}

/** The current connect attempt for a host, if one is open. */
async function pendingFor(host) {
  const pending = await getPending();
  return Object.values(pending).find((p) => p.host === host) ?? null;
}

/**
 * Finish connecting: trade the code from /connect/chrome/done for a token.
 * Only for a state this worker issued, so a code planted on any page can't
 * connect anything.
 */
async function finishConnect(code, state) {
  const pending = await getPending();
  const p = pending[state];
  if (!p) {
    // A reload of the done page after it already worked is still a success.
    const { completed = {} } = await chrome.storage.session.get("completed");
    return completed[state] ? { ok: true, host: completed[state] } : { ok: false, error: "expired" };
  }
  delete pending[state];
  await chrome.storage.session.set({ pending });

  let body;
  try {
    const res = await fetch(`${MYKAVO}/api/wp/v1/connect/exchange`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code, verifier: p.verifier, site: p.origin }),
      credentials: "omit",
    });
    body = await res.json();
    if (!res.ok || typeof body?.token !== "string") {
      await chrome.storage.local.set({ lastError: { host: p.host, at: Date.now() } });
      return { ok: false, error: "refused" };
    }
  } catch {
    await chrome.storage.local.set({ lastError: { host: p.host, at: Date.now() } });
    return { ok: false, error: "network" };
  }

  // Reconnecting the same site from this browser: retire the old token so
  // only one live credential per browser per site exists.
  const previous = await getSite(p.host);
  if (previous?.token && previous.token !== body.token) {
    fetch(`${MYKAVO}/api/wp/v1/disconnect`, {
      method: "POST",
      headers: { authorization: `Bearer ${previous.token}` },
      credentials: "omit",
    }).catch(() => {});
  }

  await putSite(p.host, {
    token: body.token,
    websiteId: body.website.id,
    name: body.website.name,
    url: body.website.url,
    dashboardUrl: body.dashboardUrl,
    workspace: body.workspace?.name ?? null,
    connectedAt: Date.now(),
  });
  await chrome.storage.local.remove("lastError");
  const { completed = {} } = await chrome.storage.session.get("completed");
  await chrome.storage.session.set({ completed: { ...completed, [state]: p.host } });
  return { ok: true, host: p.host };
}

/* --------------------------------------------------------- messages -- */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || !message || typeof message.type !== "string") return false;

  // From the content script on mykavo.app/connect/chrome/done only.
  if (message.type === "handoff") {
    const from = sender.url ?? "";
    if (!from.startsWith(`${MYKAVO}/connect/chrome/done`)) return false;
    if (typeof message.code !== "string" || typeof message.state !== "string") return false;
    finishConnect(message.code, message.state).then(sendResponse);
    return true;
  }

  // Everything else only from the extension's own pages (the popup).
  if (!(sender.url ?? "").startsWith(chrome.runtime.getURL(""))) return false;
  if (message.type === "connect") {
    void track("monitor_clicked");
    startConnect(message.url).then(sendResponse);
    return true;
  }
  if (message.type === "pending") {
    pendingFor(message.host).then((p) => sendResponse({ pending: Boolean(p) }));
    return true;
  }
  if (message.type === "track" && typeof message.event === "string") {
    void track(message.event);
    return false;
  }
  return false;
});

/* ------------------------------------------------------ right-click -- */

chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId !== "mykavo-monitor-page" || !info.pageUrl) return;
  const site = siteOf(info.pageUrl);
  if (!site) return;
  // Already protected: go straight to it in MyKavo instead of reconnecting.
  const known = await getSite(site.host);
  if (known?.dashboardUrl) {
    void track("dashboard_opened");
    await chrome.tabs.create({ url: known.dashboardUrl });
    return;
  }
  void track("monitor_clicked");
  await startConnect(info.pageUrl);
});
