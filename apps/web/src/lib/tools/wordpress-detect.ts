import { attr } from "./html";

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
 */

const SLUG = "[a-z0-9][a-z0-9._-]{0,80}";

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

/** Plugins that identify themselves in markup even without an asset path. */
const FINGERPRINTS: Array<{ slug: string; test: RegExp }> = [
  { slug: "wordpress-seo", test: /This site is optimized with the Yoast SEO/i },
  { slug: "seo-by-rank-math", test: /Search Engine Optimization by Rank Math/i },
  { slug: "all-in-one-seo-pack", test: /All in One SEO( Pro)? \d/i },
  { slug: "woocommerce", test: /<meta[^>]+name=["']generator["'][^>]+WooCommerce/i },
  { slug: "elementor", test: /<meta[^>]+name=["']generator["'][^>]+Elementor/i },
  { slug: "wp-rocket", test: /This website is like a Rocket/i },
  { slug: "litespeed-cache", test: /Page optimized by LiteSpeed Cache/i },
  { slug: "w3-total-cache", test: /Performance optimized by W3 Total Cache/i },
  { slug: "js_composer", test: /<meta[^>]+name=["']generator["'][^>]+WPBakery/i },
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

/** Every URL-ish string in the HTML that points into wp-content. */
function wpContentRefs(html: string, kind: "themes" | "plugins"): Array<{ slug: string; base: string }> {
  const re = new RegExp(`((?:https?:)?//[^"'\\s()<>]+?|)(/wp-content/${kind}/)(${SLUG})/`, "gi");
  const out: Array<{ slug: string; base: string }> = [];
  for (const m of html.matchAll(re)) {
    out.push({ slug: m[3].toLowerCase(), base: `${m[1]}${m[2]}` });
  }
  return out;
}

/**
 * Themes referenced by the page, most referenced first (the active theme
 * usually loads the most assets; a child theme and its parent both appear).
 */
export function detectThemes(html: string, pageUrl: string): Omit<DetectedTheme, "header">[] {
  const counts = new Map<string, { n: number; base: string }>();
  for (const ref of wpContentRefs(html, "themes")) {
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

export function detectPlugins(html: string): DetectedPlugin[] {
  const found = new Map<string, DetectedPlugin>();
  for (const { slug } of wpContentRefs(html, "plugins")) {
    if (!found.has(slug)) found.set(slug, { slug, name: pluginName(slug), evidence: "assets" });
  }
  for (const fp of FINGERPRINTS) {
    if (!found.has(fp.slug) && fp.test.test(html)) {
      found.set(fp.slug, { slug: fp.slug, name: pluginName(fp.slug), evidence: "fingerprint" });
    }
  }
  return [...found.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function detectWordPressSignals(html: string): { signals: string[]; version: string | null } {
  const signals: string[] = [];
  let version: string | null = null;
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
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
