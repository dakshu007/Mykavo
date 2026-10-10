import {
  Activity,
  BarChart3,
  Bot,
  Braces,
  FileCode2,
  GitCompareArrows,
  Gauge,
  Globe2,
  Link2Off,
  ListChecks,
  ListTree,
  Lock,
  Palette,
  Route,
  SearchX,
  ShieldCheck,
  ShoppingBag,
  Tags,
  Target,
  type LucideIcon,
} from "lucide-react";

/**
 * Every free tool, in one place. The header Tools menu, the /tools hub, both
 * footers, the sitemap and llms.txt all read this list, so adding a tool is
 * one entry here (plus its page) rather than six edits that drift apart.
 *
 * `blurb` is one line for the hub and llms.txt: what you get, no hype.
 */

export type ToolCategory = "seo" | "health" | "detect";

export interface ToolEntry {
  slug: string;
  name: string;
  /** Short label for the compact header menu. */
  menuLabel: string;
  blurb: string;
  category: ToolCategory;
  icon: LucideIcon;
  isNew?: boolean;
  /** Shown first in the footers' short list. */
  popular?: boolean;
}

export const TOOL_CATEGORIES: Record<ToolCategory, { title: string; description: string }> = {
  seo: {
    title: "SEO & indexing",
    description: "Can Google crawl, index and understand the page?",
  },
  health: {
    title: "Site health",
    description: "Links, status codes, certificates and page weight.",
  },
  detect: {
    title: "Detect & compare",
    description: "What a site runs, what it loads, and what changed.",
  },
};

export const TOOLS: ToolEntry[] = [
  // SEO & indexing
  { slug: "meta-tag-checker", name: "Meta Tag Checker", menuLabel: "Meta Tag Checker", blurb: "Grade a page's title, description, canonical, robots meta, Open Graph tags and H1s.", category: "seo", icon: Tags, popular: true },
  { slug: "noindex-checker", name: "Noindex Checker", menuLabel: "Noindex Checker", blurb: "See if Google can index a page: robots meta, X-Robots-Tag, status code and robots.txt in one check.", category: "seo", icon: SearchX, isNew: true, popular: true },
  { slug: "canonical-tag-checker", name: "Canonical Tag Checker", menuLabel: "Canonical Checker", blurb: "Find every canonical in a page's HTML and headers, spot conflicts and test the target URL.", category: "seo", icon: Target, isNew: true },
  { slug: "robots-txt-tester", name: "Robots.txt Tester", menuLabel: "Robots.txt Tester", blurb: "Test a URL against robots.txt for Googlebot, Bingbot and AI crawlers, with the deciding rule.", category: "seo", icon: Bot, isNew: true, popular: true },
  { slug: "hreflang-checker", name: "Hreflang Checker", menuLabel: "Hreflang Checker", blurb: "Validate hreflang codes and check every alternate links back.", category: "seo", icon: Globe2, isNew: true },
  { slug: "heading-structure-checker", name: "Heading Structure Checker", menuLabel: "Heading Checker", blurb: "Outline every H1 to H6 on a page and flag a missing H1, empty headings and skipped levels.", category: "seo", icon: ListTree, isNew: true },
  { slug: "structured-data-checker", name: "Structured Data Checker", menuLabel: "Schema Checker", blurb: "View every JSON-LD block, catch invalid JSON and check common schema.org properties.", category: "seo", icon: FileCode2, isNew: true },
  { slug: "eeat-analyzer", name: "E-E-A-T Analyzer", menuLabel: "E-E-A-T Analyzer", blurb: "Score a page against Google's Experience, Expertise, Authoritativeness and Trust signals.", category: "seo", icon: ShieldCheck },

  // Site health
  { slug: "broken-link-checker", name: "Broken Link Checker", menuLabel: "Broken Link Checker", blurb: "Find 404s and other broken links on any page. Checks up to 100 internal and external links.", category: "health", icon: Link2Off, isNew: true, popular: true },
  { slug: "redirect-chain-checker", name: "Redirect Chain Checker", menuLabel: "Redirect Chain Checker", blurb: "Trace every redirect hop with its status code, and catch loops and long chains.", category: "health", icon: Route },
  { slug: "bulk-url-status-checker", name: "Bulk URL Status Checker", menuLabel: "Bulk URL Status", blurb: "Check status codes and response times of up to 20 URLs in one go.", category: "health", icon: ListChecks },
  { slug: "ssl-certificate-checker", name: "SSL Certificate Checker", menuLabel: "SSL Checker", blurb: "When the certificate expires, who issued it, what it covers and whether the chain is trusted.", category: "health", icon: Lock, isNew: true, popular: true },
  { slug: "page-size-checker", name: "Page Size Checker", menuLabel: "Page Size Checker", blurb: "Measure page weight, HTML size and requests, with the heaviest files and third-party share.", category: "health", icon: Gauge, isNew: true },

  // Detect & compare
  { slug: "website-change-detector", name: "Website Change Detector", menuLabel: "Change Detector", blurb: "Snapshot a page's status, SEO tags, links and scripts, then re-check later to see what changed.", category: "detect", icon: GitCompareArrows, popular: true },
  { slug: "competitor-analysis-tool", name: "Competitor Analysis Tool", menuLabel: "Competitor Analysis", blurb: "Snapshot a rival's public pages and see exactly what they change.", category: "detect", icon: Activity },
  { slug: "script-detector", name: "Script Detector", menuLabel: "Script Detector", blurb: "List every external script on a page and identify the services behind them.", category: "detect", icon: Braces, popular: true },
  { slug: "analytics-tag-checker", name: "Analytics Tag Checker", menuLabel: "Analytics Checker", blurb: "Check if GA4, Google Tag Manager, Meta Pixel and other tags are installed, with their IDs.", category: "detect", icon: BarChart3, isNew: true },
  { slug: "wordpress-theme-detector", name: "WordPress Theme Detector", menuLabel: "WordPress Detector", blurb: "Find the theme, its version and parent, and the plugins any WordPress page loads.", category: "detect", icon: Palette, isNew: true },
  { slug: "shopify-theme-detector", name: "Shopify Theme Detector", menuLabel: "Shopify Detector", blurb: "See any Shopify store's theme, the original it's built from, its version and the apps it loads.", category: "detect", icon: ShoppingBag, isNew: true },
];

export const TOOLS_HUB_PATH = "/tools";

export function toolHref(slug: string): string {
  return `/tools/${slug}`;
}

export function toolsByCategory(category: ToolCategory): ToolEntry[] {
  return TOOLS.filter((t) => t.category === category);
}

/** The short list the footers show, ahead of an "All free tools" link. */
export function popularTools(): ToolEntry[] {
  return TOOLS.filter((t) => t.popular);
}
