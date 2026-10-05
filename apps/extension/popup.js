/**
 * MyKavo popup.
 *
 * States: LOADING -> UNSUPPORTED | READY (unconnected) | AUTH_WAITING |
 * CONNECTED | ERROR. The page check runs locally and instantly (lib/seo.js);
 * MyKavo is only contacted for a site the person connected, or when they
 * press Protect, Scan now or Open MyKavo.
 */

import { extractPageFacts, runChecks, summarize } from "./lib/seo.js";
import {
  MYKAVO,
  VERSION,
  getSettings,
  getSite,
  isPrivateHost,
  patchSite,
  removeSite,
  siteOf,
  timeAgo,
  timeUntil,
} from "./lib/core.js";

const view = document.getElementById("view");
const live = document.getElementById("live");
const menuBtn = document.getElementById("menu-btn");
const menu = document.getElementById("menu");

/* ------------------------------------------------------------ helpers -- */

/** Tiny element builder. Text always goes through textContent. */
function h(tag, props = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v === undefined || v === null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v; // trusted, static SVG only
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else el.setAttribute(k, v === true ? "" : String(v));
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

const ICON = {
  pass: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m3.5 8.5 3 3 6-7"/></svg>',
  warn: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M8 3.5v5.5"/><path d="M8 12.4v.1"/></svg>',
  fail: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m4.5 4.5 7 7m0-7-7 7"/></svg>',
  chev: '<svg class="chev" viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round"><path d="m4 6 4 4 4-4"/></svg>',
  globe: '<svg viewBox="0 0 24 24" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.3 7.5 9.5 4.3-1.2 7.5-4.9 7.5-9.5V6z"/><path d="m8.8 12 2.2 2.2 4.2-4.4"/></svg>',
  arrow: '<svg viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10m-4-4 4 4-4 4"/></svg>',
  external: '<svg viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2.5h4v4M13.5 2.5 7 9M12 9.5V13a.5.5 0 0 1-.5.5h-8.5A.5.5 0 0 1 2.5 13V4.5A.5.5 0 0 1 3 4h3.5"/></svg>',
  refresh: '<svg viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round"><path d="M13.5 8A5.5 5.5 0 1 1 11.8 4"/><path d="M13.5 2.5v3.3h-3.3"/></svg>',
  blocked: '<svg viewBox="0 0 24 24" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/></svg>',
  plug: '<svg viewBox="0 0 24 24" stroke-linecap="round" stroke-linejoin="round"><path d="M9 3v4m6-4v4M7 7h10v4a5 5 0 0 1-10 0zM12 16v5"/></svg>',
  info: '<svg viewBox="0 0 16 16" stroke-linecap="round"><circle cx="8" cy="8" r="6.2"/><path d="M8 7.3v3.6M8 5.1v.1"/></svg>',
  alert: '<svg viewBox="0 0 16 16" stroke-linecap="round" stroke-linejoin="round"><path d="M8 2.2 1.8 13h12.4z"/><path d="M8 6.5v3M8 11.3v.1"/></svg>',
};

const TONE_COLOR = { good: "var(--success)", fair: "var(--warning)", poor: "var(--critical)" };

function say(message) {
  live.textContent = "";
  // A fresh node each time so screen readers announce repeats.
  setTimeout(() => (live.textContent = message), 30);
}

function track(event) {
  chrome.runtime.sendMessage({ type: "track", event }).catch(() => {});
}

function openTab(url) {
  chrome.tabs.create({ url });
  window.close();
}

function utm(url, content) {
  const u = new URL(url);
  u.searchParams.set("utm_source", "chrome_extension");
  if (content) u.searchParams.set("utm_content", content);
  return u.toString();
}

function setView(...nodes) {
  view.replaceChildren(...nodes);
  view.setAttribute("aria-busy", "false");
}

/* -------------------------------------------------------- components -- */

function siteRow(tab, site, url) {
  const icon = h("span", { class: "favicon" });
  const fav = tab?.favIconUrl;
  if (fav && /^(https:|data:image\/)/.test(fav)) {
    const img = h("img", { src: fav, alt: "", width: 16, height: 16 });
    img.addEventListener("error", () => (icon.innerHTML = ICON.globe), { once: true });
    icon.append(img);
  } else {
    icon.innerHTML = ICON.globe;
  }
  let host = site?.host;
  let path = site?.path;
  if (!host) {
    try {
      const u = new URL(url);
      host = u.hostname.replace(/^www\./, "");
      path = u.pathname + u.search;
    } catch {
      host = "This page";
    }
  }
  return h(
    "div",
    { class: "site" },
    icon,
    h("div", { class: "site-text" }, h("span", { class: "site-host", text: host, title: host }), path && path !== "/" ? h("span", { class: "site-path", text: path, title: path }) : null),
  );
}

function ring(summary, size = 84) {
  const r = 36;
  const c = 2 * Math.PI * r;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 84 84");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = `<circle class="track" cx="42" cy="42" r="${r}" fill="none" stroke-width="7"/>`;
  const arc = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  for (const [k, v] of Object.entries({ class: "fill", cx: 42, cy: 42, r, fill: "none", "stroke-width": 7, "stroke-linecap": "round", stroke: TONE_COLOR[summary.tone], "stroke-dasharray": c, "stroke-dashoffset": c })) arc.setAttribute(k, String(v));
  svg.append(arc);
  // Draw in on the next frame (CSS transition), skipped for reduced motion.
  requestAnimationFrame(() => requestAnimationFrame(() => arc.setAttribute("stroke-dashoffset", String(c * (1 - summary.score / 100)))));
  return h(
    "div",
    { class: "ring", style: `width:${size}px;height:${size}px`, role: "img", "aria-label": `SEO health ${summary.score} out of 100` },
    svg,
    h("div", { class: "ring-value", "aria-hidden": "true" }, h("span", { class: "ring-num", text: summary.score }), h("span", { class: "ring-of", text: "/ 100" })),
  );
}

function countChip(status, n, word) {
  return h("span", { class: `count tone-${status}`, html: ICON[status] }, `${n} ${word}`);
}

function scoreCard(summary) {
  return h(
    "section",
    { class: "card score fade-in", "aria-label": "SEO health" },
    ring(summary),
    h(
      "div",
      { class: "score-body" },
      h("p", { class: "eyebrow", text: "SEO health" }),
      h("p", { class: "verdict", text: summary.verdict }),
      h(
        "div",
        { class: "counts" },
        countChip("pass", summary.pass, "passed"),
        summary.warn ? countChip("warn", summary.warn, summary.warn === 1 ? "warning" : "warnings") : null,
        summary.fail ? countChip("fail", summary.fail, summary.fail === 1 ? "issue" : "issues") : null,
      ),
    ),
  );
}

function checkRow(check) {
  return h(
    "li",
    { class: "row" },
    h("span", { class: `badge tone-${check.status}`, html: ICON[check.status] }, h("span", { class: "sr-only", text: { pass: "Passed:", warn: "Warning:", fail: "Issue:" }[check.status] })),
    h(
      "div",
      { class: "row-body" },
      h("p", { class: "row-name", text: check.name }),
      h("p", { class: "row-why", text: check.why }),
      check.value ? h("p", { class: "row-val", text: check.value, title: check.value }) : null,
    ),
  );
}

let groupSeq = 0;
function group(label, checks, open) {
  if (!checks.length) return null;
  const id = `g${++groupSeq}`;
  const list = h("ul", { class: "rows", id }, checks.map(checkRow));
  list.hidden = !open;
  const head = h(
    "button",
    {
      type: "button",
      class: "group-head",
      "aria-expanded": String(open),
      "aria-controls": id,
      onclick: () => {
        const next = list.hidden;
        list.hidden = !next;
        head.setAttribute("aria-expanded", String(next));
      },
      html: ICON.chev,
    },
    label,
    h("span", { class: "n", text: checks.length }),
  );
  return h("div", { class: "group" }, head, list);
}

/** Issues first, then warnings; passed checks folded away. */
function resultsList(checks) {
  const fails = checks.filter((c) => c.status === "fail");
  const warns = checks.filter((c) => c.status === "warn");
  const passes = checks.filter((c) => c.status === "pass");
  return h(
    "div",
    { class: "results-scroll" },
    group("Issues", fails, true),
    group("Warnings", warns, true),
    group("Passed", passes, fails.length + warns.length === 0),
  );
}

function resultsCard(checks) {
  return h(
    "section",
    { class: "card results fade-in", "aria-label": "Check results" },
    resultsList(checks),
    h("p", { class: "scope", text: "Instant check of this page only, run in your browser." }),
  );
}

function protectCard(site, { busy = false } = {}) {
  const button = h(
    "button",
    { type: "button", class: "btn btn-gold", onclick: () => connect(site, button) },
    h("span", { class: "btn-label", text: `Protect ${site.host}` }),
    h("span", { html: ICON.arrow }),
  );
  if (busy) setBusy(button, "Opening MyKavo…");
  return h(
    "section",
    { class: "protect fade-in", "aria-labelledby": "protect-title" },
    h(
      "div",
      { class: "protect-top" },
      h("div", {}, h("h2", { class: "protect-title", id: "protect-title", text: "Protect this website" }), h("p", { class: "protect-sub", text: "Continuous monitoring by MyKavo. Alerts when something important changes." })),
      h("span", { class: "shield", html: ICON.shield }),
    ),
    h("ul", { class: "tags", "aria-label": "MyKavo monitors" }, ["SEO", "Content", "Visual changes", "Broken links", "Performance", "Uptime", "Conversions"].map((t) => h("li", { text: t }))),
    button,
  );
}

function setBusy(button, label) {
  button.disabled = true;
  button.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), h("span", { class: "btn-label", text: label }));
}

