/**
 * The Site Audit check registry: every check MyKavo can raise, with the
 * user-facing explanation and fix guidance that powers the dashboard
 * tooltips. Central and data-only so the list is testable and the UI,
 * worker, and docs can never drift apart.
 *
 * Severity model (mirrors the change-monitoring scale):
 *   ERROR   - broken or actively harming indexing/users (red)
 *   WARNING - hurting quality or rankings, fix soon (amber)
 *   NOTICE  - worth improving, not urgent (blue)
 */

export type AuditSeverity = "ERROR" | "WARNING" | "NOTICE";

export type AuditCategory =
  | "Crawlability"
  | "Indexability"
  | "HTTP status"
  | "Titles"
  | "Meta description"
  | "Headings"
  | "Content"
  | "Images"
  | "Internal links"
  | "External links"
  | "URLs"
  | "Sitemap"
  | "Robots.txt"
  | "Structured data"
  | "Social tags"
  | "Security"
  | "Performance"
  | "Mobile"
  | "International"
  | "Accessibility"
  | "Trust signals"
  | "HTML hygiene";

export interface AuditCheckDef {
  category: AuditCategory;
  severity: AuditSeverity;
  title: string;
  /** One-liner: what this issue means. */
  explain: string;
  /** One or two sentences: how to fix it. Powers the tooltip. */
  fix: string;
}

