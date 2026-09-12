/**
 * Identifying the plugins, themes and core version a page is built on, from
 * nothing but the URLs of the assets it loads.
 *
 * WordPress stamps a version onto everything it enqueues:
 *
 *   /wp-content/plugins/elementor/assets/js/frontend.min.js?ver=3.19.1
 *   /wp-content/themes/astra/style.css?ver=4.6.2
 *
 * Which means MyKavo can tell an agency "Elementor went 3.18.0 → 3.19.1 the
 * day before your /pricing H1 disappeared" without installing anything on the
 * client's site. That is the whole point: the #1 cause of a WordPress site
 * breaking is an update, and every other tool either performs updates without
 * noticing the damage or notices the damage without knowing about the update.
 *
 * Pure and deterministic. No network, no DOM, no AI - just string work over
 * URLs the scanner has already fetched.
 *
 * The hard part is NOT finding versions. It is refusing to report the things
 * that merely look like versions: cache-busting timestamps, build hashes and
 * per-request nonces would each produce a "plugin updated" event on every
 * single scan. False positives are the one failure this product cannot
 * survive, so everything below errs towards reporting nothing.
 */

export type ComponentKind = "core" | "plugin" | "theme";

/**
 * Sub-directories inside a plugin or theme that hold SOMEBODY ELSE'S code.
 *
 * Found the hard way, on a real site: Elementor Pro bundles libraries under
 * /assets/lib/, and their versions (1.2.1, 4.1.2) were being reported as
 * Elementor Pro's own - which is in the 3.x range. Worse, the two tied on
 * asset count, so losing a single asset from a scan would flip the winner and
 * announce "elementor-pro 1.2.1 -> 4.1.2" as an update, over and over.
 *
 * A vendored library's version says nothing about when the plugin was updated,
 * so it is not evidence and must not be treated as any.
 */
const VENDORED_PATH = /\/(?:lib|libs|vendor|vendors|node_modules|third-?party|bower_components)\//i;

export interface PlatformComponent {
  kind: ComponentKind;
  /** Directory slug, e.g. "elementor". Stable identity across versions. */
  slug: string;
  /** Human name for display, e.g. "Elementor" or "Yoast SEO". */
  name: string;
  version: string;
}

export interface PlatformFingerprint {
  /** null when the page shows no sign of a platform we can read. */
  platform: "wordpress" | null;
  /** Sorted by kind then slug, so two fingerprints compare stably. */
  components: PlatformComponent[];
  /** Platform-owned assets seen. Coverage honesty, not decoration. */
  assetsSeen: number;
  /** How many of those yielded a version we were willing to trust. */
  assetsVersioned: number;
  /**
   * Every plugin/theme whose assets were seen, as "kind:slug", whether or not
   * a version could be read. Sorted.
   *
   * Kept separately from `components` so that losing the ability to READ a
   * component's version is never mistaken for the component being switched
   * off - a distinction that matters enormously on a site running WP Rocket.
   */
  present: string[];
}

export const EMPTY_FINGERPRINT: PlatformFingerprint = {
  platform: null,
  components: [],
  assetsSeen: 0,
  assetsVersioned: 0,
  present: [],
};

/**
 * Display names for plugins whose slug is not the name anyone uses. Only
 * cosmetic - the slug is always the identity - but "wordpress-seo" in an alert
 * would make the feature look like it did not know what it had found.
 */