function footer(text, link) {
  return h("div", { class: "foot" }, h("span", { text }), link ? h("a", { href: link.href, target: "_blank", rel: "noopener", text: link.label }) : null);
}

function notice(tone, icon, ...content) {
  return h("div", { class: `notice ${tone}`, role: tone === "bad" ? "alert" : null }, h("span", { html: ICON[icon] }), h("div", {}, ...content));
}

/* ------------------------------------------------------------ states -- */

function renderLoading() {
  view.setAttribute("aria-busy", "true");
  view.replaceChildren(
    h("div", { class: "loading-label" }, h("span", { class: "spinner", "aria-hidden": "true" }), "Checking this page…"),
    h(
      "div",
      { class: "skeleton", "aria-hidden": "true" },
      h("div", { class: "sk", style: "height:28px;width:62%" }),
      h("div", { class: "sk", style: "height:112px" }),
      h("div", { class: "sk", style: "height:150px" }),
    ),
  );
}

function renderUnsupported() {
  setView(
    h(
      "section",
      { class: "card message fade-in" },
      h("div", { class: "message-icon", html: ICON.blocked }),
      h("h1", { text: "This page can't be checked" }),
      h("p", { text: "Open a normal website to use MyKavo. Browser pages and the Chrome Web Store don't allow extensions." }),
      h("div", { class: "actions" }, h("button", { type: "button", class: "btn btn-line", onclick: () => openTab("chrome://newtab") }, "Try another page")),
    ),
  );
}

