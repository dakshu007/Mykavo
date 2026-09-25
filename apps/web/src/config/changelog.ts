/**
 * What's new on MyKavo - the public patch notes at /whats-new-on-mykavo.
 *
 * Newest release first. Write for customers, not for the repository: what
 * they can now do, what got better, what was fixed. Internal work (CI,
 * runbooks, refactors) does not belong here. Hyphens, never em dashes.
 */

export type ChangeKind = "new" | "improved" | "fixed";

export interface ChangelogItem {
  kind: ChangeKind;
  text: string;
  /** Optional link to the page or doc that covers it. */
  href?: string;
}

export interface ChangelogRelease {
  /** ISO date, used for sorting, <time> and structured data. */
  date: string;
  title: string;
  summary: string;
  items: ChangelogItem[];
}

export const CHANGELOG_PATH = "/whats-new-on-mykavo";

export const CHANGELOG: ChangelogRelease[] = [
  {
    date: "2026-09-25",
    title: "MyKavo is in the WordPress.org plugin directory",
    summary: "Install MyKavo for WordPress straight from your dashboard, with updates like any other plugin.",
    items: [
      {
        kind: "new",
        text: "MyKavo for WordPress is approved and listed in the WordPress.org plugin directory. In WordPress go to Plugins > Add New and search for MyKavo.",
        href: "/wordpress-plugin",
      },
    ],
  },
  {
    date: "2026-09-24",
    title: "The WordPress plugin, a Supabase integration and brand assets",
    summary:
      "MyKavo now lives inside WordPress, can be triggered from Supabase, and the Shopify app is on its way.",
    items: [
      {
        kind: "new",
        text: "MyKavo for WordPress 1.0.0: status, changes and before-and-after screenshots inside wp-admin, with nothing added to the pages visitors load.",
        href: "/wordpress-plugin",
      },
      {
        kind: "new",
        text: "Safe Updates: a check after every plugin, theme, WordPress and translation update - automatic ones included - that names the update behind each change.",
        href: "/docs/platform/wordpress-plugin",
      },
      {
        kind: "new",
        text: "WooCommerce store guard, \"Monitor with MyKavo\" on pages and posts, warnings on the Plugins screen, Site Health and WP-CLI commands.",
      },
      {
        kind: "new",
        text: "Supabase integration: start a MyKavo check from a Database Webhook or a pg_net trigger when content is published.",
        href: "/docs/platform/supabase",
      },
      {
        kind: "new",
        text: "Brand assets page with the MyKavo logo, logomark and app icon to download.",
        href: "/brand",
      },
      {
        kind: "improved",
        text: "MyKavo for Shopify is built and coming soon to the Shopify App Store, with a check after every theme publish and edit.",
        href: "/shopify-app",
      },
      {
        kind: "improved",
        text: "Blog posts end with related reading and a clearer look at what MyKavo catches.",
        href: "/blog",
      },
      {
        kind: "new",
        text: "The full documentation and these release notes as one file for AI assistants, at /llms-full.txt.",
      },
      {
        kind: "new",
        text: "A Site Audit page listing all 89 checks the crawler runs, by category.",
        href: "/site-audit",
      },
    ],
  },
  {
    date: "2026-09-23",
    title: "The Agency plan and Add to Slack",
    summary: "A plan for agencies, and Slack alerts in two clicks.",
    items: [
      {
        kind: "new",
        text: "Agency plan at $49 a month: 30 websites, white-label client reports, post-deploy checks and up to 15 team members.",
        href: "/pricing",
      },
      {
        kind: "new",
        text: "Add to Slack: connect alerts to a Slack channel in two clicks, with no webhook URL to copy.",
      },
      { kind: "improved", text: "Smooth scrolling across the whole site, and prices shown in US dollars everywhere." },
      { kind: "fixed", text: "Pages that stopped scrolling halfway down now scroll to the end." },
    ],
  },
  {
    date: "2026-09-22",
    title: "Fewer false alarms, and the Android app",
    summary: "Clearer visual diffs, a simpler first run and the Android app by request.",
    items: [
      {
        kind: "improved",
        text: "Visual diff images now highlight only what actually changed. Adding one menu item no longer paints the whole page red.",
      },
      { kind: "improved", text: "Ads from common ad networks are masked automatically, so rotating ad slots no longer trigger visual changes." },
      { kind: "new", text: "The MyKavo Android app is available by request, with access approved in batches.", href: "/#android-app" },
      { kind: "improved", text: "A simpler first run: one guided path from adding a website to an approved baseline." },
      { kind: "improved", text: "Sign up with Google in one click, and a welcome email that explains how to switch alerts on." },
    ],
  },
  {
    date: "2026-09-20",
    title: "Documentation, comparisons and opt-in email",
    summary: "Public docs, honest comparisons and alerts you choose to receive.",
    items: [
      { kind: "new", text: "Public documentation: getting started, what MyKavo checks, severity levels and reducing false positives.", href: "/docs" },
      { kind: "new", text: "Side-by-side comparisons with other website monitoring tools.", href: "/compare" },
      { kind: "new", text: "Book a demo, the partner program and write for us pages.", href: "/partners" },
      { kind: "improved", text: "Email alerts are now opt-in, so nobody receives mail they did not ask for." },
      { kind: "improved", text: "Screenshots are compressed to 150 KB or less, so comparisons load faster." },
      { kind: "improved", text: "Deleting a website now also deletes its stored screenshots." },
    ],
  },
  {
    date: "2026-09-15",
    title: "A faster Android app",
    summary: "Smoother navigation, Google sign-in and more of MyKavo on your phone.",
    items: [
      { kind: "new", text: "Continue with Google on the Android app's sign-in screen." },
      { kind: "new", text: "Search Console data in the Android app." },
      { kind: "new", text: "Add a website from your phone, and see what each site is built with." },
      { kind: "new", text: "Push notifications for important changes." },
      { kind: "improved", text: "Faster tab switching, compact filters and hold-and-drag between tabs." },
    ],
  },
  {
    date: "2026-09-12",
    title: "Tech stack detection and domain expiry",
    summary: "Know what every site runs on, and when its domain expires.",
    items: [
      { kind: "new", text: "MyKavo detects what every monitored website is built with - CMS, frameworks and services." },
      { kind: "new", text: "Domain expiry dates on the dashboard, next to SSL expiry." },
      { kind: "new", text: "On WordPress sites, a change can name the plugin update that caused it." },
      { kind: "improved", text: "The dashboard shows your real plan limits and usage." },
    ],
  },
  {
    date: "2026-09-11",
    title: "Competitor Analysis and traffic drops explained",
    summary: "A new free tool, and answers to \"what changed before the drop?\"",
    items: [
      { kind: "new", text: "Free Competitor Analysis tool.", href: "/tools/competitor-analysis-tool" },
      {
        kind: "new",
        text: "Search Console traffic drops are matched with the changes MyKavo detected just before them.",
      },
      { kind: "improved", text: "The E-E-A-T Analyzer is now easy to find in the Tools menu.", href: "/tools/eeat-analyzer" },
    ],
  },
  {
    date: "2026-09-09",
    title: "Smarter visual severity",
    summary: "Visual changes are scored on what changed, not where it moved.",
    items: [
      {
        kind: "improved",
        text: "Visual severity is scored on changed content, so content that only shifts position is no longer a big change.",
      },
      { kind: "improved", text: "Unchanged pages reuse the stored screenshot instead of saving it again." },
      { kind: "improved", text: "Stronger security headers across mykavo.app." },
      { kind: "fixed", text: "A scan that could not finish comparing is no longer reported as clean." },
    ],
  },
  {
    date: "2026-08-03",
    title: "Search Console, the E-E-A-T Analyzer and a better Site Audit",
    summary: "Search data next to your changes, and a deeper audit.",
    items: [
      {
        kind: "new",
        text: "Google Search Console integration: clicks, impressions and positions synced daily, with Priority Opportunities.",
      },
      { kind: "new", text: "E-E-A-T Analyzer, as a free tool and a dashboard report.", href: "/tools/eeat-analyzer" },
      { kind: "improved", text: "Site Audit shows where each issue was found, with six new checks and CSV export." },
    ],
  },
  {
    date: "2026-08-02",
    title: "Site Audit, deploy checks and scheduled reports",
    summary: "Audit the whole site, verify every release, and send reports automatically.",
    items: [
      { kind: "new", text: "Site Audit: a technical SEO crawl of the whole site, with every issue explained." },
      {
        kind: "new",
        text: "Post-deploy checks: call one URL after a release and MyKavo replies \"Deploy verified\" or lists what changed.",
      },
      { kind: "new", text: "Client reports can be emailed on a schedule." },
    ],
  },
  {
    date: "2026-08-01",
    title: "White-label client reports",
    summary: "Share monitoring results with clients under your own brand.",
    items: [{ kind: "new", text: "Shareable client reports with your own logo and colors." }],
  },
  {
    date: "2026-07-18",
    title: "The MyKavo Android app",
    summary: "Your monitoring, in your pocket.",
    items: [
      { kind: "new", text: "The MyKavo Android app, kept in sync with the web dashboard.", href: "/#android-app" },
    ],
  },
  {
    date: "2026-07-17",
    title: "A new look and two-factor authentication",
    summary: "The gold spark, and a safer account.",
    items: [
      { kind: "new", text: "Two-factor authentication with an authenticator app." },
      { kind: "improved", text: "The new MyKavo look: the gold spark logo across the site and dashboard." },
      { kind: "improved", text: "The Pro plan is now $20 a month.", href: "/pricing" },
    ],
  },
  {
    date: "2026-07-16",
    title: "Hello, MyKavo",
    summary: "The product gets its name and its home at mykavo.app.",
    items: [
      {
        kind: "new",
        text: "MyKavo launches at mykavo.app. The name comes from the Tamil word Kaval - protection, standing guard over your websites.",
        href: "/about",
      },
    ],
  },
];