const KNOWN_NAMES: Record<string, string> = {
  "wordpress-seo": "Yoast SEO",
  "seo-by-rank-math": "Rank Math SEO",
  "all-in-one-seo-pack": "All in One SEO",
  "google-site-kit": "Site Kit by Google",
  woocommerce: "WooCommerce",
  "contact-form-7": "Contact Form 7",
  "wpforms-lite": "WPForms",
  "advanced-custom-fields": "Advanced Custom Fields",
  "advanced-custom-fields-pro": "Advanced Custom Fields Pro",
  "wp-rocket": "WP Rocket",
  "litespeed-cache": "LiteSpeed Cache",
  "w3-total-cache": "W3 Total Cache",
  "wp-super-cache": "WP Super Cache",
  autoptimize: "Autoptimize",
  elementor: "Elementor",
  "elementor-pro": "Elementor Pro",
  js_composer: "WPBakery Page Builder",
  "wp-mail-smtp": "WP Mail SMTP",
  wordfence: "Wordfence Security",
  akismet: "Akismet",
  jetpack: "Jetpack",
  updraftplus: "UpdraftPlus",
  "duplicate-post": "Yoast Duplicate Post",
  "wp-smushit": "Smush",
  "ewww-image-optimizer": "EWWW Image Optimizer",
  "really-simple-ssl": "Really Simple SSL",
  "cookie-law-info": "CookieYes",
  "complianz-gdpr": "Complianz",
  "mailchimp-for-wp": "MC4WP: Mailchimp for WordPress",
  "wp-seopress": "SEOPress",
  redirection: "Redirection",
  "wordpress-popular-posts": "WordPress Popular Posts",
  "table-of-contents-plus": "Table of Contents Plus",
  "the-events-calendar": "The Events Calendar",
  "woo-checkout-field-editor-pro": "Checkout Field Editor",
  astra: "Astra",
  "astra-addon": "Astra Pro",
  generatepress: "GeneratePress",
  kadence: "Kadence",
  divi: "Divi",
  "hello-elementor": "Hello Elementor",
  twentytwentyfour: "Twenty Twenty-Four",
  twentytwentyfive: "Twenty Twenty-Five",
};