/** READY / unconnected: the instant check and the one primary action. */
function renderReady(ctx, extra = null) {
  const { tab, site, checks, summary, url } = ctx;
  const nodes = [siteRow(tab, site, url)];
  if (extra) nodes.push(extra);
  if (checks) nodes.push(scoreCard(summary), resultsCard(checks));
  if (site && !isPrivateHost(site.host)) nodes.push(protectCard(site));
  else nodes.push(notice("info", "info", "Local and private addresses can't be monitored. Open a public website to protect it with MyKavo."));
  setView(...nodes);
}

/** AUTH_WAITING: they pressed Protect and haven't finished in MyKavo yet. */
function renderWaiting(ctx) {
  const { tab, site, checks, summary, url } = ctx;
  const cont = h("button", { type: "button", class: "btn btn-gold", onclick: () => connect(site, cont) }, h("span", { class: "btn-label", text: "Continue to MyKavo" }), h("span", { html: ICON.external }));
  setView(
    siteRow(tab, site, url),
    h(
      "section",
      { class: "card message fade-in" },
      h("div", { class: "message-icon gold", html: ICON.shield }),
      h("h1", { text: "Your website is ready to connect" }),
      h("p", { text: `Finish signing in to MyKavo in the tab that opened, and ${site.host} connects automatically.` }),
      h("div", { class: "actions" }, cont),
    ),
    checks ? scoreCard(summary) : null,
  );
}

