/**
 * The instant on-page SEO check. extractPageFacts runs INSIDE the page
 * (chrome.scripting serializes it, so it must stay self-contained) and
 * returns plain facts; runChecks turns them into results. Nothing here
 * leaves the browser.
 */

/** Runs in the page. Reads the DOM only; changes nothing. */
export function extractPageFacts() {
  const attr = (el, name) => (el && el.getAttribute(name) ? el.getAttribute(name).trim() : "");
  const titles = [...document.querySelectorAll("title")].map((t) => t.textContent.trim());
  const descriptions = [...document.querySelectorAll('meta[name="description" i]')].map((m) => attr(m, "content"));
  const canonicals = [...document.querySelectorAll('link[rel="canonical" i]')].map((l) => attr(l, "href")).filter(Boolean);
  const robots = [...document.querySelectorAll('meta[name="robots" i], meta[name="googlebot" i]')]
    .map((m) => attr(m, "content").toLowerCase())
    .join(",");
  const images = [...document.querySelectorAll("img")];
  const anchors = [...document.querySelectorAll("a[href]")];
  const host = location.host;
  let internal = 0;
  let nofollowInternal = 0;
  for (const a of anchors) {
    try {
      const u = new URL(a.getAttribute("href"), location.href);
      if (u.host === host) {
        internal++;
        if (/\bnofollow\b/i.test(attr(a, "rel"))) nofollowInternal++;
      }
    } catch {
      /* unparseable href */
    }
  }
  let jsonLd = 0;
  let jsonLdInvalid = 0;
  for (const s of document.querySelectorAll('script[type="application/ld+json" i]')) {
    jsonLd++;
    try {
      JSON.parse(s.textContent);
    } catch {
      jsonLdInvalid++;
    }
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
      document.querySelector(`meta[property="${p}" i][content]`),
    ),
    twitterCard: Boolean(document.querySelector('meta[name="twitter:card" i][content]')),
    jsonLd,
    jsonLdInvalid,
    imagesTotal: images.length,
    imagesMissingAlt: images.filter((i) => !i.hasAttribute("alt")).length,
    mixed,
    internal,
    nofollowInternal,
    wordCount: text ? text.split(" ").length : 0,
  };
}

/**
 * @typedef {{ id: string, name: string, status: "pass"|"warn"|"fail", why: string, value?: string }} Check
 * @returns {Check[]}
 */
