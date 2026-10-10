import { attr } from "./html";

/**
 * Analytics tag detection from a page's delivered HTML.
 *
 * What this can see: tags written into the HTML the server sends, either as a
 * <script src> URL, an inline snippet (gtag config, fbq init, ttq.load...) or
 * a <noscript> fallback pixel. What it cannot see: tags a tag manager or a
 * consent banner injects at runtime, after the page loads. A GA4 tag that
 * lives only inside a GTM container never appears in the HTML, and the page
 * says so instead of reporting "no GA4".
 *
 * The service list here is ID-oriented (it reads measurement IDs and pixel
 * IDs), which is why it is separate from @mykavo/shared/script-services, which
 * maps a script URL to a service name for change detection.
 */

export type TagLocation = "script src" | "inline script" | "noscript" | "script attribute";

export type TagCategory = "analytics" | "tag manager" | "advertising" | "session recording";

export interface FoundTagId {
  id: string;
  locations: TagLocation[];
}

export interface AnalyticsTag {
  key: VendorKey;
  name: string;
  category: TagCategory;
  /** IDs read from the page, each with where it was found. */
  ids: FoundTagId[];
  /** Every place the tag showed up, including ID-less library loads. */
  locations: TagLocation[];
}

export interface AnalyticsWarning {
  level: "warning" | "notice";
  text: string;
}

export interface AnalyticsTagsResult {
  tags: AnalyticsTag[];
  /** A Google consent mode `default` command is in the inline HTML. */
  consentModeDefault: boolean;
  warnings: AnalyticsWarning[];
}

export interface AnalyticsReport extends AnalyticsTagsResult {
  url: string;
  finalUrl: string;
  httpStatus: number;
}

export type VendorKey =
  | "ga4"
  | "google-tag"
  | "ua"
  | "gtm"
  | "google-ads"
  | "meta-pixel"
  | "linkedin"
  | "tiktok"
  | "clarity"
  | "hotjar"
  | "plausible"
  | "fathom"
  | "matomo"
  | "segment"
  | "mixpanel"
  | "amplitude"
  | "posthog";

interface VendorRule {
  key: VendorKey;
  name: string;
  category: TagCategory;
  /** Tested against each <script src>. Capture group 1, when present, is an ID. */
  src?: RegExp[];
  /** Run (globally) over each inline <script> body. Group 1, when present, is an ID. */
  inline?: RegExp[];
  /** Run (globally) over each <noscript> body. Group 1, when present, is an ID. */
  noscript?: RegExp[];
  /** A <script> attribute that carries the ID, read when a src rule matched. */
  idAttribute?: string;
}

const GA4_ID = "G-[A-Z0-9]{4,14}";
const UA_ID = "UA-\\d{4,10}-\\d{1,4}";
const GTM_ID = "GTM-[A-Z0-9]{4,10}";
const ADS_ID = "AW-\\d{6,12}";
const GT_ID = "GT-[A-Z0-9]{4,14}";

const re = (source: string, flags = "g") => new RegExp(source, flags);

