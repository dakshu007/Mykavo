/**
 * Where MyKavo is available, as the /platforms page describes it. One list
 * feeds the page cards, the orbit animation and the structured data, so a
 * status change (Android approved, Shopify listed) is a one-line edit here.
 *
 * Keep every entry true to the shipped product: a platform is "live" only if
 * people can use it today, "request" if access is by request, and "soon" if it
 * is built but not yet listed.
 */

export const PLATFORMS_PAGE_PATH = "/platforms";

export type PlatformStatus = "live" | "request" | "soon";

/** A third-party tool a platform is used with. The page draws its real logo. */
export interface WorksWith {
  name: string;
  logo: "claude" | "cursor" | "githubactions" | "vercel" | "netlify";
}

export interface Platform {
  id: "web" | "wordpress" | "chrome" | "android" | "ai" | "deploy" | "shopify";
  name: string;
  status: PlatformStatus;
  /** Short chip text shown on the card. */
  chip: string;
  /** One line under the name. */
  tagline: string;
  points: string[];
  /** Real tools it is used with, shown as logo chips under the points. */
  worksWith?: { items: WorksWith[]; note: string };
  href: string;
  cta: string;
}

export const STATUS_LABEL: Record<PlatformStatus, string> = {
  live: "Live",
  request: "By request",
  soon: "Coming soon",
};

export const PLATFORMS: Platform[] = [
  {
    id: "web",
    name: "Web app",
    status: "live",
    chip: "mykavo.app",
    tagline: "The home base. Every other platform connects back to it.",
    points: [
      "Add any website and approve a baseline in minutes",
      "Before-and-after screenshots, diffs and a severity for every change",
      "Site Audit, Search Console and Lighthouse in the same place",
      "Alerts by email, Slack, Discord or a signed webhook",
      "Client reports and public status pages",
    ],
    href: "/signup",
    cta: "Start monitoring free",
  },
  {
    id: "wordpress",
    name: "WordPress plugin",
    status: "live",
    chip: "WordPress.org",
    tagline: "Monitoring inside wp-admin, built around updates.",
    points: [
      "Safe Updates (Pro and Agency): a check after every plugin, theme and core update, naming the update that broke something",
      "A WooCommerce store-page guard",
      "WP-CLI commands for scripted sites",
      "AI crawler visit counts from your own site",
    ],
    href: "/wordpress-plugin",
    cta: "See the WordPress plugin",
  },
  {
    id: "chrome",
    name: "Chrome extension",
    status: "live",
    chip: "Chrome Web Store",
    tagline: "Check any page in one click, protect it in one more.",
    points: [
      "An instant on-page SEO check with 17 checks, run locally in your browser",
      "One-click Protect connects the website to MyKavo",
      "Status, critical changes and uptime whenever you visit a protected site",
      "Right-click any page to monitor it",
    ],
    href: "/chrome-extension",
    cta: "See the Chrome extension",
  },
  {
    id: "android",
    name: "Android app",
    status: "request",
    chip: "Android 7.0+",
    tagline: "Your websites in your pocket, with push alerts.",
    points: [
      "Push notifications when something important changes",
      "Add websites and review changes from your phone",
      "Search Console on the go",
      "The same account as the web, with two-factor sign-in",
    ],
    href: "/android-app",
    cta: "Request the Android app",
  },
  {
    id: "ai",
    name: "AI assistants",
    status: "live",
    chip: "MCP server",
    tagline: "Ask your assistant what changed.",
    points: [
      "Connect Claude Code, Claude Desktop, Cursor or any MCP client",
      "Ask which site needs attention, what changed, what the latest audit says",
      "Read-only, with a per-workspace API key you can revoke",
    ],
    worksWith: {
      items: [
        { name: "Claude", logo: "claude" },
        { name: "Cursor", logo: "cursor" },
      ],
      note: "and any MCP client",
    },
    href: "/signup",
    cta: "Create a free account",
  },
  {
    id: "deploy",
    name: "Deploy pipelines",
    status: "live",
    chip: "Pro and Agency",
    tagline: "A scan the moment a release goes out.",
    points: [
      "A deploy hook per website that CI or your host can call",
      "A scan runs straight away and always sends a verdict, clean or not",
      "An optional version note, such as v1.2.3, travels with the scan",
    ],
    worksWith: {
      items: [
        { name: "GitHub Actions", logo: "githubactions" },
        { name: "Vercel", logo: "vercel" },
        { name: "Netlify", logo: "netlify" },
      ],
      note: "or any CI that can call a URL",
    },
    href: "/docs/platform/deploy-checks",
    cta: "How deploy checks work",
  },
  {
    id: "shopify",
    name: "Shopify app",
    status: "soon",
    chip: "Shopify App Store",
    tagline: "Theme-change checks inside your Shopify admin.",
    points: [
      "Checks your store pages when a theme is published or edited",
      "Shows which theme change broke what, such as a missing Add to cart button",
      "Any Shopify store can be monitored from mykavo.app today, with nothing to install",
    ],
    href: "/shopify-app",
    cta: "See the Shopify app",
  },
];

/** Where an alert can land. Shown on the orbit and the relay animation. */
export const ALERT_CHANNELS = ["Email", "Slack", "Discord", "Webhook", "Push"] as const;

export function platformsByStatus(status: PlatformStatus): Platform[] {
  return PLATFORMS.filter((p) => p.status === status);
}

/**
 * The platforms the homepage band shows, in order. Five is enough to say
 * "it works where you work"; the band links on to /platforms for the rest.
 */
export const HOMEPAGE_BAND_IDS: Platform["id"][] = ["wordpress", "chrome", "android", "ai", "shopify"];
