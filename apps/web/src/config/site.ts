export const site = {
  name: "MyKavo",
  tagline: "Know what changed. Fix what matters.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mykavo.app",
  /**
   * The site-wide meta description, and what an AI answer engine quotes when
   * it summarises MyKavo in one line.
   *
   * Leads with the category and the unit of work ("page monitoring"), the way
   * the headline now does, rather than opening with a seven-item feature list
   * that reads as seven products. The categories still follow, because a meta
   * description is also a keyword surface and those words are what people
   * search for - the ordering is what changed, not the coverage.
   */
  description:
    "MyKavo is page monitoring for websites. Approve a known-good baseline of the pages that matter, and get a severity-ranked alert with before-and-after proof the moment a visual, SEO, content, link, script or performance change breaks one.",
  longDescription:
    "MyKavo is a website change detection and regression monitoring platform built for agencies, developers, SEO teams, and website owners managing important websites. MyKavo creates approved website baselines, automatically scans monitored pages, detects meaningful changes, shows clear before-and-after comparisons, and alerts users when important regressions require attention.",
  category: "Website Change & Regression Monitoring SaaS",
} as const;

/**
 * Official social profiles. Single source: the footer renders these, and
 * Organization JSON-LD emits them as `sameAs` so search and AI answer engines
 * can tie mykavo.app to the same brand entity across the web.
 *
 * ONLY add accounts that genuinely exist and are controlled by MyKavo - a
 * sameAs pointing at a profile the brand does not own is an entity-graph
 * error, and the spec forbids fake social proof of any kind.
 */
export const socials = [
  {
    label: "LinkedIn",
    href: "https://www.linkedin.com/company/mykavo/",
    description: "official company page",
  },
  {
    label: "Instagram",
    href: "https://www.instagram.com/mykavo_/",
    description: "product shots and release notes",
  },
  {
    label: "YouTube",
    href: "https://www.youtube.com/@mykavo",
    description: "walkthroughs and feature demos",
  },
] as const;

/**
 * Note on the URLs above: share links copied from the apps carry tracking
 * parameters - Instagram's `?stkn=` and YouTube's `?si=` - which are tied to
 * the account that generated them. They are stripped here deliberately. A
 * `sameAs` is a claim about brand identity, and a one-off share token is not
 * part of that identity; it also does not belong in a public page's markup.
 */
