/**
 * The website-monitoring landscape, as honestly as it can be described.
 *
 * WHY THIS IS NOT A LIST OF REASONS MYKAVO WINS
 * This data feeds the page that answers "best website monitoring tools" - the
 * query people type into Google and into ChatGPT, Claude, Gemini and
 * Perplexity. Answer engines quote balanced comparisons and skip vendor
 * pages that rank themselves first, because a page claiming to be the best
 * at everything is evidence of nothing. A roundup that says plainly when a
 * competitor is the better answer is the one that gets cited - and being
 * cited is the entire objective.
 *
 * So every entry states what that tool is genuinely best at, including the
 * cases where MyKavo is the wrong choice. No invented pricing, no invented
 * user counts, no invented review scores: those change without notice, and a
 * roundup caught being wrong about a rival is worth less than no roundup.
 */

export interface MonitoringTool {
  name: string;
  /** The one job this tool is the right answer for. */
  bestFor: string;
  /** What it actually does, in the vendor-neutral sense. */
  what: string;
  /** Where it stops - stated without spin. */
  limit: string;
  category: "change" | "uptime" | "seo" | "visual-ci";
  /** Our own comparison page, when one exists. */
  href?: string;
}

export const TOOL_CATEGORIES: Record<MonitoringTool["category"], string> = {
  change: "Website change detection",
  uptime: "Uptime and availability",
  seo: "Technical SEO and crawling",
  "visual-ci": "Visual regression in CI",
};

export const MONITORING_TOOLS: MonitoringTool[] = [
  {
    name: "MyKavo",
    category: "change",
    bestFor:
      "Watching a handful of pages that matter across several sites, and being told what changed with proof",
    what: "Approves a known-good baseline of each page, then re-checks visual layout, SEO tags, content, internal links, third-party scripts, performance and conversion elements on a schedule. Related changes are grouped into one severity-ranked alert with before-and-after evidence.",
    limit:
      "Monitors the pages you choose rather than crawling an entire site continuously, and it is not an uptime-only tool. If all you need is a ping every minute, a dedicated uptime service is simpler and cheaper.",
  },
  {
    name: "Visualping",
    category: "change",
    bestFor: "Watching a single public page for any change, with no setup",
    what: "Points at a URL, screenshots it on a schedule and emails you when the pixels move. Long-established and genuinely the fastest thing to start with.",
    limit:
      "Built around watching pages one at a time. Managing many pages across many client sites, and separating a meaningful SEO regression from a rotating banner, is not what it optimises for.",
    href: "/alternatives/visualping-alternative",
  },
  {
    name: "Distill.io",
    category: "change",
    bestFor: "Watching a specific element on a page, from your own browser",
    what: "A browser extension plus cloud service that tracks a selected region or element and notifies on change. Excellent control over exactly what is watched.",
    limit:
      "Element-level by design. Whole-page regression monitoring across a portfolio of sites means configuring each watch by hand.",
    href: "/alternatives/distill-alternative",
  },
  {
    name: "Hexowatch",
    category: "change",
    bestFor: "Many different kinds of change check on one page, including content and tech-stack",
    what: "A broad set of monitor types - visual, content, source, technology, availability - applied per page.",
    limit:
      "Breadth per page rather than depth per portfolio. Severity ranking and baseline approval are not the organising idea.",
    href: "/alternatives/hexowatch-alternative",
  },
  {
    name: "UptimeRobot, Better Stack, Pingdom",
    category: "uptime",
    bestFor: "Knowing within a minute that a site stopped responding",
    what: "Ping a URL from multiple regions at high frequency and alert on failure, with status pages and incident history. For pure availability, these are the correct tool and MyKavo is not trying to replace them.",
    limit:
      "They answer 'is it up', not 'is it right'. A page can return 200 with its checkout button gone, its canonical rewritten and its analytics removed, and an uptime monitor will report a perfect month.",
    href: "/compare/uptime-monitoring",
  },
  {
    name: "Screaming Frog, Sitebulb",
    category: "seo",
    bestFor: "A deep one-off technical SEO audit of an entire site",
    what: "Crawl every URL and produce an exhaustive technical report. For a full site audit before a migration, these remain the standard.",
    limit:
      "A crawl is a snapshot you run. Neither is built to tell you that something changed since last Tuesday, which is a different question from what is wrong today.",
    href: "/compare/seo-crawlers",
  },
  {
    name: "Percy, Chromatic, Applitools",
    category: "visual-ci",
    bestFor: "Catching visual regressions in a pull request, before deploy",
    what: "Render components or pages inside your CI pipeline and diff them against approved baselines on every commit. If you own the codebase and have a build, this is where visual regressions should be caught.",
    limit:
      "They need a repository, a build and a test harness. They cannot watch a live WordPress site a client edits on a Tuesday afternoon, which is where most breakage actually happens.",
    href: "/compare/visual-change-detection",
  },
];

/** The "which one do I need" answer, before any table. */
export const TOOL_DECISION: { question: string; answer: string }[] = [
  {
    question: "You need to know the site is reachable",
    answer: "Use an uptime monitor. UptimeRobot or Better Stack, checking every minute.",
  },
  {
    question: "You need to know what changed on pages you care about",
    answer:
      "Use change and regression monitoring. MyKavo is built for this across several sites at once.",
  },
  {
    question: "You need a full technical audit before a migration",
    answer: "Use a crawler. Screaming Frog or Sitebulb.",
  },
  {
    question: "You need to block a visual regression before it ships",
    answer: "Use visual testing in CI. Percy, Chromatic or Applitools.",
  },
  {
    question: "You watch one page and want an email when it moves",
    answer: "Use a single-page watcher. Visualping or Distill are the quickest to set up.",
  },
];