/** ERROR after a failed connection: nothing changed, try again. */
function renderConnectFailed(ctx) {
  const { site } = ctx;
  const retry = h("button", { type: "button", class: "btn btn-gold", onclick: () => connect(site, retry) }, h("span", { html: ICON.refresh }), h("span", { class: "btn-label", text: "Try again" }));
  renderReady(ctx, null);
  const protect = view.querySelector(".protect");
  protect?.replaceWith(
    h(
      "section",
      { class: "card message fade-in", role: "alert" },
      h("div", { class: "message-icon", html: ICON.plug }),
      h("h1", { text: `We couldn't connect ${site.host}` }),
      h("p", { text: "Nothing was changed on your website. Try again, or open MyKavo to connect it from your dashboard." }),
      h("div", { class: "actions" }, retry, h("button", { type: "button", class: "btn btn-line", onclick: () => openTab(utm(`${MYKAVO}/dashboard`, "connect_failed")) }, "Open MyKavo")),
    ),
  );
}

/* ---------------------------------------------------------- connected -- */

function statusOf(s) {
  if (!s.setup.complete) return { key: "setup", label: s.setup.monitoredPages ? "Taking first baseline" : "Setup not finished" };
  if (s.health.status === "down") return { key: "down", label: "Site down" };
  if (s.openChanges.bySeverity.CRITICAL > 0) return { key: "critical", label: "Critical changes" };
  if (s.openChanges.bySeverity.HIGH > 0) return { key: "attention", label: "Needs attention" };
  return { key: "protected", label: "Protected" };
}

function pct(n) {
  if (n === null || n === undefined) return null;
  return n >= 99.95 ? "100%" : `${n.toFixed(1)}%`;
}

let pollTimer = null;

function renderConnected(ctx, record, status, { stale = false, flash = null } = {}) {
  const { site, checks, summary } = ctx;
  if (!status) {
    // First open after connecting, before the first status arrives.
    setView(siteRow(ctx.tab, site, ctx.url), h("section", { class: "card status" }, h("div", { class: "loading-label" }, h("span", { class: "spinner", "aria-hidden": "true" }), "Loading monitoring status…")));
    return;
  }
  const st = statusOf(status);
  const sev = status.openChanges.bySeverity;
  const lastScan = timeAgo(status.website.lastScanAt);
  const nextScan = timeUntil(status.website.nextScanAt);
  const meta = status.scanInProgress
    ? `Scanning now · ${status.scanInProgress.pagesScanned} of ${status.scanInProgress.pagesRequested} pages`
    : lastScan
      ? `Last checked ${lastScan}${nextScan && status.setup.complete ? ` · next ${nextScan}` : ""}`
      : "Not scanned yet";

  const openBtn = h(
    "button",
    { type: "button", class: status.setup.complete ? "btn btn-gold" : "btn btn-line", onclick: () => { track("dashboard_opened"); openTab(utm(status.links.website, "status")); } },
    h("span", { class: "btn-label", text: "Open MyKavo" }),
    h("span", { html: ICON.external }),
  );

  let actions;
  if (!status.setup.complete && status.setup.monitoredPages === 0) {
    actions = h(
      "div",
      { class: "actions" },
      h("button", { type: "button", class: "btn btn-gold", onclick: () => { track("dashboard_opened"); openTab(utm(status.links.setup, "finish_setup")); } }, h("span", { class: "btn-label", text: "Finish setup" }), h("span", { html: ICON.arrow })),
      openBtn,
    );
  } else {
    const scanBtn = h("button", { type: "button", class: "btn btn-line" }, h("span", { html: ICON.refresh }), h("span", { class: "btn-label", text: "Scan now" }));
    if (status.scanInProgress) {
      // While a scan runs the button follows it in MyKavo instead.
      scanBtn.replaceChildren(h("span", { class: "spinner", "aria-hidden": "true" }), h("span", { class: "btn-label", text: "View scan" }));
      scanBtn.addEventListener("click", () => status.links.scan && openTab(utm(status.links.scan, "scan_progress")));
    } else if (!status.capabilities.canRunManualScan) {
      scanBtn.setAttribute("aria-disabled", "true");
      scanBtn.title = status.capabilities.manualScanBlockedReason ?? "";
      scanBtn.addEventListener("click", () => say(status.capabilities.manualScanBlockedReason ?? "A scan can't run right now."));
    } else {
      scanBtn.addEventListener("click", () => scanNow(ctx, record, scanBtn));
    }
    actions = h("div", { class: "actions" }, h("div", { class: "btn-row" }, openBtn, scanBtn));
  }

  const notes = [];
  if (flash) notes.push(flash);
  if (stale) notes.push(notice("warn", "alert", "Showing the last known status - MyKavo couldn't be reached just now."));
  if (status.scanInProgress === null && !status.capabilities.canRunManualScan && status.setup.complete && status.capabilities.manualScanBlockedReason && /plan|Pro|upgrade/i.test(status.capabilities.manualScanBlockedReason)) {
    notes.push(notice("info", "info", "Scans run automatically on your schedule. ", h("button", { type: "button", class: "link-btn", onclick: () => openTab(utm(status.links.billing, "manual_scan")) }, "Upgrade for on-demand scans")));
  }

  const changeTile =
    sev.CRITICAL > 0
      ? tile("Critical", sev.CRITICAL, `${status.openChanges.total} open in total`, "bad")
      : sev.HIGH > 0
        ? tile("High", sev.HIGH, `${status.openChanges.total} open in total`, "warn")
        : tile("Critical", 0, status.openChanges.total ? `${status.openChanges.total} minor open` : "nothing open");
  const uptime = pct(status.health.uptime7d);

  const card = h(
    "section",
    { class: "card status fade-in", "aria-labelledby": "status-host" },
    h("span", { class: `pill ${st.key}` }, h("span", { class: "dot", "aria-hidden": "true" }), st.label),
    h("h1", { class: "status-host", id: "status-host", text: site.host, title: status.website.name }),
    h("p", { class: "status-meta", text: meta }),
    h(
      "div",
      { class: "tiles" },
      changeTile,
      tile("Availability", uptime ?? "-", uptime ? "last 7 days" : "first check soon", status.health.status === "down" ? "bad" : null),
      tile("SEO", summary ? summary.score : "-", "this page", summary && summary.tone === "poor" ? "warn" : null),
    ),
    actions,
  );

  const nodes = [card, ...notes];
  if (checks) nodes.push(pageCheckDisclosure(checks, summary));
  nodes.push(footer(`Connected to ${record.workspace ?? "MyKavo"}`, { href: utm(`${MYKAVO}/dashboard`, "footer"), label: "Dashboard" }));
  setView(...nodes);

  // Keep a running scan's progress live while the popup is open.
  clearTimeout(pollTimer);
  if (status.scanInProgress) pollTimer = setTimeout(() => refreshStatus(ctx, record), 5000);
}