export const AUDIT_CHECKS: Record<string, AuditCheckDef> = {
  // ---------- HTTP status ----------
  "http-4xx": {
    category: "HTTP status", severity: "ERROR", title: "4XX page",
    explain: "The page returns a client error (404, 410, 403…), so visitors and search engines hit a dead end.",
    fix: "Restore the page, or 301-redirect the URL to the closest live equivalent and remove links pointing at it.",
  },
  "http-5xx": {
    category: "HTTP status", severity: "ERROR", title: "5XX page",
    explain: "The server failed to respond (500/502/503), which wastes crawl budget and can get URLs dropped from the index.",
    fix: "Check server logs for the failing route. If it was temporary load, confirm the page now returns 200.",
  },
  "http-fetch-error": {
    category: "HTTP status", severity: "ERROR", title: "Page could not be fetched",
    explain: "The request timed out or the connection failed, so the page could not be audited at all.",
    fix: "Verify the URL loads in a browser and that your host or firewall is not blocking automated requests.",
  },
  "http-redirect": {
    category: "HTTP status", severity: "NOTICE", title: "3XX redirect",
    explain: "An internally linked URL redirects. Each hop leaks a little link equity and slows users down.",
    fix: "Update internal links to point straight at the final destination URL.",
  },
  "redirect-chain": {
    category: "Crawlability", severity: "WARNING", title: "Redirect chain",
    explain: "The URL passes through two or more redirects before resolving.",
    fix: "Point the first URL directly at the final destination so the chain collapses to a single hop.",
  },
  "redirect-loop": {
    category: "Crawlability", severity: "ERROR", title: "Redirect loop",
    explain: "The URL redirects back to itself (directly or via other URLs), so it can never load.",
    fix: "Trace the redirect rules for this path and remove the rule that sends it back into the cycle.",
  },
  "soft-404": {
    category: "Crawlability", severity: "WARNING", title: "Possible soft 404",
    explain: "The page returns 200 but has almost no content, which search engines may treat as a fake 'not found' page.",
    fix: "Return a real 404/410 for missing content, or flesh the page out so it has substantial unique content.",
  },
  "crawl-depth": {
    category: "Crawlability", severity: "NOTICE", title: "Crawl depth too high",
    explain: "The page sits 5+ clicks from the homepage, so crawlers and users rarely reach it.",
    fix: "Link to it from a hub page, category page, or the navigation to bring it within 3–4 clicks.",
  },

  // ---------- Indexability ----------
  "noindex-page": {
    category: "Indexability", severity: "WARNING", title: "Noindex page",
    explain: "A robots meta tag excludes this internally linked page from search results.",
    fix: "If the page should rank, remove the noindex directive. If it is intentional, no action is needed.",
  },
  "canonical-missing": {
    category: "Indexability", severity: "NOTICE", title: "Missing canonical tag",
    explain: "Without a canonical, parameter or duplicate versions of this URL can compete with it in search.",
    fix: "Add <link rel=\"canonical\"> pointing at the preferred URL of this page (usually itself).",
  },
  "canonical-multiple": {
    category: "Indexability", severity: "ERROR", title: "Multiple canonical tags",
    explain: "The page declares more than one canonical; search engines will ignore all of them.",
    fix: "Keep exactly one canonical link element (check your theme, plugins, and templates for duplicates).",
  },
  "canonical-other": {
    category: "Indexability", severity: "NOTICE", title: "Canonicalized to another URL",
    explain: "The canonical points elsewhere, telling search engines to index a different URL instead of this one.",
    fix: "Confirm this is intended. If this page should rank on its own, make the canonical self-referencing.",
  },
  "canonical-redirect": {
    category: "Indexability", severity: "WARNING", title: "Canonical points to redirect",
    explain: "The canonical URL itself redirects, sending search engines through a hop to reach the preferred page.",
    fix: "Point the canonical directly at the final 200 URL.",
  },
  "canonical-broken": {
    category: "Indexability", severity: "ERROR", title: "Canonical points to broken page",
    explain: "The canonical target returns an error, so search engines may ignore the annotation or drop the page.",
    fix: "Point the canonical at a live page that returns 200.",
  },
  "meta-refresh": {
    category: "Indexability", severity: "WARNING", title: "Meta refresh redirect",
    explain: "The page redirects with <meta http-equiv=\"refresh\">, which is slower than a real redirect and passes weaker signals.",
    fix: "Replace the meta refresh with a server-side 301 redirect.",
  },
  "canonical-relative": {
    category: "Indexability", severity: "WARNING", title: "Canonical is not absolute",
    explain: "Relative canonical URLs are ambiguous and can resolve to the wrong address.",
    fix: "Use an absolute canonical URL including protocol and host (https://…).",
  },

  // ---------- Titles ----------
  "title-missing": {
    category: "Titles", severity: "ERROR", title: "Missing title tag",
    explain: "The page has no <title>, so search results show a generated one and rankings suffer.",
    fix: "Add a unique, descriptive <title> of roughly 30–60 characters that includes the page's main topic.",
  },
  "title-empty": {
    category: "Titles", severity: "ERROR", title: "Empty title tag",
    explain: "A <title> element exists but contains no text.",
    fix: "Fill the title with a unique, descriptive 30–60 character summary of the page.",
  },
  "title-multiple": {
    category: "Titles", severity: "WARNING", title: "Multiple title tags",
    explain: "More than one <title> is defined; search engines may pick the wrong one.",
    fix: "Remove the extras so exactly one title remains (themes and SEO plugins often inject a second).",
  },
  "title-long": {
    category: "Titles", severity: "NOTICE", title: "Title too long",
    explain: "Titles over ~60 characters get truncated in search results.",
    fix: "Shorten the title to roughly 30–60 characters, front-loading the important words.",
  },
  "title-short": {
    category: "Titles", severity: "NOTICE", title: "Title too short",
    explain: "Titles under ~15 characters waste the strongest on-page ranking signal.",
    fix: "Expand the title into a descriptive phrase about the page's topic.",
  },
  "title-duplicate": {
    category: "Titles", severity: "WARNING", title: "Duplicate title",
    explain: "Multiple pages share the same title, so they compete with each other and look templated.",
    fix: "Give each page a unique title describing its specific content.",
  },
  "title-h1-same": {
    category: "Titles", severity: "NOTICE", title: "Title identical to H1",
    explain: "The title and H1 are exactly the same, a missed chance to cover a second phrasing.",
    fix: "Vary one of them slightly - e.g. a benefit-led title and a descriptive H1.",
  },

  // ---------- Meta description ----------
  "desc-missing": {
    category: "Meta description", severity: "WARNING", title: "Missing meta description",
    explain: "Without a description, search engines improvise a snippet, which usually lowers click-through.",
    fix: "Add a unique meta description of roughly 70–155 characters that sells the click.",
  },
  "desc-empty": {
    category: "Meta description", severity: "WARNING", title: "Empty meta description",
    explain: "A description tag exists but is blank.",
    fix: "Write a compelling 70–155 character summary of the page.",
  },
  "desc-multiple": {
    category: "Meta description", severity: "NOTICE", title: "Multiple meta descriptions",
    explain: "More than one description tag is defined; search engines may pick the wrong one.",
    fix: "Keep exactly one meta description per page.",
  },
  "desc-long": {
    category: "Meta description", severity: "NOTICE", title: "Meta description too long",
    explain: "Descriptions over ~155 characters get cut off mid-sentence in results.",
    fix: "Trim to roughly 70–155 characters with the value proposition early.",
  },
  "desc-short": {
    category: "Meta description", severity: "NOTICE", title: "Meta description too short",
    explain: "Very short descriptions waste snippet space and rarely earn the click.",
    fix: "Expand toward 70–155 characters describing what the visitor gets.",
  },
  "desc-duplicate": {
    category: "Meta description", severity: "NOTICE", title: "Duplicate meta description",
    explain: "Multiple pages share the same description, making results look templated.",
    fix: "Write a unique description per page.",
  },

  // ---------- Headings ----------
  "h1-missing": {
    category: "Headings", severity: "WARNING", title: "Missing H1",
    explain: "The page has no top-level heading, weakening its topical signal and accessibility outline.",
    fix: "Add exactly one <h1> naming the page's main topic.",
  },
  "h1-multiple": {
    category: "Headings", severity: "NOTICE", title: "Multiple H1 tags",
    explain: "Several H1s dilute the main-topic signal and confuse the document outline.",
    fix: "Keep one H1; demote the others to H2/H3.",
  },
  "h1-duplicate": {
    category: "Headings", severity: "NOTICE", title: "Duplicate H1 across pages",
    explain: "Multiple pages share the same H1, suggesting templated or duplicate content.",
    fix: "Make each page's H1 describe its specific content.",
  },
  "h1-long": {
    category: "Headings", severity: "NOTICE", title: "H1 too long",
    explain: "H1s over ~70 characters read as sentences, not headings.",
    fix: "Tighten the H1 to a concise topic statement.",
  },
  "heading-empty": {
    category: "Headings", severity: "NOTICE", title: "Empty heading",
    explain: "A heading element with no text breaks the document outline and screen-reader navigation.",
    fix: "Remove the empty element or give it real text (check for headings that only wrap images).",
  },
  "heading-skip": {
    category: "Headings", severity: "NOTICE", title: "Heading level skipped",
    explain: "The outline jumps levels (e.g. H1 → H3), which hurts accessibility and structure.",
    fix: "Step heading levels down one at a time (H1 → H2 → H3).",
  },

  // ---------- Content ----------
  "content-thin": {
    category: "Content", severity: "WARNING", title: "Thin content",
    explain: "The page has under ~100 words of body text, rarely enough to rank or satisfy a visitor.",
    fix: "Expand the page with genuinely useful content, or noindex/merge it if it exists only for navigation.",
  },
  "content-lorem": {
    category: "Content", severity: "ERROR", title: "Placeholder text (Lorem Ipsum)",
    explain: "Template filler text made it to production.",
    fix: "Replace the placeholder with real copy - search engines and customers are both reading it.",
  },
  "content-duplicate": {
    category: "Content", severity: "WARNING", title: "Duplicate content",
    explain: "Two or more URLs serve near-identical body text and neither canonicalizes to the other.",
    fix: "Pick one canonical URL and 301 or rel=canonical the duplicates to it.",
  },

  // ---------- Images ----------
  "img-missing-alt": {
    category: "Images", severity: "WARNING", title: "Images missing alt text",
    explain: "Images without alt attributes are invisible to screen readers and image search.",
    fix: "Add a short, descriptive alt to meaningful images; use an empty alt (alt=\"\") only for decoration.",
  },
  "img-missing-dims": {
    category: "Images", severity: "NOTICE", title: "Images missing width/height",
    explain: "Without dimensions the browser cannot reserve space, causing layout shift while loading.",
    fix: "Add width and height attributes (or CSS aspect-ratio) to every content image.",
  },
  "img-broken": {
    category: "Images", severity: "ERROR", title: "Broken image",
    explain: "An image URL on the page returns an error, showing visitors a broken tile.",
    fix: "Re-upload the file or update the src to the correct path.",
  },
  "img-no-lazy": {
    category: "Images", severity: "NOTICE", title: "Below-fold images not lazy-loaded",
    explain: "Pages with many eagerly loaded images ship megabytes the visitor may never scroll to.",
    fix: "Add loading=\"lazy\" to images below the first screen.",
  },

  // ---------- Internal links ----------
  "link-internal-broken": {
    category: "Internal links", severity: "ERROR", title: "Broken internal link",
    explain: "The page links to an internal URL that returns 4XX/5XX - a dead end for users and crawlers.",
    fix: "Fix the destination or update/remove the link.",
  },
  "link-internal-redirect": {
    category: "Internal links", severity: "NOTICE", title: "Internal link to redirect",
    explain: "The page links to a URL that redirects instead of the final destination.",
    fix: "Update the link to point straight at the final URL.",
  },
  "link-orphan": {
    category: "Internal links", severity: "WARNING", title: "Orphan page",
    explain: "The page appears in your sitemap but no crawled page links to it, so it depends entirely on the sitemap to be found.",
    fix: "Link to it from relevant pages or navigation - or remove it from the sitemap if it is retired.",
  },
  "link-empty-anchor": {
    category: "Internal links", severity: "NOTICE", title: "Link with empty anchor",
    explain: "A link with no text (and no aria-label) gives users and crawlers zero context.",
    fix: "Add link text or an aria-label describing the destination.",
  },
  "link-generic-anchor": {
    category: "Internal links", severity: "NOTICE", title: "Generic anchor text",
    explain: "Anchors like \"click here\" or \"read more\" waste the relevance signal link text carries.",
    fix: "Use descriptive anchors that say where the link goes.",
  },
  "link-js-only": {
    category: "Internal links", severity: "NOTICE", title: "JavaScript-only link",
    explain: "Links using href=\"#\" or javascript: are invisible to crawlers and break open-in-new-tab.",
    fix: "Use a real <a href> for navigation; reserve buttons for actions.",
  },
  "link-internal-nofollow": {
    category: "Internal links", severity: "NOTICE", title: "Nofollowed internal link",
    explain: "Internal links marked rel=\"nofollow\" tell search engines not to pass signals within your own site.",
    fix: "Remove rel=\"nofollow\" from internal links - it is meant for untrusted external destinations.",
  },
  "link-too-many": {
    category: "Internal links", severity: "NOTICE", title: "Too many on-page links",
    explain: "Hundreds of links on one page dilute the equity each one passes and overwhelm users.",
    fix: "Trim to the links that matter; move exhaustive lists behind dedicated index pages.",
  },

  // ---------- External links ----------
  "link-external-broken": {
    category: "External links", severity: "WARNING", title: "Broken external link",
    explain: "The page links to an external URL that no longer resolves.",
    fix: "Update the link to a live source or remove it.",
  },
  "link-external-http": {
    category: "External links", severity: "NOTICE", title: "External link over HTTP",
    explain: "Linking to insecure http:// pages can trigger browser warnings and looks dated.",
    fix: "Switch the link to the https:// version of the destination.",
  },

  // ---------- URLs ----------
  "url-long": {
    category: "URLs", severity: "NOTICE", title: "URL too long",
    explain: "URLs over ~115 characters are hard to share and get truncated in results.",
    fix: "Keep slugs short and descriptive; drop filler words.",
  },
  "url-uppercase": {
    category: "URLs", severity: "NOTICE", title: "Uppercase characters in URL",
    explain: "Mixed-case paths create duplicate-URL risk on case-sensitive servers.",
    fix: "Standardize on lowercase URLs and redirect the uppercase variants.",
  },
  "url-underscore": {
    category: "URLs", severity: "NOTICE", title: "Underscores in URL",
    explain: "Search engines treat under_scores as joiners, not separators.",
    fix: "Prefer hyphens in new slugs (renaming existing URLs needs redirects - often not worth it).",
  },
  "url-params": {
    category: "URLs", severity: "NOTICE", title: "Query parameters in indexable URL",
    explain: "Parameterized URLs multiply into near-duplicates without canonical control.",
    fix: "Canonicalize parameterized pages to their clean URL.",
  },
  "url-session-id": {
    category: "URLs", severity: "WARNING", title: "Session ID in URL",
    explain: "Session tokens in URLs create infinite duplicate URLs and leak identifiers when shared.",
    fix: "Move sessions to cookies and canonicalize existing URLs.",
  },

  // ---------- Sitemap ----------
  "sitemap-missing": {
    category: "Sitemap", severity: "WARNING", title: "No XML sitemap found",
    explain: "Without a sitemap, discovery of new and deep pages depends entirely on link crawling.",
    fix: "Generate /sitemap.xml (most CMSs and frameworks have this built in) and reference it in robots.txt.",
  },
  "sitemap-broken-url": {
    category: "Sitemap", severity: "WARNING", title: "Sitemap lists broken URL",
    explain: "The sitemap includes URLs returning 4XX/5XX, wasting crawl budget and eroding trust in the sitemap.",
    fix: "Regenerate the sitemap so it lists only live, indexable 200 URLs.",
  },
  "sitemap-redirect-url": {
    category: "Sitemap", severity: "NOTICE", title: "Sitemap lists redirecting URL",
    explain: "The sitemap should list final destinations, not URLs that redirect.",
    fix: "Update the sitemap entries to the post-redirect URLs.",
  },
  "sitemap-noindex-url": {
    category: "Sitemap", severity: "WARNING", title: "Sitemap lists noindex URL",
    explain: "Submitting a page for indexing while telling engines not to index it is contradictory.",
    fix: "Remove noindexed URLs from the sitemap, or drop the noindex if the page should rank.",
  },

  // ---------- Robots.txt ----------
  "robots-missing": {
    category: "Robots.txt", severity: "NOTICE", title: "Missing robots.txt",
    explain: "Every crawler request for /robots.txt 404s; harmless but sloppy, and you lose the sitemap pointer.",
    fix: "Add a robots.txt - even a permissive default with a Sitemap: line.",
  },
  "robots-no-sitemap": {
    category: "Robots.txt", severity: "NOTICE", title: "robots.txt missing Sitemap line",
    explain: "robots.txt is the standard place crawlers look for your sitemap location.",
    fix: "Add \"Sitemap: https://yourdomain.com/sitemap.xml\" to robots.txt.",
  },
  "robots-blocks-assets": {
    category: "Robots.txt", severity: "WARNING", title: "robots.txt blocks CSS or JS",
    explain: "Blocking assets prevents Google from rendering pages the way users see them.",
    fix: "Remove Disallow rules covering CSS/JS paths (e.g. /wp-includes/, /assets/).",
  },

  // ---------- Structured data ----------
  "schema-invalid-json": {
    category: "Structured data", severity: "ERROR", title: "Invalid JSON-LD",
    explain: "A structured-data block fails to parse, so search engines ignore it entirely.",
    fix: "Validate the block with Google's Rich Results Test and fix the JSON syntax.",
  },
  "schema-missing": {
    category: "Structured data", severity: "NOTICE", title: "No structured data",
    explain: "Without schema markup the page is ineligible for rich results (stars, FAQs, breadcrumbs…).",
    fix: "Add JSON-LD for the page type - Organization/WebSite sitewide, Article/Product/FAQ where relevant.",
  },

  // ---------- Social tags ----------
  "og-incomplete": {
    category: "Social tags", severity: "NOTICE", title: "Incomplete Open Graph tags",
    explain: "Missing og:title/description/image means ugly, low-click previews when the page is shared.",
    fix: "Add og:title, og:description, and a 1200×630 og:image to every shareable page.",
  },
  "twitter-missing": {
    category: "Social tags", severity: "NOTICE", title: "Missing Twitter Card tags",
    explain: "Without twitter:card markup, shares on X fall back to bare links.",
    fix: "Add twitter:card (summary_large_image) plus title/description/image tags.",
  },
  "favicon-missing": {
    category: "Social tags", severity: "NOTICE", title: "Missing favicon",
    explain: "Browsers and search results show a blank icon next to your pages.",
    fix: "Add a favicon link (ICO/PNG/SVG) plus an apple-touch-icon.",
  },

  // ---------- Security ----------
  "sec-http-page": {
    category: "Security", severity: "ERROR", title: "Page served over HTTP",
    explain: "Unencrypted pages trigger 'Not secure' warnings and rank worse.",
    fix: "Serve everything over HTTPS and 301 http:// URLs to https://.",
  },
  "sec-mixed-content": {
    category: "Security", severity: "WARNING", title: "Mixed content",
    explain: "An HTTPS page loads images/scripts/styles over HTTP, which browsers block or flag.",
    fix: "Update the http:// resource URLs to https:// (or protocol-relative to your CDN).",
  },
  "sec-insecure-form": {
    category: "Security", severity: "ERROR", title: "Form posts to HTTP",
    explain: "A form submits to an unencrypted endpoint, exposing whatever users type.",
    fix: "Change the form action to HTTPS.",
  },
  "sec-no-hsts": {
    category: "Security", severity: "NOTICE", title: "Missing HSTS header",
    explain: "Without Strict-Transport-Security, first visits can still be downgraded to HTTP.",
    fix: "Send \"Strict-Transport-Security: max-age=31536000\" from your server or CDN.",
  },

  // ---------- Performance ----------
  "perf-slow-ttfb": {
    category: "Performance", severity: "WARNING", title: "Slow server response",
    explain: "The HTML took over 1.5s to arrive - everything else waits on this.",
    fix: "Add page caching or a CDN in front of the origin; check slow database queries.",
  },
  "perf-large-html": {
    category: "Performance", severity: "NOTICE", title: "Large HTML document",
    explain: "HTML over ~300KB slows parsing on mobile devices.",
    fix: "Trim inlined data and hidden markup; paginate very long listings.",
  },
  "perf-no-compression": {
    category: "Performance", severity: "WARNING", title: "No text compression",
    explain: "The HTML is served without gzip/brotli, transferring several times more bytes than needed.",
    fix: "Enable brotli or gzip compression on the server or CDN.",
  },
  "perf-no-caching": {
    category: "Performance", severity: "NOTICE", title: "No cache headers on page",
    explain: "Without Cache-Control, browsers and CDNs re-fetch the page every time.",
    fix: "Send an appropriate Cache-Control header (even a short s-maxage helps through a CDN).",
  },
  "perf-inline-bloat": {
    category: "Performance", severity: "NOTICE", title: "Heavy inline CSS/JS",
    explain: "Over ~50KB of inline style/script bloats every single page load and cannot be cached.",
    fix: "Move large inline blocks into cacheable external files.",
  },

  // ---------- Mobile ----------
  "mobile-no-viewport": {
    category: "Mobile", severity: "ERROR", title: "Missing viewport meta tag",
    explain: "Without a viewport tag, phones render the desktop layout zoomed out - and Google indexes mobile-first.",
    fix: "Add <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"> to the head.",
  },

  // ---------- International ----------
  "hreflang-invalid": {
    category: "International", severity: "WARNING", title: "Invalid hreflang value",
    explain: "An hreflang uses a malformed language/region code, so engines ignore the annotation.",
    fix: "Use ISO codes like \"en\", \"en-us\", or \"x-default\".",
  },
  "hreflang-no-self": {
    category: "International", severity: "NOTICE", title: "hreflang missing self-reference",
    explain: "Pages with hreflang must include themselves in the set or the annotations may be discarded.",
    fix: "Add an hreflang entry pointing at the page's own URL.",
  },
  "lang-missing": {
    category: "International", severity: "NOTICE", title: "Missing html lang attribute",
    explain: "Screen readers and search engines cannot tell what language the page is in.",
    fix: "Add lang=\"en\" (or your language) to the <html> element.",
  },

  // ---------- Accessibility ----------
  "a11y-empty-link": {
    category: "Accessibility", severity: "WARNING", title: "Empty link or button",
    explain: "Interactive elements without text or labels are unusable with a screen reader.",
    fix: "Add visible text or an aria-label to every link and button.",
  },
  "a11y-input-no-label": {
    category: "Accessibility", severity: "WARNING", title: "Form input without label",
    explain: "Inputs without an associated label are hard to use with assistive tech and hurt conversions.",
    fix: "Add a <label for> (or aria-label) to every input, select, and textarea.",
  },

  // ---------- Trust signals ----------
  "trust-no-contact": {
    category: "Trust signals", severity: "NOTICE", title: "No contact page detected",
    explain: "A reachable contact page is a basic E-E-A-T and customer-trust signal.",
    fix: "Add a /contact page and link it from the footer.",
  },
  "trust-no-privacy": {
    category: "Trust signals", severity: "NOTICE", title: "No privacy policy detected",
    explain: "Privacy/terms pages are expected by users, ad platforms, and quality raters.",
    fix: "Publish a privacy policy and link it from the footer.",
  },

  // ---------- HTML hygiene ----------
  "html-no-doctype": {
    category: "HTML hygiene", severity: "NOTICE", title: "Missing doctype",
    explain: "Without <!doctype html> browsers fall into quirks mode with inconsistent rendering.",
    fix: "Start the document with <!doctype html>.",
  },
  "html-no-charset": {
    category: "HTML hygiene", severity: "NOTICE", title: "Missing charset declaration",
    explain: "Without a declared charset, special characters can render as mojibake.",
    fix: "Add <meta charset=\"utf-8\"> as the first element in the head.",
  },
  "html-deprecated-tags": {
    category: "HTML hygiene", severity: "NOTICE", title: "Deprecated HTML tags",
    explain: "Tags like <center>, <font>, or <marquee> signal legacy markup and render unpredictably.",
    fix: "Replace deprecated tags with semantic HTML and CSS.",
  },
};

/**
 * Authoritative counts, derived from the registry rather than written down.
 *
 * These numbers appear in marketing copy, the comparison pages and llms.txt,
 * where a wrong figure is a public claim that does not survive a reader
 * checking it. They drifted once already - the pages said 86/21 while the
 * registry held 89/22 - so the copy now imports these and a test asserts the
 * published strings match.
 */
export const AUDIT_CHECK_COUNT = Object.keys(AUDIT_CHECKS).length;
export const AUDIT_CATEGORY_COUNT = new Set(
  Object.values(AUDIT_CHECKS).map((c) => c.category),
).size;

export type AuditCheckId = keyof typeof AUDIT_CHECKS;

export const SEVERITY_ORDER: Record<AuditSeverity, number> = {
  ERROR: 2,
  WARNING: 1,
  NOTICE: 0,
};
