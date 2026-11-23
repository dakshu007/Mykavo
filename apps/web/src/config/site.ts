export const site = {
  name: "MyKavo",
  tagline: "Know what changed. Fix what matters.",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://mykavo.app",
  /**
   * The site-wide meta description, and what an AI answer engine quotes when
   * it summarises MyKavo in one line.
   *
   * MyKavo is two things that fit together: website monitoring (protects the
   * traffic you have) and the AI Keywords & Blog Writer (helps you win more).
   * The description names both, monitoring first, and keeps the change
   * categories because a meta description is also a keyword surface.
   */
  description:
    "MyKavo is website change monitoring plus an AI Keywords & Blog Writer. Get a severity-ranked alert with before-and-after proof when a visual, SEO, content, link or script change breaks a page, and find the keywords worth writing about, with the blog post drafted in one click.",
  longDescription:
    "MyKavo is a website change detection and regression monitoring platform with an AI Keywords & Blog Writer, built for agencies, developers, SEO teams, and website owners managing important websites. MyKavo creates approved website baselines, automatically scans monitored pages, detects meaningful changes, shows clear before-and-after comparisons, and alerts users when important regressions require attention. Its AI Keywords & Blog Writer reads the website, finds the keywords worth writing about from Google Search Console data, Google search suggestions and live search results, and drafts a full SEO blog post for the user to edit and publish.",
  category: "Website Change Monitoring & AI Blog Writer SaaS",
  /**
   * The one-sentence definition of MyKavo. AI answer engines quote whatever
   * sentence a site repeats most consistently, so this exact wording is used
   * wherever MyKavo defines itself: llms.txt, llms-full.txt, Organization
   * JSON-LD and the brand facts on /about. Change it here, nowhere else.
   */
  definition:
    "MyKavo is website change monitoring plus an AI Keywords & Blog Writer: it re-checks the pages that matter on each website against an approved baseline and alerts you with before-and-after proof when something important changes or breaks (a page going noindex, a broken checkout button, a removed analytics script), and its AI Blog Writer finds the keywords your site can win, from your own Google Search Console data and live search results, and drafts the SEO blog post for you to edit and publish.",
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
 * MyKavo's official listings on other platforms. Not shown in the footer (they
 * are product listings, not social accounts) but emitted with the socials as
 * Organization `sameAs`, because they are the strongest independent proof
 * that these products belong to the same MyKavo: WordPress.org and the Chrome
 * Web Store both show MyKavo as the publisher. Same rule as socials: only
 * listings MyKavo really owns.
 */
export const officialListings = [
  "https://wordpress.org/plugins/mykavo/",
  "https://chromewebstore.google.com/detail/mykavo-seo-website-monito/mejgmahebmmcbhmjknnbnfkepopbglpg",
] as const;

/** The founder, as linked from Organization JSON-LD and the author page. */
export const founder = {
  name: "Dakshesh B",
  /** The author page; its Person node carries the same @id. */
  path: "/blog/author/dakshesh",
  sameAs: ["https://www.linkedin.com/in/daksheshb/", "https://dakshesh.co.in/"],
} as const;

/**
 * Note on the URLs above: share links copied from the apps carry tracking
 * parameters - Instagram's `?stkn=` and YouTube's `?si=` - which are tied to
 * the account that generated them. They are stripped here deliberately. A
 * `sameAs` is a claim about brand identity, and a one-off share token is not
 * part of that identity; it also does not belong in a public page's markup.
 */