/**
 * The toolbar badge only ever says one thing: this site needs you now
 * (it's down, or has critical changes). No counts, no noise.
 */
function setBadge(tabId, status) {
  const urgent = status.health.status === "down" || status.openChanges.bySeverity.CRITICAL > 0;
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#E5484D" }).catch(() => {});
  chrome.action.setBadgeText({ tabId, text: urgent ? "!" : "" }).catch(() => {});
}

function tile(label, value, sub, tone) {
  return h("div", { class: "tile" }, h("p", { class: "eyebrow", text: label }), h("p", { class: `tile-num${tone ? ` ${tone}` : ""}`, text: value }), h("p", { class: "tile-sub", text: sub, title: sub }));
}

function pageCheckDisclosure(checks, summary) {
  const body = h("div", { class: "disclose-body", id: "page-check" }, resultsList(checks));
  body.hidden = true;
  const head = h(
    "button",
    {
      type: "button",
      class: "disclose-head",
      "aria-expanded": "false",
      "aria-controls": "page-check",
      onclick: () => {
        body.hidden = !body.hidden;
        head.setAttribute("aria-expanded", String(!body.hidden));
      },
    },
    h("span", { class: "mini-score", style: `color:${TONE_COLOR[summary.tone]}`, text: summary.score, "aria-hidden": "true" }),
    h("span", {}, h("span", { class: "t", text: "This page's SEO check" }), h("br"), h("span", { class: "s", text: `${summary.pass} passed · ${summary.warn} warnings · ${summary.fail} issues` })),
    h("span", { html: ICON.chev }),
  );
  return h("section", { class: "card disclose fade-in" }, head, body);
}

/* ------------------------------------------------------------ network -- */