/** Humanize a slug when we have no better name: "wp-rocket" -> "Wp Rocket". */
function humanize(slug: string): string {
  const known = KNOWN_NAMES[slug];
  if (known) return known;
  return slug
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Is this `ver=` value a real release version, or a cache-buster wearing one's
 * clothes?
 *
 * Rejected, and why each would be actively harmful:
 *  - `1712345678`   a unix timestamp; changes constantly, "updated" forever
 *  - `20240115`     a build date; same problem, once a day
 *  - `a1b2c3...`    a content hash; changes whenever the file does
 *  - `6.4.2-1712345678`  a version with a timestamp welded on
 *
 * Accepted: 1, 1.2, 1.2.3, 1.2.3.4, and suffixes real projects ship
 * (3.19.1-beta2, 2.0.0-rc.1, 1.4.2p3).
 */
export function isTrustworthyVersion(value: string): boolean {
  if (!value) return false;
  if (value.length > 24) return false;

  // Must start with a digit-dot sequence: anything else is a label, not a
  // version ("all", "latest", "master").
  const match = /^(\d+(?:\.\d+){0,3})(.*)$/.exec(value);
  if (!match) return false;
  const [, numeric, suffix] = match;

  // A bare integer of 8+ digits is a date or timestamp, never a version.
  // Real single-number versions ("ver=1", "ver=42") are short.
  if (!numeric.includes(".") && numeric.length >= 8) return false;

  // Any segment long enough to be a timestamp makes the whole value suspect,
  // e.g. "6.4.1712345678".
  if (numeric.split(".").some((seg) => seg.length >= 8)) return false;

  if (suffix === "") return true;

  // Allow conventional pre-release/patch suffixes only. A long hex tail is a
  // build hash and disqualifies the value.
  if (!/^[-+._]?[A-Za-z0-9][A-Za-z0-9.\-+]{0,12}$/.test(suffix)) return false;
  if (/[0-9a-f]{8,}/i.test(suffix)) return false;
  return true;
}

/**
 * Compare two version strings numerically, segment by segment.
 *
 * Missing segments count as zero, so "1.2" and "1.2.0" are EQUAL. That is not
 * pedantry: a plugin that reports `ver=1.2` on one scan and `ver=1.2.0` on the
 * next has not been updated, and callers use `compareVersions(...) === 0` to
 * avoid announcing that it has.
 *
 * A release outranks its own pre-releases (1.0 > 1.0-rc.1), per semver.
 */
export function compareVersions(a: string, b: string): number {
  const parse = (v: string) => {
    const match = /^(\d+(?:\.\d+){0,3})(.*)$/.exec(v);
    return {
      numeric: (match?.[1] ?? "0").split(".").map(Number),
      suffix: match?.[2] ?? "",
    };
  };
  const left = parse(a);
  const right = parse(b);
  for (let i = 0; i < Math.max(left.numeric.length, right.numeric.length); i++) {
    const diff = (left.numeric[i] ?? 0) - (right.numeric[i] ?? 0);
    if (diff !== 0) return diff;
  }
  if (left.suffix === right.suffix) return 0;
  if (left.suffix === "") return 1;
  if (right.suffix === "") return -1;
  return left.suffix.localeCompare(right.suffix);
}

interface Candidate {
  kind: ComponentKind;
  slug: string;
  version: string;
}

/**
 * Read one asset URL. Returns null when the URL is not a platform asset, or is
 * one whose version we do not trust.
 */
function readAsset(
  url: string,
  counters: { seen: number; versioned: number; present: Set<string> },
): Candidate | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }

  const path = parsed.pathname;
  const plugin = /\/wp-content\/(?:mu-)?plugins\/([^/]+)\//.exec(path);
  const theme = /\/wp-content\/themes\/([^/]+)\//.exec(path);
  const core = path.includes("/wp-includes/");
  if (!plugin && !theme && !core) return null;

  counters.seen++;
  const match = plugin ?? theme;
  if (match) {
    // Record that this component's assets are loading, even if we end up
    // unable to read a version for it. "Present but unreadable" and "gone"
    // are different facts, and only the second is worth an alert.
    counters.present.add(
      `${plugin ? "plugin" : "theme"}:${decodeURIComponent(match[1])}`,
    );
  }

  // Everything after the component's own directory. A version living in there
  // belongs to a bundled library, not to the plugin or theme.
  if (match && VENDORED_PATH.test(path.slice(match.index + match[0].length - 1))) {
    return null;
  }

  const ver = parsed.searchParams.get("ver");
  if (!ver || !isTrustworthyVersion(ver)) return null;
  counters.versioned++;

  if (plugin) return { kind: "plugin", slug: decodeURIComponent(plugin[1]), version: ver };
  if (theme) return { kind: "theme", slug: decodeURIComponent(theme[1]), version: ver };

  // /wp-includes/ assets normally carry the WordPress core version - but not
  // jquery, which carries its own and would otherwise be reported as the core
  // version of every WordPress site on earth.
  if (/\/jquery/i.test(path)) return null;
  return { kind: "core", slug: "wordpress", version: ver };
}

/**
 * Pick one version per component. A page can legitimately load two versions of
 * the same plugin's assets (a bundled dependency, a stale cached file); the
 * most frequently seen wins, and the highest version breaks a tie, so the
 * answer never depends on the order assets happened to appear in the HTML.
 */
function resolve(candidates: Candidate[]): PlatformComponent[] {
  const byComponent = new Map<string, Map<string, number>>();
  const kinds = new Map<string, ComponentKind>();

  for (const c of candidates) {
    const id = `${c.kind}:${c.slug}`;
    kinds.set(id, c.kind);
    const counts = byComponent.get(id) ?? new Map<string, number>();
    counts.set(c.version, (counts.get(c.version) ?? 0) + 1);
    byComponent.set(id, counts);
  }

  const components: PlatformComponent[] = [];
  for (const [id, counts] of byComponent) {
    const version = [...counts.entries()].sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return compareVersions(b[0], a[0]);
    })[0][0];
    const slug = id.slice(id.indexOf(":") + 1);
    const kind = kinds.get(id) as ComponentKind;
    components.push({ kind, slug, name: humanize(slug), version });
  }

  const kindOrder: Record<ComponentKind, number> = { core: 0, theme: 1, plugin: 2 };
  return components.sort(
    (a, b) => kindOrder[a.kind] - kindOrder[b.kind] || a.slug.localeCompare(b.slug),
  );
}

