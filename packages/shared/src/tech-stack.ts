/**
 * What is this website built with?
 *
 * The WordPress fingerprinter answers "which plugin version changed". This
 * answers the broader question every agency asks first: what CMS, framework,
 * host, analytics, payment and support tools is this site running?
 *
 * Deterministic and offline. Every detection is a literal pattern against
 * evidence the scanner already collects - asset URLs, generator tags, response
 * headers, a fixed list of JavaScript globals and a fixed list of DOM markers.
 * No external API, no fingerprint database to license, no AI.
 *
 * The rule table is curated rather than exhaustive on purpose. A loose pattern
 * that reports Stripe on a site with no payments is worse than reporting
 * nothing: the whole value of this panel is that a user can trust what it says
 * without going to check.
 */

export type TechCategory =
  | "cms"
  | "framework"
  | "ecommerce"
  | "hosting"
  | "cdn"
  | "analytics"
  | "tag-manager"
  | "marketing"
  | "payments"
  | "support"
  | "security"
  | "consent"
  | "monitoring"
  | "fonts"
  | "plugin"
  | "theme";

/** Display order for the panel: what the site IS, before what it uses. */
export const CATEGORY_ORDER: readonly TechCategory[] = [
  "cms",
  "framework",
  "ecommerce",
  "hosting",
  "cdn",
  "tag-manager",
  "analytics",
  "marketing",
  "payments",
  "support",
  "monitoring",
  "security",
  "consent",
  "fonts",
  "theme",
  "plugin",
];

export const CATEGORY_LABEL: Record<TechCategory, string> = {
  cms: "Platform",
  framework: "Framework",
  ecommerce: "E-commerce",
  hosting: "Hosting",
  cdn: "CDN",
  analytics: "Analytics",
  "tag-manager": "Tag manager",
  marketing: "Marketing",
  payments: "Payments",
  support: "Support & chat",
  security: "Security",
  consent: "Consent",
  monitoring: "Monitoring",
  fonts: "Fonts",
  plugin: "Plugin",
  theme: "Theme",
};

export interface TechEntry {
  slug: string;
  name: string;
  category: TechCategory;
  /** Known version, when the site states one. Usually null. */
  version: string | null;
  /** Which signal matched. Shown to the user, so it must be readable. */
  evidence: string;
}

interface Rule {
  slug: string;
  name: string;
  category: TechCategory;
  /** Asset URL patterns (matched against the full URL). */
  urls?: RegExp[];
  /** Generator meta patterns. Capture group 1, when present, is the version. */
  generators?: RegExp[];
  /** Exact `window` property names. */
  globals?: string[];
  /** CSS selectors whose presence identifies the technology. */
  selectors?: string[];
  /** Response header name, optionally with a value pattern. */
  headers?: Array<{ name: string; pattern?: RegExp }>;
}

/**
 * The rule table.
 *
 * Ordered by category for readability only - detection order does not matter
 * because every rule is independent.
 */