async function api(record, path, init = {}) {
  const res = await fetch(`${MYKAVO}${path}`, {
    ...init,
    headers: { ...(init.headers ?? {}), authorization: `Bearer ${record.token}` },
    credentials: "omit",
    cache: "no-store",
  });
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* empty body */
  }
  return { status: res.status, ok: res.ok, body };
}

async function refreshStatus(ctx, record, opts = {}) {
  try {
    const res = await api(record, "/api/wp/v1/status");
    if (res.status === 401) return disconnected(ctx);
    if (!res.ok || !res.body) throw new Error(String(res.status));
    await patchSite(ctx.site.host, { status: res.body, statusAt: Date.now() });
    setBadge(ctx.tab.id, res.body);
    renderConnected(ctx, record, res.body, opts);
  } catch {
    renderConnected(ctx, record, record.status ?? null, { ...opts, stale: Boolean(record.status) });
    if (!record.status) {
      setView(
        siteRow(ctx.tab, ctx.site, ctx.url),
        h(
          "section",
          { class: "card message", role: "alert" },
          h("div", { class: "message-icon", html: ICON.plug }),
          h("h1", { text: "MyKavo can't be reached" }),
          h("p", { text: "Check your connection and try again. Monitoring keeps running in the cloud either way." }),
          h("div", { class: "actions" }, h("button", { type: "button", class: "btn btn-line", onclick: () => refreshStatus(ctx, record) }, "Try again")),
        ),
      );
    }
  }
}

async function disconnected(ctx) {
  await removeSite(ctx.site.host);
  renderReady(ctx, notice("warn", "info", `${ctx.site.host} was disconnected from MyKavo. Protect it again to see its status here.`));
}

async function scanNow(ctx, record, button) {
  setBusy(button, "Starting…");
  say("Starting a scan");
  try {
    const res = await api(record, "/api/wp/v1/scans", { method: "POST" });
    if (res.status === 401) return disconnected(ctx);
    if (res.status === 201 || res.status === 409) {
      track("scan_triggered");
      say("Scan started");
      return refreshStatus(ctx, record, { flash: notice("ok", "pass", res.status === 409 ? "A scan is already running." : "Scan started. Results appear in MyKavo as pages finish.") });
    }
    const message =
      res.status === 429
        ? "Too many scans just now. Try again in a minute."
        : res.status === 403
          ? res.body?.error ?? "Your plan doesn't include on-demand scans."
          : res.body?.error ?? "Scan couldn't be started.";
    say(message);
    refreshStatus(ctx, record, { flash: notice("bad", "alert", message) });
  } catch {
    say("Scan couldn't be started");
    refreshStatus(ctx, record, { flash: notice("bad", "alert", "Scan couldn't be started. ", h("button", { type: "button", class: "link-btn", onclick: () => refreshStatus(ctx, record) }, "Try again")) });
  }
}

/* ------------------------------------------------------------ connect -- */

async function connect(site, button) {
  if (button) setBusy(button, "Opening MyKavo…");
  say("Opening MyKavo to connect this website");
  await chrome.storage.local.remove("lastError");
  try {
    const res = await chrome.runtime.sendMessage({ type: "connect", url: site.page });
    if (!res?.ok) throw new Error("connect");
    // The new tab takes focus and Chrome closes the popup by itself.
  } catch {
    if (button) {
      button.disabled = false;
      button.replaceChildren(h("span", { class: "btn-label", text: "Try again" }));
    }
    say("MyKavo couldn't be opened. Try again.");
  }
}

/* --------------------------------------------------------------- menu -- */

