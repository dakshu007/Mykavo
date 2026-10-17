import { attr, capHtml, findTags, lowerAscii } from "./html";

/**
 * WordPress theme & plugin detection from a page's delivered HTML.
 *
 * What can be seen from outside, and nothing more:
 *  - Themes and plugins that load CSS/JS/images on the page leave their folder
 *    in the URL: /wp-content/themes/<slug>/ and /wp-content/plugins/<slug>/.
 *  - A few popular plugins also announce themselves in an HTML comment or a
 *    generator tag (Yoast, Rank Math, WooCommerce, Elementor...).
 *  - The active theme's style.css header names the theme, its version, author
 *    and - for a child theme - its parent ("Template:").
 * Plugins that load nothing on the front end (security, backup, admin tools)
 * are invisible to any outside detector, and the page says so.
 *
 * Pages longer than MAX_PARSE_CHARS are analysed on their first
 * MAX_PARSE_CHARS characters.
 */

/** A theme/plugin folder name and the "/" after it, read from lowercased text. */
const SLUG_AT = /[a-z0-9][a-z0-9._-]{0,80}\//y;

export interface ThemeHeader {
  name: string | null;
  version: string | null;
  author: string | null;
  authorUri: string | null;
  themeUri: string | null;
  description: string | null;
  /** Parent theme slug, when this is a child theme. */
  template: string | null;
}

export interface DetectedTheme {
  slug: string;
  /** style.css URL to read the header from. */
  stylesheetUrl: string;
  header: ThemeHeader | null;
}

export interface DetectedPlugin {
  slug: string;
  name: string;
  /** How we know: an asset path, or a known fingerprint. */
  evidence: "assets" | "fingerprint";
}

export interface WordPressReport {
  url: string;
  finalUrl: string;
  httpStatus: number;
  isWordPress: boolean;
  /** Signals that showed it's WordPress, for the "how we know" line. */
  signals: string[];
  wordpressVersion: string | null;
  themes: DetectedTheme[];
  plugins: DetectedPlugin[];
}

/** Well-known plugins whose folder slug doesn't read as their name. */
const KNOWN_PLUGIN_NAMES: Record<string, string> = {
  "wordpress-seo": "Yoast SEO",
  "seo-by-rank-math": "Rank Math SEO",
  "all-in-one-seo-pack": "All in One SEO",
  woocommerce: "WooCommerce",
  elementor: "Elementor",
  "elementor-pro": "Elementor Pro",
  "contact-form-7": "Contact Form 7",
  "wpforms-lite": "WPForms Lite",
  wpforms: "WPForms",
  "gravityforms": "Gravity Forms",
  jetpack: "Jetpack",
  "wp-rocket": "WP Rocket",
  "litespeed-cache": "LiteSpeed Cache",
  "w3-total-cache": "W3 Total Cache",
  "wp-super-cache": "WP Super Cache",
  autoptimize: "Autoptimize",
  akismet: "Akismet",
  wordfence: "Wordfence",
  "js_composer": "WPBakery Page Builder",
  "beaver-builder-lite-version": "Beaver Builder",
  "bb-plugin": "Beaver Builder",
  "revslider": "Slider Revolution",
  "sitepress-multilingual-cms": "WPML",
  polylang: "Polylang",
  "google-site-kit": "Site Kit by Google",
  "google-analytics-for-wordpress": "MonsterInsights",
  "mailchimp-for-wp": "MC4WP: Mailchimp for WordPress",
  "really-simple-ssl": "Really Simple SSL",
  "cookie-law-info": "CookieYes",
  "complianz-gdpr": "Complianz",
  "smart-slider-3": "Smart Slider 3",
  "ultimate-addons-for-gutenberg": "Spectra",
  "kadence-blocks": "Kadence Blocks",
  "essential-addons-for-elementor-lite": "Essential Addons for Elementor",
  "header-footer-elementor": "Ultimate Addons for Elementor",
  "astra-sites": "Starter Templates",
  "woocommerce-payments": "WooPayments",
  "woocommerce-gateway-stripe": "WooCommerce Stripe Gateway",
  "wp-smushit": "Smush",
  "ewww-image-optimizer": "EWWW Image Optimizer",
  "imagify": "Imagify",
  "redirection": "Redirection",
  "tablepress": "TablePress",
  "the-events-calendar": "The Events Calendar",
  "bbpress": "bbPress",
  "buddypress": "BuddyPress",
  "learnpress": "LearnPress",
  "sfwd-lms": "LearnDash",
  "mykavo": "MyKavo",
};