/** Pull "WordPress 6.4.2" out of a generator meta tag. */
function coreFromGenerator(generator: string | null | undefined): string | null {
  if (!generator) return null;
  const match = /^\s*WordPress\s+([\w.\-+]+)/i.exec(generator);
  if (!match) return null;
  return isTrustworthyVersion(match[1]) ? match[1] : null;
}

/**
 * Build a fingerprint from the asset URLs of one page.
 *
 * `assetUrls` should be every script src and stylesheet href on the page;
 * non-platform URLs are ignored, so passing extras is harmless.
 */
export function fingerprintPlatform(input: {
  assetUrls: readonly string[];
  /** Contents of <meta name="generator">, if the page has one. */
  generator?: string | null;
}): PlatformFingerprint {
  const counters = { seen: 0, versioned: 0, present: new Set<string>() };
  const candidates: Candidate[] = [];
  for (const url of input.assetUrls) {
    const candidate = readAsset(url, counters);
    if (candidate) candidates.push(candidate);
  }

  const generatorCore = coreFromGenerator(input.generator);
  const components = resolve(candidates);

  if (generatorCore) {
    // The generator tag is WordPress stating its own version outright, so it
    // outranks anything inferred from asset paths.
    const existing = components.find((c) => c.kind === "core");
    if (existing) existing.version = generatorCore;
    else
      components.unshift({
        kind: "core",
        slug: "wordpress",
        name: "WordPress",
        version: generatorCore,
      });
  }
  for (const c of components) if (c.kind === "core") c.name = "WordPress";

  const isWordPress =
    components.length > 0 || counters.seen > 0 || generatorCore !== null;

  return {
    platform: isWordPress ? "wordpress" : null,
    components,
    assetsSeen: counters.seen,
    assetsVersioned: counters.versioned,
    present: [...counters.present].sort(),
  };
}

/** The theme a fingerprint is using, if it could be determined. */
export function activeTheme(fp: PlatformFingerprint): PlatformComponent | null {
  return fp.components.find((c) => c.kind === "theme") ?? null;
}

/**
 * Read a fingerprint back out of storage.
 *
 * The JSON came from `fingerprintPlatform`, but snapshots outlive code: rows
 * written by an older shape, or a hand-edited row, must not be able to crash a
 * comparison. Anything unrecognised returns null, which every consumer already
 * treats as "we do not know" rather than "nothing is installed".
 */
export function parseFingerprint(value: unknown): PlatformFingerprint | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  if (raw.platform !== "wordpress" && raw.platform !== null) return null;
  if (!Array.isArray(raw.components)) return null;

  const components: PlatformComponent[] = [];
  for (const entry of raw.components) {
    if (typeof entry !== "object" || entry === null) return null;
    const c = entry as Record<string, unknown>;
    if (c.kind !== "core" && c.kind !== "plugin" && c.kind !== "theme") return null;
    if (typeof c.slug !== "string" || typeof c.version !== "string") return null;
    components.push({
      kind: c.kind,
      slug: c.slug,
      name: typeof c.name === "string" ? c.name : humanize(c.slug),
      version: c.version,
    });
  }

  // Rows written before `present` existed fall back to the components they
  // did record. That is the conservative reading: it can only suppress an
  // event, never invent one.
  const present = Array.isArray(raw.present)
    ? raw.present.filter((p): p is string => typeof p === "string").sort()
    : components.filter((c) => c.kind !== "core").map((c) => `${c.kind}:${c.slug}`).sort();

  return {
    platform: raw.platform,
    components,
    assetsSeen: typeof raw.assetsSeen === "number" ? raw.assetsSeen : components.length,
    assetsVersioned:
      typeof raw.assetsVersioned === "number" ? raw.assetsVersioned : components.length,
    present,
  };
}