async function buildMenu(ctx) {
  const { telemetry } = await getSettings();
  const record = ctx?.site ? await getSite(ctx.site.host) : null;
  const item = (label, onclick, cls = "") => h("button", { type: "button", role: "menuitem", class: `menu-item ${cls}`, onclick }, label);
  const toggle = h(
    "button",
    {
      type: "button",
      role: "menuitemcheckbox",
      class: "menu-item",
      "aria-checked": String(telemetry),
      onclick: async () => {
        const next = toggle.getAttribute("aria-checked") !== "true";
        await chrome.storage.local.set({ telemetry: next });
        toggle.setAttribute("aria-checked", String(next));
      },
    },
    h("span", { text: "Share anonymous usage counts" }),
    h("span", { class: "switch", "aria-hidden": "true" }),
  );
  menu.replaceChildren(
    item("Open MyKavo dashboard", () => openTab(utm(`${MYKAVO}/dashboard`, "menu"))),
    record
      ? item(`Disconnect ${ctx.site.host}`, async () => {
          closeMenu();
          await fetch(`${MYKAVO}/api/wp/v1/disconnect`, { method: "POST", headers: { authorization: `Bearer ${record.token}` }, credentials: "omit" }).catch(() => {});
          await removeSite(ctx.site.host);
          say(`${ctx.site.host} disconnected from this browser`);
          renderReady(ctx, notice("info", "info", `Disconnected in this browser. ${ctx.site.host} is still monitored in MyKavo.`));
        }, "danger")
      : null,
    h("div", { class: "menu-sep", role: "separator" }),
    toggle,
    item("Privacy", () => openTab(utm(`${MYKAVO}/privacy`, "menu"))),
    h("p", { class: "menu-note", text: `Version ${VERSION} · Page checks run locally` }),
  );
}

function closeMenu() {
  menu.hidden = true;
  menuBtn.setAttribute("aria-expanded", "false");
}

let menuCtx = null;
menuBtn.addEventListener("click", async () => {
  if (!menu.hidden) return closeMenu();
  await buildMenu(menuCtx);
  menu.hidden = false;
  menuBtn.setAttribute("aria-expanded", "true");
  menu.querySelector("[role^=menuitem]")?.focus();
});
document.addEventListener("keydown", (e) => {
  if (menu.hidden) return;
  const items = [...menu.querySelectorAll("[role^=menuitem]")];
  const i = items.indexOf(document.activeElement);
  if (e.key === "Escape") {
    closeMenu();
    menuBtn.focus();
  } else if (e.key === "ArrowDown") {
    e.preventDefault();
    items[(i + 1) % items.length]?.focus();
  } else if (e.key === "ArrowUp") {
    e.preventDefault();
    items[(i - 1 + items.length) % items.length]?.focus();
  }
});
document.addEventListener("click", (e) => {
  if (!menu.hidden && !menu.contains(e.target) && !menuBtn.contains(e.target)) closeMenu();
});

/* --------------------------------------------------------------- main -- */

async function main() {
  renderLoading();
  track("opened");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab?.url ?? "";
  if (!tab?.id || !/^https?:/i.test(url)) return renderUnsupported();
  const site = siteOf(url);
  if (!site && /chrome(webstore)?\.google\.com/.test(url)) return renderUnsupported();

  const ctx = { tab, url, site, checks: null, summary: null };
  menuCtx = ctx;

  // The local check and the stored state in parallel; neither needs the network.
  const [facts, record, lastError, pending] = await Promise.all([
    chrome.scripting
      .executeScript({ target: { tabId: tab.id }, func: extractPageFacts })
      .then(([r]) => r?.result ?? null)
      .catch(() => null),
    site ? getSite(site.host) : null,
    chrome.storage.local.get("lastError").then((v) => v.lastError ?? null),
    site ? chrome.runtime.sendMessage({ type: "pending", host: site.host }).then((r) => Boolean(r?.pending)).catch(() => false) : false,
  ]);

  if (facts) {
    ctx.checks = runChecks(facts);
    ctx.summary = summarize(ctx.checks);
    track("page_checked");
  }
  const unreadable = notice("warn", "alert", "This page couldn't be read - some pages block extensions. Reload it and try again.");

  if (record) {
    // Cached status first (instant), then the live one.
    renderConnected(ctx, record, record.status ?? null, { stale: false });
    return refreshStatus(ctx, record);
  }
  if (!facts && !site) return renderUnsupported();
  if (site && lastError?.host === site.host && Date.now() - lastError.at < 30 * 60_000) return renderConnectFailed(ctx);
  if (site && pending) return renderWaiting(ctx);
  renderReady(ctx, facts ? null : unreadable);
}

main().catch(() => {
  setView(
    h(
      "section",
      { class: "card message", role: "alert" },
      h("div", { class: "message-icon", html: ICON.alert }),
      h("h1", { text: "Something went wrong" }),
      h("p", { text: "Close this popup and open it again. If it keeps happening, reload the page." }),
    ),
  );
});