/** Order is display order: Google first, then ads pixels, then the rest. */
const VENDORS: readonly VendorRule[] = [
  {
    key: "ga4",
    name: "Google Analytics 4",
    category: "analytics",
    src: [re(`googletagmanager\\.com/gtag/js\\?(?:[^"'\\s]*&)?id=(${GA4_ID})`, "")],
    inline: [
      re(`gtag\\(\\s*['"]config['"]\\s*,\\s*['"](${GA4_ID})['"]`),
      re(`gtag/js\\?(?:[^"'\\s]*&)?id=(${GA4_ID})`),
    ],
  },
  {
    key: "google-tag",
    name: "Google tag (GT- ID)",
    category: "analytics",
    src: [re(`googletagmanager\\.com/gtag/js\\?(?:[^"'\\s]*&)?id=(${GT_ID})`, "")],
    inline: [re(`gtag\\(\\s*['"]config['"]\\s*,\\s*['"](${GT_ID})['"]`)],
  },
  {
    key: "ua",
    name: "Universal Analytics (retired)",
    category: "analytics",
    src: [
      re(`googletagmanager\\.com/gtag/js\\?(?:[^"'\\s]*&)?id=(${UA_ID})`, ""),
      /google-analytics\.com\/(?:analytics|ga)\.js/,
    ],
    inline: [re(`['"](${UA_ID})['"]`), /google-analytics\.com\/(?:analytics|ga)\.js/g],
  },
  {
    key: "gtm",
    name: "Google Tag Manager",
    category: "tag manager",
    src: [re(`googletagmanager\\.com/gtm\\.js\\?(?:[^"'\\s]*&)?id=(${GTM_ID})`, "")],
    inline: [re(`['"](${GTM_ID})['"]`)],
    noscript: [re(`googletagmanager\\.com/ns\\.html\\?(?:[^"'\\s]*&)?id=(${GTM_ID})`)],
  },
  {
    key: "google-ads",
    name: "Google Ads",
    category: "advertising",
    src: [re(`googletagmanager\\.com/gtag/js\\?(?:[^"'\\s]*&)?id=(${ADS_ID})`, "")],
    inline: [re(`['"](${ADS_ID})(?:/[^'"]*)?['"]`)],
  },
  {
    key: "meta-pixel",
    name: "Meta Pixel",
    category: "advertising",
    src: [/connect\.facebook\.net\/[^/]+\/fbevents\.js/],
    inline: [/fbq\(\s*['"]init['"]\s*,\s*['"]?(\d{5,20})/g, /connect\.facebook\.net\/[^/'"]+\/fbevents\.js/g],
    noscript: [/facebook\.com\/tr\/?\?(?:[^"'\s]*&(?:amp;)?)?id=(\d{5,20})/g],
  },
  {
    key: "linkedin",
    name: "LinkedIn Insight Tag",
    category: "advertising",
    src: [/snap\.licdn\.com\/li\.lms-analytics\/insight(?:\.min)?\.js/],
    inline: [/_linkedin_partner_id\s*=\s*["']?(\d{3,12})/g, /snap\.licdn\.com\/li\.lms-analytics/g],
    noscript: [/px\.ads\.linkedin\.com\/collect\/?\?(?:[^"'\s]*&(?:amp;)?)?pid=(\d{3,12})/g],
  },
  {
    key: "tiktok",
    name: "TikTok Pixel",
    category: "advertising",
    src: [/analytics\.tiktok\.com\/i18n\/pixel\/events\.js(?:\?(?:[^"'\s]*&)?sdkid=([A-Z0-9]{10,30}))?/],
    inline: [/ttq\.load\(\s*['"]([A-Z0-9]{10,30})['"]/g, /analytics\.tiktok\.com\/i18n\/pixel/g],
  },
  {
    key: "clarity",
    name: "Microsoft Clarity",
    category: "session recording",
    src: [/clarity\.ms\/tag\/([a-z0-9]{6,20})/],
    inline: [/["']clarity["']\s*,\s*["']script["']\s*,\s*["']([a-z0-9]{6,20})["']/g],
  },
  {
    key: "hotjar",
    name: "Hotjar",
    category: "session recording",
    src: [/static\.hotjar\.com\/c\/hotjar-(\d{4,12})\.js/],
    inline: [/hjid\s*:\s*(\d{4,12})/g, /static\.hotjar\.com/g],
  },
  {
    key: "plausible",
    name: "Plausible",
    category: "analytics",
    src: [/plausible\.io\/js\/pa-([A-Za-z0-9_-]{6,40})\.js/, /plausible\.io\/js\//, /\/plausible(?:\.[a-z-]+)*\.js(?:$|\?)/],
    idAttribute: "data-domain",
  },
  {
    key: "fathom",
    name: "Fathom Analytics",
    category: "analytics",
    src: [/cdn\.usefathom\.com\/script\.js/],
    idAttribute: "data-site",
  },
  {
    key: "matomo",
    name: "Matomo",
    category: "analytics",
    src: [/\/(?:matomo|piwik)\.js(?:$|\?)/],
    inline: [/_paq\.push\(\s*\[\s*['"]setSiteId['"]\s*,\s*['"]?(\d{1,8})/g, /\/(?:matomo|piwik)\.(?:js|php)/g],
  },
  {
    key: "segment",
    name: "Segment",
    category: "analytics",
    src: [/cdn\.segment\.(?:com|io)\/analytics\.js\/v1\/([A-Za-z0-9]{10,64})\//],
    inline: [/analytics\.load\(\s*["']([A-Za-z0-9]{10,64})["']/g, /_writeKey\s*=\s*["']([A-Za-z0-9]{10,64})["']/g],
  },
  {
    key: "mixpanel",
    name: "Mixpanel",
    category: "analytics",
    src: [/cdn4?\.mxpnl\.com|cdn\.mixpanel\.com/],
    inline: [/mixpanel\.init\(\s*["']([a-f0-9]{32})["']/g],
  },
  {
    key: "amplitude",
    name: "Amplitude",
    category: "analytics",
    src: [/cdn\.amplitude\.com/],
    inline: [/amplitude(?:\.getInstance\(\))?\.init\(\s*["']([a-f0-9]{32})["']/g],
  },
  {
    key: "posthog",
    name: "PostHog",
    category: "analytics",
    src: [/posthog\.com\/static\/array(?:\.full)?\.js|cdn\.posthog\.com/],
    inline: [/posthog\.init\(\s*["'](phc_[A-Za-z0-9]{20,64})["']/g],
  },
];

const GOOGLE_KEYS: ReadonlySet<VendorKey> = new Set(["ga4", "google-tag", "ua", "gtm", "google-ads"]);

interface ScriptBlock {
  tag: string;
  src: string | null;
  body: string;
}

function scriptBlocks(html: string): ScriptBlock[] {
  const out: ScriptBlock[] = [];
  for (const m of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const tag = `<script${m[1]}>`;
    out.push({ tag, src: attr(tag, "src"), body: m[2] });
  }
  return out;
}

function noscriptBodies(html: string): string[] {
  return [...html.matchAll(/<noscript\b[^>]*>([\s\S]*?)<\/noscript\s*>/gi)].map((m) => m[1]);
}

/** Inline JS often escapes slashes in URLs ("https:\/\/..."); undo that before matching. */
const unescapeSlashes = (s: string) => s.replace(/\\\//g, "/");

class TagCollector {
  private readonly ids = new Map<string, Set<TagLocation>>();
  readonly locations = new Set<TagLocation>();

  add(location: TagLocation, id?: string) {
    this.locations.add(location);
    if (!id) return;
    const set = this.ids.get(id) ?? new Set<TagLocation>();
    set.add(location);
    this.ids.set(id, set);
  }

  get found() {
    return this.locations.size > 0;
  }

  toIds(): FoundTagId[] {
    return [...this.ids].map(([id, locs]) => ({ id, locations: [...locs] }));
  }
}

function count(pattern: RegExp, text: string): number {
  return [...text.matchAll(pattern)].length;
}

export function analyzeAnalyticsTags(html: string): AnalyticsTagsResult {
  const scripts = scriptBlocks(html);
  const inlineBodies = scripts.filter((s) => !s.src && s.body.trim()).map((s) => unescapeSlashes(s.body));
  const noscripts = noscriptBodies(html);

  const tags: AnalyticsTag[] = [];
  for (const rule of VENDORS) {
    const c = new TagCollector();
    for (const s of scripts) {
      if (!s.src) continue;
      for (const pattern of rule.src ?? []) {
        const m = pattern.exec(s.src);
        if (!m) continue;
        c.add("script src", m[1]);
        const fromAttr = rule.idAttribute ? attr(s.tag, rule.idAttribute) : null;
        if (fromAttr) c.add("script attribute", fromAttr.slice(0, 200));
        break;
      }
    }
    for (const body of inlineBodies) {
      for (const pattern of rule.inline ?? []) {
        for (const m of body.matchAll(pattern)) c.add("inline script", m[1]);
      }
    }
    for (const body of noscripts) {
      for (const pattern of rule.noscript ?? []) {
        for (const m of body.matchAll(pattern)) c.add("noscript", m[1]);
      }
    }
    if (c.found) {
      tags.push({ key: rule.key, name: rule.name, category: rule.category, ids: c.toIds(), locations: [...c.locations] });
    }
  }

  const inlineAll = inlineBodies.join("\n");
  const consentModeDefault = /['"]consent['"]\s*,\s*['"]default['"]/.test(inlineAll);

  return { tags, consentModeDefault, warnings: buildWarnings(tags, scripts, inlineAll, consentModeDefault) };
}

function buildWarnings(
  tags: AnalyticsTag[],
  scripts: ScriptBlock[],
  inlineAll: string,
  consentModeDefault: boolean,
): AnalyticsWarning[] {
  const warnings: AnalyticsWarning[] = [];
  const by = (key: VendorKey) => tags.find((t) => t.key === key);
  const ga4 = by("ga4");
  const gtm = by("gtm");
  const ua = by("ua");

  if (tags.length === 0) {
    warnings.push({
      level: "warning",
      text:
        "No analytics or tag manager code was found in this page's HTML. If you expect tracking here, it may be missing, or it may be injected later by a script this check can't run (a consent banner or a tag loader).",
    });
    return warnings;
  }

  // Each `gtag('config', 'G-...')` can send its own page_view.
  for (const { id } of ga4?.ids ?? []) {
    const configs = count(new RegExp(`gtag\\(\\s*['"]config['"]\\s*,\\s*['"]${id}['"]`, "g"), inlineAll);
    if (configs > 1) {
      warnings.push({
        level: "warning",
        text: `${id} is configured ${configs} times on this page. Each config call can send its own page_view, so visits may be counted twice.`,
      });
    }
  }

  const gtagLoads = scripts.filter((s) => s.src && /googletagmanager\.com\/gtag\/js/i.test(s.src)).length;
  if (gtagLoads > 1) {
    warnings.push({
      level: "notice",
      text: `The gtag.js library is loaded ${gtagLoads} times. One load can serve several IDs; extra copies usually mean two plugins or a theme and a plugin both added Google tags.`,
    });
  }

  const ga4Ids = ga4?.ids.length ?? 0;
  if (ga4Ids > 1) {
    warnings.push({
      level: "notice",
      text: `This page sends data to ${ga4Ids} GA4 properties. That's fine if it's intentional (for example a roll-up property); otherwise one is probably left over from an old setup.`,
    });
  }

  if (ga4 && gtm) {
    warnings.push({
      level: "notice",
      text:
        "Both Google Tag Manager and a directly installed GA4 tag are on this page. Check that the GTM container doesn't also fire a GA4 tag for the same measurement ID, or page views get counted twice.",
    });
  }

  if (gtm && !ga4) {
    warnings.push({
      level: "notice",
      text:
        "GA4 isn't in the page's HTML, but Google Tag Manager is. GA4 is often set up inside the GTM container, which this check can't see into. Use GTM's Preview mode or Google Tag Assistant to confirm it fires.",
    });
  }

  if (gtm && gtm.locations.every((l) => l === "noscript")) {
    // Only the noscript fallback is present - the container itself never loads.
    warnings.push({
      level: "warning",
      text: "Only the GTM <noscript> fallback was found, not the GTM script itself, so the container won't load for normal visitors.",
    });
  } else if (gtm && !gtm.locations.includes("noscript")) {
    warnings.push({
      level: "notice",
      text:
        "The GTM <noscript> iframe isn't on this page. It only matters for visitors with JavaScript turned off, so this is minor, but it's part of Google's standard install.",
    });
  }

  if (ua) {
    warnings.push({
      level: "warning",
      text:
        "Universal Analytics code is still on this page. Google stopped processing standard Universal Analytics data on July 1, 2023 (July 1, 2024 for Analytics 360), so this tag collects nothing. Remove it, and make sure GA4 is in place.",
    });
  }

  if (tags.some((t) => GOOGLE_KEYS.has(t.key))) {
    warnings.push(
      consentModeDefault
        ? {
            level: "notice",
            text: "A Google consent mode default command was found, so Google tags wait for a consent state before they collect.",
          }
        : {
            level: "notice",
            text:
              "No Google consent mode default was found in the HTML. Consent banners often set it from their own script, which this check can't see. If you need consent mode for EEA visitors, confirm it in Google Tag Assistant.",
          },
    );
  }

  return warnings;
}
