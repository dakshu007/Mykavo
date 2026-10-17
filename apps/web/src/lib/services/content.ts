import type { FaqItem } from "@/lib/seo/structured-data";
import type { ServiceKind } from "@/lib/services/request";

/**
 * Copy for /services. Kept as data so the page and its FAQPage JSON-LD read
 * from the same array (the schema can never claim an answer the page does
 * not show), and so a test can hold the copy to the house rules: no prices
 * the owner has not set, and no em or en dashes.
 *
 * Positioning: MyKavo Services fixes and looks after EXISTING websites for
 * site owners. It does not build new websites, and agencies keep using
 * MyKavo directly.
 */

export type ServiceIconKey =
  | "links"
  | "tracking"
  | "seo"
  | "buttons"
  | "updates"
  | "speed";

export interface FixArea {
  icon: ServiceIconKey;
  title: string;
  body: string;
  examples: readonly string[];
}

export const FIX_AREAS: readonly FixArea[] = [
  {
    icon: "links",
    title: "Broken pages and links",
    body: "Pages that return errors, links that lead nowhere, redirects that loop or point to the wrong place.",
    examples: ["404 and 500 errors", "Broken internal links", "Wrong redirects"],
  },
  {
    icon: "tracking",
    title: "Lost tracking",
    body: "Your analytics went quiet because a tag disappeared after an edit, a theme change or a plugin update.",
    examples: ["Google Analytics", "Google Tag Manager", "Meta Pixel"],
  },
  {
    icon: "seo",
    title: "SEO accidents",
    body: "Small settings that quietly remove pages from search, usually left behind by a launch or a migration.",
    examples: ["noindex left on", "Canonical removed", "Titles wiped"],
  },
  {
    icon: "buttons",
    title: "Broken buttons and forms",
    body: "The parts of your site that bring in money or leads stop working, often without anyone noticing.",
    examples: ["Signup", "Checkout", "Contact forms"],
  },
  {
    icon: "updates",
    title: "After-update breakage",
    body: "A WordPress or Shopify update broke the layout, a plugin or an app, and the site no longer looks or works right.",
    examples: ["Layout shifted", "Plugin stopped working", "Theme conflict"],
  },
  {
    icon: "speed",
    title: "Slow pages",
    body: "Pages that got heavier or slower after a change, so visitors wait longer and leave sooner.",
    examples: ["Heavy images", "Extra scripts", "Slow responses"],
  },
];

export interface WorkOption {
  kind: Extract<ServiceKind, "fix" | "care_plan">;
  eyebrow: string;
  title: string;
  body: string;
  points: readonly string[];
}

export const WORK_OPTIONS: readonly WorkOption[] = [
  {
    kind: "fix",
    eyebrow: "One-off fix",
    title: "Something just broke",
    body: "We fix one issue, then MyKavo re-scans the page to confirm it is really fixed.",
    points: [
      "One clear issue, one fixed quote",
      "You approve before we touch anything",
      "Before-and-after proof from a fresh scan",
    ],
  },
  {
    kind: "care_plan",
    eyebrow: "Care plan",
    title: "Ongoing peace of mind",
    body: "Pro monitoring on your site, plus fixes when something breaks and a monthly report on what changed.",
    points: [
      "MyKavo Pro monitoring included",
      "Fixes when something breaks",
      "A monthly report in plain language",
    ],
  },
];

export interface HowStep {
  title: string;
  body: string;
}

export const HOW_STEPS: readonly HowStep[] = [
  {
    title: "Tell us what's wrong",
    body: "Describe the problem in your own words, or send the MyKavo alert you received.",
  },
  {
    title: "We reply with a fixed quote",
    body: "You get one price for the job and what it covers, before any work starts.",
  },
  {
    title: "We fix it once you approve",
    body: "Nothing happens until you say yes. Then we make the fix and tell you what we changed.",
  },
  {
    title: "MyKavo re-scans the page",
    body: "A fresh scan shows the before and after, so you can see the problem is gone.",
  },
];

export const WHY_POINTS: readonly HowStep[] = [
  {
    title: "We built MyKavo",
    body: "So we see exactly what changed on your site, when it changed and what it looked like before. No guessing, no long discovery calls.",
  },
  {
    title: "Every fix is verified by a scan",
    body: "We do not just say it is fixed. MyKavo scans the page again and you see the result for yourself.",
  },
  {
    title: "Fixed price, agreed up front",
    body: "You know the full cost before we start. No hourly meter running, no retainer needed.",
  },
];

export interface PlatformItem {
  id: "wordpress" | "shopify" | "webflow" | "custom";
  name: string;
  note: string;
}

export const PLATFORMS: readonly PlatformItem[] = [
  { id: "wordpress", name: "WordPress", note: "Themes, plugins, updates and WooCommerce" },
  { id: "shopify", name: "Shopify", note: "Themes, apps and checkout issues" },
  { id: "webflow", name: "Webflow", note: "Pages, interactions and publishing" },
  { id: "custom", name: "Custom HTML sites", note: "Hand-coded and static websites" },
];

export const SERVICES_FAQS: readonly FaqItem[] = [
  {
    q: "Do I need a MyKavo account?",
    a: "No. Anyone can ask for a fix. If you do use MyKavo, you can send us a change straight from your dashboard and we see exactly what broke.",
  },
  {
    q: "How fast will you reply?",
    a: "We reply with a fixed quote, usually within 1 to 2 business days. Tell us if it is urgent and we will say up front whether we can help in time.",
  },
  {
    q: "What access do you need, and is it safe?",
    a: "Only what the fix needs, such as a temporary admin or collaborator login for your platform. We ask for it after you approve the quote, and you can remove it as soon as we are done. Never send passwords in the request form.",
  },
  {
    q: "What if you can't fix it?",
    a: "Then you don't pay. If the problem turns out to be outside what we can fix, we tell you, and you owe nothing.",
  },
  {
    q: "Do you build new websites?",
    a: "No. We fix and look after existing websites. If you need a new site, a web designer or agency is the right fit.",
  },
  {
    q: "I'm an agency. Can you help my clients?",
    a: "Agencies keep using MyKavo directly to monitor client sites. For fixes, we work with site owners, so we never end up competing with you for your own clients.",
  },
];