const RULES: readonly Rule[] = [
  // ---- CMS and site builders ------------------------------------------
  {
    slug: "wordpress",
    name: "WordPress",
    category: "cms",
    urls: [/\/wp-content\//, /\/wp-includes\//],
    generators: [/^\s*WordPress\s+([\w.\-+]+)/i],
    globals: ["wp"],
  },
  {
    slug: "shopify",
    name: "Shopify",
    category: "cms",
    urls: [/cdn\.shopify\.com/, /cdn\.shopifycloud\.com/],
    globals: ["Shopify"],
    headers: [{ name: "x-shopid" }, { name: "x-shopify-stage" }],
  },
  {
    slug: "webflow",
    name: "Webflow",
    category: "cms",
    urls: [/assets\.website-files\.com/, /cdn\.prod\.website-files\.com/],
    generators: [/^\s*Webflow/i],
    selectors: ["html[data-wf-page]"],
  },
  {
    slug: "wix",
    name: "Wix",
    category: "cms",
    urls: [/static\.parastorage\.com/],
    generators: [/^\s*Wix\.com Website Builder/i],
  },
  {
    slug: "squarespace",
    name: "Squarespace",
    category: "cms",
    urls: [/static1\.squarespace\.com/, /assets\.squarespace\.com/],
    generators: [/^\s*Squarespace/i],
  },
  {
    slug: "drupal",
    name: "Drupal",
    category: "cms",
    generators: [/^\s*Drupal\s*([\w.]+)?/i],
    globals: ["Drupal"],
  },
  {
    slug: "joomla",
    name: "Joomla",
    category: "cms",
    generators: [/^\s*Joomla!?\s*-?\s*([\w.]+)?/i],
  },
  { slug: "ghost", name: "Ghost", category: "cms", generators: [/^\s*Ghost\s*([\w.]+)?/i] },
  {
    slug: "framer",
    name: "Framer",
    category: "cms",
    urls: [/framerusercontent\.com/],
    generators: [/^\s*Framer/i],
  },

  // ---- Frameworks -------------------------------------------------------
  {
    slug: "nextjs",
    name: "Next.js",
    category: "framework",
    urls: [/\/_next\/static\//],
    globals: ["__NEXT_DATA__"],
    selectors: ["#__next"],
    headers: [{ name: "x-powered-by", pattern: /next\.js/i }],
  },
  {
    slug: "nuxt",
    name: "Nuxt",
    category: "framework",
    urls: [/\/_nuxt\//],
    globals: ["__NUXT__"],
    selectors: ["#__nuxt"],
  },
  {
    slug: "gatsby",
    name: "Gatsby",
    category: "framework",
    urls: [/\/page-data\//],
    generators: [/^\s*Gatsby\s*([\w.]+)?/i],
    selectors: ["#___gatsby"],
  },
  { slug: "remix", name: "Remix", category: "framework", globals: ["__remixContext"] },
  { slug: "sveltekit", name: "SvelteKit", category: "framework", urls: [/\/_app\/immutable\//] },
  { slug: "angular", name: "Angular", category: "framework", selectors: ["[ng-version]"] },
  { slug: "astro", name: "Astro", category: "framework", generators: [/^\s*Astro\s*v?([\w.]+)?/i] },
  { slug: "hugo", name: "Hugo", category: "framework", generators: [/^\s*Hugo\s*([\w.]+)?/i] },
  { slug: "jekyll", name: "Jekyll", category: "framework", generators: [/^\s*Jekyll\s*v?([\w.]+)?/i] },
  { slug: "vue", name: "Vue", category: "framework", globals: ["__VUE__"] },
  { slug: "react", name: "React", category: "framework", globals: ["__REACT_DEVTOOLS_GLOBAL_HOOK__"] },
  { slug: "jquery", name: "jQuery", category: "framework", globals: ["jQuery"] },

  // ---- E-commerce -------------------------------------------------------
  {
    slug: "woocommerce",
    name: "WooCommerce",
    category: "ecommerce",
    urls: [/\/plugins\/woocommerce\//],
    generators: [/^\s*WooCommerce\s+([\w.\-+]+)/i],
  },
  { slug: "snipcart", name: "Snipcart", category: "ecommerce", urls: [/cdn\.snipcart\.com/] },

  // ---- Hosting and CDN --------------------------------------------------
  { slug: "vercel", name: "Vercel", category: "hosting", headers: [{ name: "x-vercel-id" }] },
  { slug: "netlify", name: "Netlify", category: "hosting", headers: [{ name: "x-nf-request-id" }] },
  {
    slug: "cloudflare",
    name: "Cloudflare",
    category: "cdn",
    headers: [{ name: "cf-ray" }, { name: "server", pattern: /^cloudflare/i }],
  },
  { slug: "cloudfront", name: "AWS CloudFront", category: "cdn", headers: [{ name: "x-amz-cf-id" }] },
  { slug: "fastly", name: "Fastly", category: "cdn", headers: [{ name: "x-fastly-request-id" }] },

  // ---- Tag managers and analytics --------------------------------------
  {
    slug: "google-tag-manager",
    name: "Google Tag Manager",
    category: "tag-manager",
    urls: [/googletagmanager\.com\/gtm\.js/],
  },
  {
    slug: "google-analytics",
    name: "Google Analytics",
    category: "analytics",
    urls: [/googletagmanager\.com\/gtag\/js/, /google-analytics\.com\/analytics\.js/],
  },
  { slug: "plausible", name: "Plausible", category: "analytics", urls: [/plausible\.io\/js\//] },
  { slug: "fathom", name: "Fathom Analytics", category: "analytics", urls: [/cdn\.usefathom\.com/] },
  { slug: "matomo", name: "Matomo", category: "analytics", urls: [/matomo\.js/, /piwik\.js/] },
  { slug: "clarity", name: "Microsoft Clarity", category: "analytics", urls: [/clarity\.ms/] },
  { slug: "hotjar", name: "Hotjar", category: "analytics", urls: [/static\.hotjar\.com/] },
  { slug: "mixpanel", name: "Mixpanel", category: "analytics", urls: [/cdn\.mxpnl\.com/] },
  { slug: "amplitude", name: "Amplitude", category: "analytics", urls: [/cdn\.amplitude\.com/] },
  { slug: "segment", name: "Segment", category: "analytics", urls: [/cdn\.segment\.com/] },
  { slug: "posthog", name: "PostHog", category: "analytics", urls: [/posthog\.com\/static\//] },

  // ---- Marketing --------------------------------------------------------
  { slug: "meta-pixel", name: "Meta Pixel", category: "marketing", urls: [/connect\.facebook\.net/] },
  { slug: "google-ads", name: "Google Ads", category: "marketing", urls: [/googleadservices\.com/] },
  { slug: "linkedin-insight", name: "LinkedIn Insight Tag", category: "marketing", urls: [/snap\.licdn\.com/] },
  { slug: "tiktok-pixel", name: "TikTok Pixel", category: "marketing", urls: [/analytics\.tiktok\.com/] },
  { slug: "pinterest-tag", name: "Pinterest Tag", category: "marketing", urls: [/s\.pinimg\.com\/ct\//] },
  { slug: "x-pixel", name: "X (Twitter) Pixel", category: "marketing", urls: [/static\.ads-twitter\.com/] },
  { slug: "klaviyo", name: "Klaviyo", category: "marketing", urls: [/static\.klaviyo\.com/] },
  { slug: "mailchimp", name: "Mailchimp", category: "marketing", urls: [/chimpstatic\.com/] },
  {
    slug: "hubspot",
    name: "HubSpot",
    category: "marketing",
    urls: [/js\.hs-scripts\.com/, /js\.hsforms\.net/, /js\.hs-analytics\.net/],
  },

  // ---- Payments ---------------------------------------------------------
  { slug: "stripe", name: "Stripe", category: "payments", urls: [/js\.stripe\.com/] },
  { slug: "paypal", name: "PayPal", category: "payments", urls: [/paypal\.com\/sdk\/js/, /paypalobjects\.com/] },
  { slug: "razorpay", name: "Razorpay", category: "payments", urls: [/checkout\.razorpay\.com/] },

  // ---- Support and chat -------------------------------------------------
  { slug: "intercom", name: "Intercom", category: "support", urls: [/widget\.intercom\.io/, /js\.intercomcdn\.com/] },
  { slug: "crisp", name: "Crisp", category: "support", urls: [/client\.crisp\.chat/] },
  { slug: "drift", name: "Drift", category: "support", urls: [/js\.driftt\.com/] },
  { slug: "tawk", name: "Tawk.to", category: "support", urls: [/embed\.tawk\.to/] },
  { slug: "zendesk", name: "Zendesk", category: "support", urls: [/static\.zdassets\.com/] },
  { slug: "freshchat", name: "Freshchat", category: "support", urls: [/wchat\.freshchat\.com/] },

  // ---- Monitoring -------------------------------------------------------
  { slug: "sentry", name: "Sentry", category: "monitoring", urls: [/browser\.sentry-cdn\.com/], globals: ["Sentry"] },
  { slug: "logrocket", name: "LogRocket", category: "monitoring", urls: [/cdn\.logrocket\.io/] },

  // ---- Security ---------------------------------------------------------
  { slug: "recaptcha", name: "reCAPTCHA", category: "security", urls: [/www\.google\.com\/recaptcha\//, /recaptcha\.net/] },
  { slug: "turnstile", name: "Cloudflare Turnstile", category: "security", urls: [/challenges\.cloudflare\.com/] },
  { slug: "hcaptcha", name: "hCaptcha", category: "security", urls: [/hcaptcha\.com\/1\/api\.js/] },

  // ---- Consent ----------------------------------------------------------
  { slug: "cookiebot", name: "Cookiebot", category: "consent", urls: [/consent\.cookiebot\.com/] },
  { slug: "onetrust", name: "OneTrust", category: "consent", urls: [/cdn\.cookielaw\.org/] },
  { slug: "cookieyes", name: "CookieYes", category: "consent", urls: [/cdn-cookieyes\.com/] },

  // ---- Fonts ------------------------------------------------------------
  { slug: "google-fonts", name: "Google Fonts", category: "fonts", urls: [/fonts\.googleapis\.com/, /fonts\.gstatic\.com/] },
  { slug: "adobe-fonts", name: "Adobe Fonts", category: "fonts", urls: [/use\.typekit\.net/] },
  { slug: "font-awesome", name: "Font Awesome", category: "fonts", urls: [/kit\.fontawesome\.com/, /use\.fontawesome\.com/] },
];

/**
 * Globals the scanner should look for. Exported so the in-page probe checks
 * EXACTLY these and the two lists cannot drift apart - a global nobody probes
 * for is a rule that silently never fires.
 */
export const PROBED_GLOBALS: readonly string[] = [
  ...new Set(RULES.flatMap((r) => r.globals ?? [])),
];

/** Selectors the scanner should test in-page. Same reasoning as above. */
export const PROBED_SELECTORS: readonly string[] = [
  ...new Set(RULES.flatMap((r) => r.selectors ?? [])),
];

export interface TechInput {
  /** Every script src and stylesheet href on the page. */
  assetUrls?: readonly string[];
  /** Contents of every <meta name="generator">. */
  generators?: readonly string[];
  /** Names from PROBED_GLOBALS that were actually present on `window`. */
  globals?: readonly string[];
  /** Selectors from PROBED_SELECTORS that actually matched. */
  selectors?: readonly string[];
  /** Response headers, keys lowercased. */
  headers?: Readonly<Record<string, string>>;
}

/** True when `value` is a version we are willing to print next to a name. */
function usableVersion(value: string | undefined): value is string {
  if (!value) return false;
  // Same spirit as the platform fingerprinter: a build stamp is not a version.
  if (!/^\d/.test(value)) return false;
  if (/^\d{8,}$/.test(value)) return false;
  return value.length <= 24;
}

/**
 * Identify the technologies behind one page.
 *
 * Returns at most one entry per technology, in category order then by name, so
 * two scans of an unchanged page produce an identical list.
 */
export function detectTechnologies(input: TechInput): TechEntry[] {
  const assets = input.assetUrls ?? [];
  const generators = input.generators ?? [];
  const globals = new Set(input.globals ?? []);
  const selectors = new Set(input.selectors ?? []);
  const headers = input.headers ?? {};

  const found: TechEntry[] = [];

  for (const rule of RULES) {
    let evidence: string | null = null;
    let version: string | null = null;

    // Generator tags first: they can carry a version, and a site declaring
    // itself outright beats anything inferred from a URL.
    for (const pattern of rule.generators ?? []) {
      const hit = generators.map((g) => pattern.exec(g)).find(Boolean);
      if (!hit) continue;
      evidence = "generator tag";
      if (usableVersion(hit[1])) version = hit[1];
      break;
    }

    if (!evidence) {
      for (const pattern of rule.urls ?? []) {
        const hit = assets.find((url) => pattern.test(url));
        if (!hit) continue;
        evidence = `asset: ${hostOrPath(hit)}`;
        break;
      }
    }

    if (!evidence) {
      const global = (rule.globals ?? []).find((g) => globals.has(g));
      if (global) evidence = `window.${global}`;
    }

    if (!evidence) {
      const selector = (rule.selectors ?? []).find((s) => selectors.has(s));
      if (selector) evidence = `element ${selector}`;
    }

    if (!evidence) {
      for (const header of rule.headers ?? []) {
        const value = headers[header.name];
        if (value === undefined) continue;
        if (header.pattern && !header.pattern.test(value)) continue;
        evidence = `header ${header.name}`;
        break;
      }
    }

    if (evidence) {
      found.push({
        slug: rule.slug,
        name: rule.name,
        category: rule.category,
        version,
        evidence,
      });
    }
  }

  return sortTech(found);
}

/** Readable evidence: the host for a third-party URL, the path for a first-party one. */
function hostOrPath(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return url.slice(0, 60);
  }
}

export function sortTech(entries: readonly TechEntry[]): TechEntry[] {
  return [...entries].sort((a, b) => {
    const byCategory =
      CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    if (byCategory !== 0) return byCategory;
    return a.name.localeCompare(b.name);
  });
}

/**
 * Merge the technologies seen across several pages of one site.
 *
 * Plugins and tools are loaded per page - a payment script only on /checkout,
 * a chat widget only on /contact - so a site's stack is the union of its
 * pages', never any single page's.
 */
export function mergeTechnologies(pages: ReadonlyArray<readonly TechEntry[]>): TechEntry[] {
  const bySlug = new Map<string, TechEntry>();
  for (const page of pages) {
    for (const entry of page) {
      const existing = bySlug.get(entry.slug);
      // Prefer the observation that carries a version, then the first seen.
      if (!existing || (!existing.version && entry.version)) bySlug.set(entry.slug, entry);
    }
  }
  return sortTech([...bySlug.values()]);
}

/** Parse technologies back out of storage, discarding anything malformed. */
export function parseTechnologies(value: unknown): TechEntry[] {
  if (!Array.isArray(value)) return [];
  const entries: TechEntry[] = [];
  for (const raw of value) {
    if (typeof raw !== "object" || raw === null) continue;
    const e = raw as Record<string, unknown>;
    if (typeof e.slug !== "string" || typeof e.name !== "string") continue;
    if (typeof e.category !== "string") continue;
    if (!CATEGORY_ORDER.includes(e.category as TechCategory)) continue;
    entries.push({
      slug: e.slug,
      name: e.name,
      category: e.category as TechCategory,
      version: typeof e.version === "string" ? e.version : null,
      evidence: typeof e.evidence === "string" ? e.evidence : "",
    });
  }
  return sortTech(entries);
}