/**
 * Does a `<meta ... name="generator" ... {word}` tag appear? Same answer as
 * `/<meta[^>]+name=["']generator["'][^>]+{word}/i`, whose two `[^>]+` runs
 * backtrack across each other - quadratic on a long tag. `word` is lowercase.
 */
function generatorMentions(html: string, word: string): boolean {
  const lower = lowerAscii(html);
  for (let open = lower.indexOf("<meta"); open !== -1; open = lower.indexOf("<meta", open)) {
    const gt = lower.indexOf(">", open + 5);
    const end = gt === -1 ? lower.length : gt;
    // A later "<meta" before the same ">" sees a suffix of this tag, so if this
    // one fails that one fails too: test only the first.
    const tag = lower.slice(open, end);
    const name = /name=["']generator["']/.exec(tag.slice(6));
    if (name && tag.slice(6 + name.index + name[0].length + 1).includes(word)) return true;
    if (gt === -1) break;
    open = gt;
  }
  return false;
}

/** Plugins that identify themselves in markup even without an asset path. */
const FINGERPRINTS: Array<{ slug: string; test: (html: string) => boolean }> = [
  { slug: "wordpress-seo", test: (h) => /This site is optimized with the Yoast SEO/i.test(h) },
  { slug: "seo-by-rank-math", test: (h) => /Search Engine Optimization by Rank Math/i.test(h) },
  { slug: "all-in-one-seo-pack", test: (h) => /All in One SEO( Pro)? \d/i.test(h) },
  { slug: "woocommerce", test: (h) => generatorMentions(h, "woocommerce") },
  { slug: "elementor", test: (h) => generatorMentions(h, "elementor") },
  { slug: "wp-rocket", test: (h) => /This website is like a Rocket/i.test(h) },
  { slug: "litespeed-cache", test: (h) => /Page optimized by LiteSpeed Cache/i.test(h) },
  { slug: "w3-total-cache", test: (h) => /Performance optimized by W3 Total Cache/i.test(h) },
  { slug: "js_composer", test: (h) => generatorMentions(h, "wpbakery") },
];

/** "contact-form-7" -> "Contact Form 7". */
export function humanizeSlug(slug: string): string {
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
    .replace(/\bWp\b/g, "WP")
    .replace(/\bSeo\b/g, "SEO")
    .trim();
}

export function pluginName(slug: string): string {
  return KNOWN_PLUGIN_NAMES[slug] ?? humanizeSlug(slug);
}

/** Characters a URL run cannot contain (the `[^"'\s()<>]` class). */
const URL_STOP = /["'\s()<>]/;

/**
 * Every URL-ish string in the HTML that points into wp-content: the matches of
 * `((?:https?:)?//[^"'\s()<>]+?|)(/wp-content/{kind}/)({slug})/` (case-
 * insensitive), found from each "/wp-content/{kind}/" instead. That regex
 * tried a lazy URL run from every "//", which took seconds on a page of
 * slashes; here each character is looked at a bounded number of times.
 */
function wpContentRefs(html: string, kind: "themes" | "plugins"): Array<{ slug: string; base: string }> {
  const lower = lowerAscii(html);
  const marker = `/wp-content/${kind}/`;
  const out: Array<{ slug: string; base: string }> = [];
  let lastEnd = 0;
  for (let at = lower.indexOf(marker); at !== -1; at = lower.indexOf(marker, at + 1)) {
    if (at < lastEnd) continue;
    SLUG_AT.lastIndex = at + marker.length;
    const slug = SLUG_AT.exec(lower)?.[0].slice(0, -1);
    if (!slug) continue;
    // The URL this path belongs to: back over URL characters (not into the
    // previous match), then the leftmost "//", "http://" or "https://" that
    // leaves at least one character before the path.
    let from = at;
    while (from > lastEnd && !URL_STOP.test(html[from - 1])) from--;
    let start = at;
    for (let s = from; s < at; s++) {
      const scheme = lower.startsWith("https://", s) ? 8 : lower.startsWith("http://", s) ? 7 : lower.startsWith("//", s) ? 2 : 0;
      if (scheme > 0 && s + scheme < at) {
        start = s;
        break;
      }
    }
    out.push({ slug, base: html.slice(start, at + marker.length) });
    lastEnd = at + marker.length + slug.length + 1;
  }
  return out;
}

/**
 * Themes referenced by the page, most referenced first (the active theme
 * usually loads the most assets; a child theme and its parent both appear).
 */
export function detectThemes(html: string, pageUrl: string): Omit<DetectedTheme, "header">[] {
  const counts = new Map<string, { n: number; base: string }>();
  for (const ref of wpContentRefs(capHtml(html), "themes")) {
    const prev = counts.get(ref.slug);
    counts.set(ref.slug, { n: (prev?.n ?? 0) + 1, base: prev?.base ?? ref.base });
  }
  return [...counts]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 3)
    .map(([slug, { base }]) => {
      let stylesheetUrl: string;
      try {
        stylesheetUrl = new URL(`${base}${slug}/style.css`, pageUrl).href;
      } catch {
        stylesheetUrl = new URL(`/wp-content/themes/${slug}/style.css`, pageUrl).href;
      }
      return { slug, stylesheetUrl };
    });
}

export function detectPlugins(fullHtml: string): DetectedPlugin[] {
  const html = capHtml(fullHtml);
  const found = new Map<string, DetectedPlugin>();
  for (const { slug } of wpContentRefs(html, "plugins")) {
    if (!found.has(slug)) found.set(slug, { slug, name: pluginName(slug), evidence: "assets" });
  }
  for (const fp of FINGERPRINTS) {
    if (!found.has(fp.slug) && fp.test(html)) {
      found.set(fp.slug, { slug: fp.slug, name: pluginName(fp.slug), evidence: "fingerprint" });
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function detectWordPressSignals(fullHtml: string): { signals: string[]; version: string | null } {
  const html = capHtml(fullHtml);
  const signals: string[] = [];
  let version: string | null = null;
  for (const { tag } of findTags(html, ["meta"])) {
    if (attr(tag, "name")?.toLowerCase() !== "generator") continue;
    const m = /WordPress\s*([\d.]+)?/i.exec(attr(tag, "content") ?? "");
    if (m) {
      signals.push("WordPress generator tag");
      version = m[1] ?? null;
    }
  }
  if (/\/wp-content\//i.test(html)) signals.push("/wp-content/ asset paths");
  if (/\/wp-includes\//i.test(html)) signals.push("/wp-includes/ scripts");
  if (/\/wp-json\//i.test(html) || /rel=["']https:\/\/api\.w\.org\/["']/i.test(html)) signals.push("WordPress REST API link");
  return { signals, version };
}

/** Parse the comment header at the top of a theme's style.css. */
export function parseThemeHeader(css: string): ThemeHeader | null {
  const head = css.slice(0, 8192);
  const field = (name: string) => {
    const m = new RegExp(`^[\\s*]*${name}\\s*:\\s*(.+)$`, "im").exec(head);
    return m ? m[1].trim().replace(/\s*\*\/.*$/, "") || null : null;
  };
  const header: ThemeHeader = {
    name: field("Theme Name"),
    version: field("Version"),
    author: field("Author"),
    authorUri: field("Author URI"),
    themeUri: field("Theme URI"),
    description: field("Description"),
    template: field("Template"),
  };
  return header.name ? header : null;
}

/** A safe, public link for a theme/plugin slug - only http(s) URIs pass. */
export function safeHttpUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.href : null;
  } catch {
    return null;
  }
}
