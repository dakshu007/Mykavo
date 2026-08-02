/**
 * MyKavo SEO Checker - popup logic. On open: inject the extractor into the
 * active tab (activeTab permission, click-gated), run ~20 on-page checks
 * locally, render pass/warn/fail rows with fix hints. No data leaves the
 * browser - the only network activity is the user clicking through to
 * mykavo.app.
 */

/** Runs INSIDE the page (serialized by chrome.scripting) - returns plain facts. */
function extractPageFacts() {
  const attr = (el, name) => (el && el.getAttribute(name) ? el.getAttribute(name).trim() : "");
  const titles = [...document.querySelectorAll("title")].map((t) => t.textContent.trim());
  const descriptions = [...document.querySelectorAll('meta[name="description" i]')].map((m) => attr(m, "content"));
  const canonicals = [...document.querySelectorAll('link[rel="canonical" i]')].map((l) => attr(l, "href")).filter(Boolean);
  const robots = [...document.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i]')]
    .map((m) => attr(m, "content").toLowerCase()).join(",");
  const images = [...document.querySelectorAll("img")];
  const anchors = [...document.querySelectorAll("a[href]")];
  const host = location.host;
  let internal = 0, nofollowInternal = 0;
  for (const a of anchors) {
    try {
      const u = new URL(a.getAttribute("href"), location.href);
      if (u.host === host) {
        internal++;
        if (/\bnofollow\b/i.test(attr(a, "rel"))) nofollowInternal++;
      }
    } catch { /* unparseable href */ }
  }
  let jsonLd = 0, jsonLdInvalid = 0;
  for (const s of document.querySelectorAll('script[type="application/ld+json" i]')) {
    jsonLd++;
    try { JSON.parse(s.textContent); } catch { jsonLdInvalid++; }
  }
  let mixed = 0;
  if (location.protocol === "https:") {
    for (const el of document.querySelectorAll("img[src], script[src], iframe[src]")) {
      if (/^http:\/\//i.test(attr(el, "src"))) mixed++;
    }
  }
  const text = (document.body ? document.body.innerText : "").replace(/\s+/g, " ").trim();
  return {
    url: location.href,
    https: location.protocol === "https:",
    title: titles[0] || "",
    titleCount: titles.length,
    description: descriptions[0] || "",
    descriptionCount: descriptions.length,
    canonicals,
    noindex: /noindex/.test(robots),
    metaRefresh: Boolean(document.querySelector('meta[http-equiv="refresh" i]')),
    h1Count: document.querySelectorAll("h1").length,
    viewport: Boolean(document.querySelector('meta[name="viewport" i]')),
    lang: document.documentElement.getAttribute("lang") || "",
    favicon: Boolean(document.querySelector('link[rel~="icon" i], link[rel="shortcut icon" i]')),
    ogComplete: ["og:title", "og:description", "og:image"].every((p) =>
      document.querySelector(`meta[property="${p}" i][content]`)),
    twitterCard: Boolean(document.querySelector('meta[name="twitter:card" i][content]')),
    jsonLd, jsonLdInvalid,
    imagesTotal: images.length,
    imagesMissingAlt: images.filter((i) => !i.hasAttribute("alt")).length,
    mixed,
    internal, nofollowInternal,
    wordCount: text ? text.split(" ").length : 0,
  };
}

/** Each check: [name, status(pass|warn|fail), why, value?] */
function runChecks(f) {
  const checks = [];
  const add = (name, status, why, value) => checks.push({ name, status, why, value });
  const canonical = f.canonicals[0] || "";
  const selfCanonical = canonical &&
    canonical.replace(/\/$/, "") === f.url.split("#")[0].replace(/\/$/, "");

  add("HTTPS", f.https ? "pass" : "fail",
    f.https ? "Page is served securely." : "Serve the page over HTTPS and redirect http:// URLs.");
  if (f.https) add("Mixed content", f.mixed === 0 ? "pass" : "warn",
    f.mixed === 0 ? "No insecure resources." : `Switch ${f.mixed} http:// resource${f.mixed === 1 ? "" : "s"} to https://.`);
  add("Indexable", !f.noindex ? "pass" : "warn",
    !f.noindex ? "No noindex directive." : "This page is excluded from search results (noindex). Remove it if the page should rank.");
  add("Meta refresh", !f.metaRefresh ? "pass" : "warn",
    !f.metaRefresh ? "No meta refresh redirect." : "Replace the meta refresh with a server-side 301 redirect.");

  if (!f.title) add("Title tag", "fail", "Add a unique 30-60 character <title>.");
  else if (f.titleCount > 1) add("Title tag", "warn", `${f.titleCount} title tags found - keep exactly one.`, f.title);
  else if (f.title.length > 60) add("Title tag", "warn", `${f.title.length} chars - trim under ~60 so it isn't truncated.`, f.title);
  else if (f.title.length < 15) add("Title tag", "warn", `${f.title.length} chars - expand into a descriptive phrase.`, f.title);
  else add("Title tag", "pass", `${f.title.length} chars - healthy length.`, f.title);

  if (!f.description) add("Meta description", "warn", "Add a 70-155 character description to earn the click.");
  else if (f.description.length > 165) add("Meta description", "warn", `${f.description.length} chars - trim under ~155.`);
  else if (f.description.length < 50) add("Meta description", "warn", `${f.description.length} chars - expand toward 70-155.`);
  else add("Meta description", "pass", `${f.description.length} chars - healthy length.`);

  if (f.canonicals.length === 0) add("Canonical", "warn", "Add <link rel=\"canonical\"> pointing at the preferred URL.");
  else if (f.canonicals.length > 1) add("Canonical", "fail", `${f.canonicals.length} canonicals - search engines will ignore them all.`);
  else if (!/^https?:\/\//i.test(canonical)) add("Canonical", "warn", "Use an absolute canonical URL.", canonical);
  else if (!selfCanonical) add("Canonical", "warn", "Points at a different URL - confirm that's intended.", canonical);
  else add("Canonical", "pass", "Self-referencing canonical present.");

  if (f.h1Count === 0) add("H1 heading", "warn", "Add exactly one <h1> naming the page topic.");
  else if (f.h1Count > 1) add("H1 heading", "warn", `${f.h1Count} H1s - keep one, demote the rest.`);
  else add("H1 heading", "pass", "Exactly one H1.");

  add("Mobile viewport", f.viewport ? "pass" : "fail",
    f.viewport ? "Viewport meta present." : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  add("Language attribute", f.lang ? "pass" : "warn",
    f.lang ? `html lang="${f.lang}".` : "Add lang=\"en\" (or your language) to <html>.");
  add("Favicon", f.favicon ? "pass" : "warn",
    f.favicon ? "Favicon declared." : "Add a favicon link plus an apple-touch-icon.");
  add("Open Graph", f.ogComplete ? "pass" : "warn",
    f.ogComplete ? "og:title, description, and image present." : "Add og:title, og:description, and a 1200×630 og:image.");
  add("Twitter Card", f.twitterCard ? "pass" : "warn",
    f.twitterCard ? "twitter:card present." : "Add twitter:card (summary_large_image) tags.");

  if (f.jsonLdInvalid > 0) add("Structured data", "fail", `${f.jsonLdInvalid} JSON-LD block${f.jsonLdInvalid === 1 ? "" : "s"} fail to parse - validate and fix.`);
  else if (f.jsonLd === 0) add("Structured data", "warn", "No JSON-LD - the page is ineligible for rich results.");
  else add("Structured data", "pass", `${f.jsonLd} valid JSON-LD block${f.jsonLd === 1 ? "" : "s"}.`);

  if (f.imagesTotal > 0)
    add("Image alt text", f.imagesMissingAlt === 0 ? "pass" : "warn",
      f.imagesMissingAlt === 0
        ? `All ${f.imagesTotal} images have alt attributes.`
        : `${f.imagesMissingAlt} of ${f.imagesTotal} images missing alt text.`);

  add("Content depth", f.wordCount >= 100 ? "pass" : "warn",
    f.wordCount >= 100 ? `~${f.wordCount} words of visible text.` : `Only ~${f.wordCount} words - thin pages rarely rank.`);
  if (f.nofollowInternal > 0)
    add("Internal nofollow", "warn", `${f.nofollowInternal} internal link${f.nofollowInternal === 1 ? "" : "s"} marked nofollow - remove it within your own site.`);
  else if (f.internal > 0) add("Internal links", "pass", `${f.internal} internal links, none nofollowed.`);

  return checks;
}

function render(facts) {
  const checks = runChecks(facts);
  const fails = checks.filter((c) => c.status === "fail").length;
  const warns = checks.filter((c) => c.status === "warn").length;
  const passes = checks.length - fails - warns;
  const score = Math.max(0, Math.round(((passes + warns * 0.5) / checks.length) * 100));

  document.getElementById("url").textContent = facts.url;
  const band = document.getElementById("score-band");
  band.hidden = false;
  const color = score >= 90 ? "#1f9d55" : score >= 70 ? "#f59e0b" : "#e5484d";
  const ring = document.getElementById("ring-fill");
  ring.setAttribute("stroke", color);
  ring.setAttribute("stroke-dasharray", `${(score / 100) * 189} 189`);
  const scoreEl = document.getElementById("score");
  scoreEl.textContent = String(score);
  scoreEl.style.color = color;
  document.getElementById("verdict").textContent =
    score >= 90 ? "Looking excellent" : score >= 70 ? "Room to improve" : "Needs attention";
  document.getElementById("counts").textContent =
    `${passes} passed · ${warns} warnings · ${fails} failed`;

  const list = document.getElementById("checks");
  const order = { fail: 0, warn: 1, pass: 2 };
  for (const check of checks.sort((a, b) => order[a.status] - order[b.status])) {
    const li = document.createElement("li");
    li.className = "check";
    const dot = document.createElement("span");
    dot.className = `dot ${check.status}`;
    const body = document.createElement("div");
    body.className = "body";
    const name = document.createElement("p");
    name.className = "name";
    name.textContent = check.name;
    const why = document.createElement("p");
    why.className = "why";
    why.textContent = check.why;
    body.append(name, why);
    if (check.value) {
      const val = document.createElement("p");
      val.className = "val";
      val.textContent = check.value;
      body.append(val);
    }
    li.append(dot, body);
    list.append(li);
  }
}

function showError(message) {
  const el = document.getElementById("error");
  el.hidden = false;
  el.textContent = message;
  document.getElementById("url").textContent = "";
}

async function main() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab || !tab.id || !/^https?:/i.test(tab.url ?? "")) {
      showError("Open a regular web page (http/https) and click the icon again - browser pages can't be checked.");
      return;
    }
    const [result] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: extractPageFacts,
    });
    if (!result || !result.result) throw new Error("no result");
    render(result.result);
  } catch {
    showError("Couldn't read this page - some sites (e.g. the Chrome Web Store) block extensions. Try another page.");
  }
}

main();