export function runChecks(f) {
  const checks = [];
  const add = (id, name, status, why, value) => checks.push({ id, name, status, why, value });
  const canonical = f.canonicals[0] || "";
  const selfCanonical = canonical && canonical.replace(/\/$/, "") === f.url.split("#")[0].replace(/\/$/, "");
  const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

  add("https", "HTTPS", f.https ? "pass" : "fail",
    f.https ? "Served securely." : "Serve the page over HTTPS and redirect http:// to it.");
  if (f.https) {
    add("mixed", "Mixed content", f.mixed === 0 ? "pass" : "warn",
      f.mixed === 0 ? "No insecure resources." : `Switch ${plural(f.mixed, "http:// resource")} to https://.`);
  }
  add("indexable", "Indexable", !f.noindex ? "pass" : "fail",
    !f.noindex ? "No noindex directive." : "noindex keeps this page out of search results. Remove it if the page should rank.");
  add("refresh", "Meta refresh", !f.metaRefresh ? "pass" : "warn",
    !f.metaRefresh ? "No meta refresh redirect." : "Replace the meta refresh with a server-side 301 redirect.");

  if (!f.title) add("title", "Title tag", "fail", "Add a unique 30-60 character <title>.");
  else if (f.titleCount > 1) add("title", "Title tag", "warn", `${f.titleCount} title tags - keep exactly one.`, f.title);
  else if (f.title.length > 60) add("title", "Title tag", "warn", `${f.title.length} characters - trim under ~60 so it isn't cut off.`, f.title);
  else if (f.title.length < 15) add("title", "Title tag", "warn", `${f.title.length} characters - expand into a descriptive phrase.`, f.title);
  else add("title", "Title tag", "pass", `${f.title.length} characters - a healthy length.`, f.title);

  if (!f.description) add("description", "Meta description", "warn", "Add a 70-155 character description to earn the click.");
  else if (f.description.length > 165) add("description", "Meta description", "warn", `${f.description.length} characters - trim under ~155.`, f.description);
  else if (f.description.length < 50) add("description", "Meta description", "warn", `${f.description.length} characters - expand toward 70-155.`, f.description);
  else add("description", "Meta description", "pass", `${f.description.length} characters - a healthy length.`, f.description);

  if (f.canonicals.length === 0) add("canonical", "Canonical", "warn", "Add <link rel=\"canonical\"> pointing at the preferred URL.");
  else if (f.canonicals.length > 1) add("canonical", "Canonical", "fail", `${f.canonicals.length} canonicals - search engines ignore them all.`);
  else if (!/^https?:\/\//i.test(canonical)) add("canonical", "Canonical", "warn", "Use an absolute canonical URL.", canonical);
  else if (!selfCanonical) add("canonical", "Canonical", "warn", "Points at a different URL - confirm that's intended.", canonical);
  else add("canonical", "Canonical", "pass", "Self-referencing canonical present.");

  if (f.h1Count === 0) add("h1", "H1 heading", "warn", "Add exactly one <h1> naming the page topic.");
  else if (f.h1Count > 1) add("h1", "H1 heading", "warn", `${f.h1Count} H1s - keep one, demote the rest.`);
  else add("h1", "H1 heading", "pass", "Exactly one H1.");

  add("viewport", "Mobile viewport", f.viewport ? "pass" : "fail",
    f.viewport ? "Viewport meta present." : 'Add <meta name="viewport" content="width=device-width, initial-scale=1">.');
  add("lang", "Language", f.lang ? "pass" : "warn",
    f.lang ? `html lang="${f.lang}".` : 'Add lang="en" (or your language) to <html>.');
  add("favicon", "Favicon", f.favicon ? "pass" : "warn",
    f.favicon ? "Favicon declared." : "Add a favicon link plus an apple-touch-icon.");
  add("og", "Open Graph", f.ogComplete ? "pass" : "warn",
    f.ogComplete ? "og:title, og:description and og:image present." : "Add og:title, og:description and a 1200x630 og:image.");
  add("twitter", "Twitter card", f.twitterCard ? "pass" : "warn",
    f.twitterCard ? "twitter:card present." : "Add twitter:card (summary_large_image) tags.");

  if (f.jsonLdInvalid > 0) add("schema", "Structured data", "fail", `${plural(f.jsonLdInvalid, "JSON-LD block")} fail to parse - validate and fix.`);
  else if (f.jsonLd === 0) add("schema", "Structured data", "warn", "No JSON-LD - the page can't earn rich results.");
  else add("schema", "Structured data", "pass", `${plural(f.jsonLd, "valid JSON-LD block")}.`);

  if (f.imagesTotal > 0) {
    add("alt", "Image alt text", f.imagesMissingAlt === 0 ? "pass" : "warn",
      f.imagesMissingAlt === 0
        ? `All ${plural(f.imagesTotal, "image")} have alt attributes.`
        : `${f.imagesMissingAlt} of ${plural(f.imagesTotal, "image")} missing alt text.`);
  }
  add("content", "Content depth", f.wordCount >= 100 ? "pass" : "warn",
    f.wordCount >= 100 ? `About ${f.wordCount.toLocaleString("en-US")} words of visible text.` : `Only about ${f.wordCount} words - thin pages rarely rank.`);
  if (f.nofollowInternal > 0) {
    add("links", "Internal links", "warn", `${plural(f.nofollowInternal, "internal link")} marked nofollow - remove it within your own site.`);
  } else if (f.internal > 0) {
    add("links", "Internal links", "pass", `${plural(f.internal, "internal link")}, none nofollowed.`);
  }
  return checks;
}

/** Issues cost a full point, warnings half: 100 = every check passes. */
export function summarize(checks) {
  const fail = checks.filter((c) => c.status === "fail").length;
  const warn = checks.filter((c) => c.status === "warn").length;
  const pass = checks.length - fail - warn;
  const score = checks.length ? Math.max(0, Math.round(((pass + warn * 0.5) / checks.length) * 100)) : 0;
  const verdict = score >= 90 ? "Looking excellent" : score >= 75 ? "In good shape" : score >= 55 ? "Room to improve" : "Needs attention";
  const tone = score >= 90 ? "good" : score >= 55 ? "fair" : "poor";
  return { pass, warn, fail, score, verdict, tone };
}
