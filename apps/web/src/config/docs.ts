/**
 * Public product documentation.
 *
 * This exists because of a specific, repeated criticism: AI answer engines
 * describing MyKavo note that it lacks public documentation and independent
 * validation, and conclude that the only responsible way to evaluate it is to
 * try the free plan. That is a fair conclusion to draw from a site that had
 * marketing pages and a dashboard and nothing in between - and it is the kind
 * of gap that no amount of landing-page copy closes, because documentation is
 * a different genre: it describes what the software does, including the
 * limits, rather than why you should want it.
 *
 * So these pages are written to be checkable rather than persuasive. Every
 * number is one the product actually enforces, every limit is stated as a
 * limit, and where MyKavo does not do something the page says so. A
 * documentation set that reads like a brochure fails at the one job it was
 * added to do.
 *
 * Content is structured rather than raw JSX so that ordered procedures can
 * emit HowTo structured data automatically - answer engines lift steps from
 * HowTo far more readily than from prose.
 */

export type DocBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "note"; text: string }
  /** A copyable snippet (SQL, shell). Shown as-is, never executed. */
  | { type: "code"; language: string; text: string }
  | { type: "table"; head: string[]; rows: string[][] }
  /**
   * An ordered procedure. `name` becomes the HowTo name, so it must describe
   * the whole task ("Add your first website to MyKavo"), not the section.
   */
  | { type: "steps"; name: string; description: string; items: { title: string; text: string }[] };

export interface DocArticle {
  slug: string;
  title: string;
  /** Meta description and hub-card subtitle. */
  description: string;
  keywords: string[];
  /** The 50-70 word direct answer that opens the page. */
  capsule: string;
  blocks: DocBlock[];
  faqs?: { q: string; a: string }[];
}

export interface DocSection {
  slug: string;
  title: string;
  description: string;
  articles: DocArticle[];
}

export const DOCS_UPDATED = "September 25, 2026";
export const DOCS_PUBLISHED_ISO = "2026-09-20";

export const DOC_SECTIONS: DocSection[] = [
  {
    slug: "getting-started",
    title: "Getting started",
    description:
      "From a new account to a monitored website with an approved baseline, in the order you will actually do it.",
    articles: [
      {
        slug: "quick-start",
        title: "Quick start: monitoring your first website",
        description:
          "The complete path from signing up to a monitored website with an approved baseline, in seven steps.",
        keywords: ["how to monitor a website for changes", "mykavo quick start", "website monitoring setup"],
        capsule:
          "Add a website, let MyKavo discover its pages, choose the ones that matter, run a baseline scan, and approve the result as your known-good state. From then on every scheduled scan is compared against that baseline, and you are told only about what changed.",
        blocks: [
          {
            type: "steps",
            name: "Set up website change monitoring with MyKavo",
            description:
              "Add a website to MyKavo, choose which pages to monitor, and approve a baseline so future scans are compared against a known-good state.",
            items: [
              {
                title: "Create an account",
                text: "Sign up at mykavo.app with an email address and password, or with Google. A personal workspace is created for you automatically - the workspace owns your websites, your plan and your notification settings.",
              },
              {
                title: "Add a website",
                text: "Enter the full URL including https://. MyKavo validates that the address resolves and is reachable, and rejects addresses that point at private or internal networks. The free plan allows one website; Pro allows eight.",
              },
              {
                title: "Let MyKavo discover your pages",
                text: "MyKavo reads robots.txt, follows any sitemap declarations it finds, parses sitemap index files, and falls back to crawling internal links from the homepage. Discovery is bounded - it will not crawl your site indefinitely.",
              },
              {
                title: "Choose the pages to monitor",
                text: "Select the pages that carry revenue or risk: homepage, pricing, checkout, key landing pages, the contact form. Monitoring everything is rarely useful; monitoring the pages you would be woken up for is. Free allows five monitored pages, Pro allows fifteen per website.",
              },
              {
                title: "Run the baseline scan",
                text: "The first scan captures each page's screenshot, normalized DOM, visible text, SEO metadata, headings, internal links, third-party scripts and performance figures. It deliberately creates no change events - there is nothing to compare against yet.",
              },
              {
                title: "Approve the baseline",
                text: "Review what was captured and approve it. That approved state becomes the reference every future scan is compared against, which is what separates MyKavo from tools that compare each check against the previous one.",
              },
              {
                title: "Turn on alerts and let it run",
                text: "Email alerts are off until you enable them in Notifications - MyKavo will monitor and record changes either way, but it will not email you until you ask it to. Scans then run weekly on Free and daily on Pro, and you can run one manually at any time.",
              },
            ],
          },
          { type: "h2", text: "What happens after the first scan" },
          {
            type: "p",
            text: "Each scheduled scan captures the same set of measurements and compares them with the approved baseline. Anything that differs becomes a change event with a severity, a category, the previous value, the current value, and - for visual differences - a before screenshot, an after screenshot and a pixel diff.",
          },
          {
            type: "p",
            text: "You then do one of two things with each change. If it was expected, approve it: the new state becomes the baseline and it stops alerting. If it was not, fix the site and rescan. That loop is the entire product.",
          },
          {
            type: "note",
            text: "A first scan that finds problems is normal. The baseline records what your site looks like now, not what it should look like - run the site audit separately to find pre-existing issues.",
          },
        ],
        faqs: [
          {
            q: "How long does the first scan take?",
            a: "Usually under a minute for a handful of pages. Scans run asynchronously on MyKavo's own infrastructure, so you can close the tab - the dashboard updates when it finishes.",
          },
          {
            q: "Do I need to install anything on my website?",
            a: "No. MyKavo visits your pages the way a browser does. There is no script to embed and no DNS change. On WordPress there is an optional free plugin that checks the site after every update - see the WordPress plugin guide.",
          },
          {
            q: "Will MyKavo slow my site down?",
            a: "No. A scan is a small number of page loads at a scheduled time - far less traffic than a search engine crawler, and nothing at all between scans.",
          },
        ],
      },
      {
        slug: "choosing-pages-to-monitor",
        title: "Choosing which pages to monitor",
        description:
          "Monitored-page slots are limited on every plan. How to spend them on the pages where a regression actually costs you money.",
        keywords: ["which pages to monitor", "website monitoring best practices"],
        capsule:
          "Monitor the pages where a silent break costs money or trust: the homepage, pricing, checkout or enquiry path, your top organic landing pages, and anything with a form. Skip pages that change constantly by design, like a blog index or a news feed - they generate noise without telling you anything you did not expect.",
        blocks: [
          { type: "h2", text: "Start with the pages that carry revenue" },
          {
            type: "ul",
            items: [
              "Homepage - the page most likely to be edited by someone other than you.",
              "Pricing - a wrong price is the most expensive kind of silent change.",
              "Checkout, booking or enquiry pages - where a missing button costs a sale directly.",
              "Your best-performing organic landing pages - if you use Search Console, MyKavo can show you which ones those are.",
              "Any page carrying a third-party script you depend on: analytics, tag manager, payment, chat.",
            ],
          },
          { type: "h2", text: "Pages that are usually a poor use of a slot" },
          {
            type: "ul",
            items: [
              "Blog indexes, news feeds and anything paginated - they change on purpose, constantly.",
              "Pages with rotating testimonials, carousels or personalised content, unless you mask the volatile region.",
              "Staging or preview URLs that are meant to change.",
              "Near-identical template pages - monitor two or three representative ones rather than forty.",
            ],
          },
          { type: "h2", text: "If a page you need is noisy" },
          {
            type: "p",
            text: "You do not have to give up on it. Use ignored selectors to exclude an element from comparison entirely, or screenshot masks to paint over a region so it cannot trigger a visual difference. A page with a live counter or an ad slot is perfectly monitorable once that region is excluded.",
          },
        ],
      },
      {
        slug: "reading-a-change",
        title: "Reading a change and deciding what to do",
        description:
          "What each field on a change means, what the severity levels are for, and when to approve rather than fix.",
        keywords: ["website change alert", "regression monitoring workflow"],
        capsule:
          "Every change tells you what changed, where, when, what it was before, what it is now, and how severe MyKavo thinks it is. You then either approve it - making the new state the baseline - or treat it as a regression, fix the site and rescan. Approving is not dismissing: it moves the reference point.",
        blocks: [
          { type: "h2", text: "What a change record contains" },
          {
            type: "table",
            head: ["Field", "What it tells you"],
            rows: [
              ["Category", "Availability, visual, SEO, content, links, script, performance or conversion."],
              ["Severity", "INFO through CRITICAL, from a central rules engine rather than a per-check guess."],
              ["Page", "The exact URL the change was found on."],
              ["Previous value", "What the baseline recorded - the actual old title, canonical, status code or screenshot."],
              ["Current value", "What this scan found instead."],
              ["Detected at", "When the scan that found it ran."],
              ["Evidence", "For visual changes, the before and after screenshots and a pixel diff image."],
            ],
          },
          { type: "h2", text: "Approve, or fix" },
          {
            type: "p",
            text: "Approving a change means \"this was intentional\". The current state becomes the new approved baseline, the change stops appearing as open, and future scans compare against the new state. Use it after a redesign, a deliberate copy change, or a planned price update.",
          },
          {
            type: "p",
            text: "If a change was not intentional, it is a regression. Fix the site, then run a scan. When the page matches the baseline again the change resolves. Nothing is silently discarded - the history stays, which is what makes it possible to answer \"when did this break?\" weeks later.",
          },
          {
            type: "note",
            text: "Ignoring a change is different from approving it. Ignoring hides this occurrence without moving the baseline, so the same difference will be detected again on the next scan.",
          },
        ],
      },
    ],
  },
  {
    slug: "monitoring",
    title: "What MyKavo monitors",
    description:
      "Reference for every category of check, how severity is decided, and how to stop a monitor crying wolf.",
    articles: [
      {
        slug: "what-mykavo-checks",
        title: "Every check MyKavo runs",
        description:
          "The complete list of what is captured on each scan and compared against your approved baseline.",
        keywords: ["website monitoring checks", "what does mykavo monitor", "seo change monitoring"],
        capsule:
          "On every scan MyKavo captures a full-page screenshot, the normalized DOM, visible text, SEO metadata, headings, structured data, internal links, third-party scripts and performance figures for each monitored page, then compares all of it against your approved baseline. Uptime and SSL are checked separately, every five minutes.",
        blocks: [
          { type: "h2", text: "Availability" },
          {
            type: "p",
            text: "HTTP status, final URL after redirects, and redirect behaviour. A page that starts returning 404 or 500, or that begins redirecting somewhere new, is among the highest-severity things MyKavo can find.",
          },
          { type: "h2", text: "Visual" },
          {
            type: "p",
            text: "A full-page screenshot at a fixed viewport, device scale and locale, with animations disabled and fonts loaded, compared pixel by pixel against the baseline screenshot. You get a difference percentage, the two images, and a diff image showing what moved.",
          },
          { type: "h2", text: "SEO" },
          {
            type: "ul",
            items: [
              "Title tag",
              "Meta description",
              "Canonical URL",
              "Robots meta and indexability signals",
              "H1 count and values",
              "Structured data",
            ],
          },
          { type: "h2", text: "Content" },
          {
            type: "p",
            text: "The DOM is normalized before comparison - comments removed, volatile attributes and framework hydration markers stripped, whitespace and attribute order normalized - so that a rebuild which changes nothing visible does not register as a change. Visible text is hashed and compared separately.",
          },
          { type: "h2", text: "Links" },
          {
            type: "p",
            text: "Internal links are extracted and checked, and results are grouped: seventeen newly broken links arrive as one alert, not seventeen emails. Added and removed links are tracked, as are destination status changes.",
          },
          { type: "h2", text: "Scripts" },
          {
            type: "p",
            text: "Third-party scripts are extracted and normalized, so you are told when analytics, a tag manager, a payment script or a chat widget appears or disappears. A vanished analytics script is the classic silent failure - the site works perfectly and you stop being able to measure it.",
          },
          { type: "h2", text: "Performance" },
          {
            type: "p",
            text: "Response time, page weight and request count, compared as percentage regressions rather than absolute thresholds. MyKavo is not a replacement for a dedicated performance monitoring platform and does not claim to be; it catches the step change when a page suddenly doubles in weight.",
          },
          { type: "h2", text: "Conversion elements" },
          {
            type: "p",
            text: "You name a CSS selector and what you expect of it - that it exists, that it is visible, its text, where it links. MyKavo checks each one on every scan, so \"the Start Free Trial button is missing from /pricing\" becomes an alert rather than a support ticket.",
          },
          { type: "h2", text: "Uptime and SSL" },
          {
            type: "p",
            text: "Checked every five minutes, independently of page scans, with downtime incidents recorded and certificate expiry warned about in advance.",
          },
          { type: "h2", text: "What MyKavo does not do" },
          {
            type: "ul",
            items: [
              "Keyword rank tracking, backlink analysis or competitor research.",
              "Monitoring websites you do not own or manage.",
              "Spelling and grammar checking.",
              "Mail server, DNS or file-transfer monitoring.",
              "Synthetic transaction testing or full Lighthouse monitoring on every scan.",
            ],
          },
        ],
      },
      {
        slug: "severity-levels",
        title: "How severity is decided",
        description:
          "The five severity levels, worked examples of each, and why the same change always scores the same way.",
        keywords: ["change severity", "website monitoring alerts severity"],
        capsule:
          "MyKavo scores every change from INFO to CRITICAL using a central, deterministic rules engine - not a model and not a per-check guess. The same change always produces the same severity, which is what makes the number worth acting on and what lets you filter alerts by it without missing things.",
        blocks: [
          { type: "h2", text: "The five levels" },
          {
            type: "table",
            head: ["Severity", "Means", "Examples"],
            rows: [
              [
                "CRITICAL",
                "The page is broken or has been removed from search.",
                "200 becomes 404 or 500; index becomes noindex; a critical conversion element is missing.",
              ],
              [
                "HIGH",
                "Something important changed that probably was not intended.",
                "Canonical tag removed or changed; title removed; analytics script disappeared; redirect destination changed.",
              ],
              [
                "MEDIUM",
                "A meaningful change worth a look.",
                "Title changed; a new redirect appeared; page weight up more than 20%.",
              ],
              ["LOW", "A small change, usually benign.", "Meta description edited; minor copy change."],
              ["INFO", "Recorded for history, not worth interrupting you.", "Tiny visual differences below the noise threshold."],
            ],
          },
          { type: "h2", text: "Why the rules are central" },
          {
            type: "p",
            text: "Severity lives in one rules engine rather than being decided inside each check. That means it is testable, it is consistent between categories, and changing how seriously MyKavo treats something is a single deliberate edit rather than a hunt through the codebase. It also means the score is explainable: there is a rule behind it you can be told about.",
          },
          { type: "h2", text: "Visual difference is an input, not the answer" },
          {
            type: "p",
            text: "A large pixel difference does not automatically mean a high severity, and a small one does not mean a low one. A 2% visual difference that removed your checkout button matters far more than a 40% difference caused by a new hero image. Visual difference percentage feeds the severity engine alongside everything else rather than deciding it.",
          },
        ],
      },
      {
        slug: "reducing-false-positives",
        title: "Reducing false positives",
        description:
          "Ignored selectors, screenshot masks, thresholds and baseline approval - the tools for making alerts trustworthy.",
        keywords: ["false positives website monitoring", "ignore dynamic content monitoring"],
        capsule:
          "A monitor you stop trusting is worse than no monitor. MyKavo stabilises pages before capture, normalizes the DOM, and gives you ignored selectors and screenshot masks for the regions that change by design - so alerts stay rare enough to be worth reading.",
        blocks: [
          { type: "h2", text: "What MyKavo does automatically" },
          {
            type: "ul",
            items: [
              "Waits for DOMContentLoaded, for fonts where possible, and for a bounded network-quiet period - never waiting indefinitely.",
              "Disables CSS animations and transitions, and hides text cursors, so nothing mid-animation is captured.",
              "Captures at a fixed viewport, device scale factor, locale and timezone, so identical pages produce identical bytes.",
              "Normalizes the DOM before hashing: comments, volatile attributes, nonces and framework hydration markers removed.",
              "Applies a noise threshold so sub-1% visual differences are ignored rather than reported.",
            ],
          },
          { type: "h2", text: "What you can configure" },
          {
            type: "h3",
            text: "Ignored selectors",
          },
          {
            type: "p",
            text: "Elements matching these CSS selectors are removed before comparison entirely. Use them for live counters, \"last updated\" timestamps, rotating testimonials and anything personalised.",
          },
          { type: "h3", text: "Screenshot masks" },
          {
            type: "p",
            text: "Elements matching these selectors are painted over with a solid block in the screenshot only. The mask colour is fixed, so a masked region is byte-identical between scans regardless of what was underneath. Use them for ad slots and third-party embeds you cannot control.",
          },
          { type: "h3", text: "Baseline approval" },
          {
            type: "p",
            text: "The strongest tool of the four. Approving an expected change moves the reference point, so a redesign produces one round of changes you approve rather than a permanent stream of differences against a state that no longer exists.",
          },
          {
            type: "note",
            text: "If one page is generating most of your alerts, that is usually a masking problem rather than a threshold problem. Look at the diff image and mask the region that keeps moving.",
          },
        ],
      },
    ],
  },
  {
    slug: "platform",
    title: "Plans, security and data",
    description:
      "Limits by plan, how MyKavo crawls responsibly, and what happens to your data when you delete something.",
    articles: [
      {
        slug: "plans-and-limits",
        title: "Plans and limits",
        description:
          "What the Free, Pro and Agency plans include, what the limits are, and how they are enforced.",
        keywords: ["mykavo pricing", "website monitoring pricing", "free website monitoring"],
        capsule:
          "MyKavo has three plans. Free covers one website with five monitored pages, weekly scans and 30 days of history, with no card required. Pro is $20 a month for eight websites with fifteen monitored pages each, daily scans, a year of history and three seats. Agency is $49 a month for thirty websites with twenty-five pages each, white-label client reports and fifteen seats. Limits are enforced on the server, not in the interface.",
        blocks: [
          {
            type: "table",
            head: ["", "Free", "Pro", "Agency"],
            rows: [
              ["Price", "$0", "$20 / month", "$49 / month"],
              ["Websites", "1", "8", "30"],
              ["Monitored pages per website", "5", "15", "25"],
              ["Scan frequency", "Weekly", "Daily", "Daily"],
              ["History retained", "30 days", "1 year", "1 year"],
              ["Workspace seats", "1", "3", "15"],
              ["Manual scans", "-", "20 a day", "100 a day"],
              ["White-label client reports", "-", "-", "Included"],
              ["Site audit pages per crawl", "150", "1,500", "2,000"],
              ["Uptime and SSL monitoring", "Included", "Included", "Included"],
              ["Email, Slack, Discord and webhook alerts", "Included", "Included", "Included"],
              ["WordPress plugin", "Included", "Included", "Included"],
              ["WordPress Safe Updates (a check after every update)", "-", "Included", "Included"],
            ],
          },
          { type: "h2", text: "Changing plans" },
          {
            type: "p",
            text: "Upgrading from Pro to Agency applies immediately, and you pay only the prorated difference for the rest of the billing period. Moving from Agency back to Pro takes effect at the end of the period you have already paid for. Pro subscriptions that began before the Agency plan launched keep white-label client reports and five seats for as long as the subscription continues.",
          },
          { type: "h2", text: "How limits are enforced" },
          {
            type: "p",
            text: "Every limit is checked on the server when the action is attempted. The interface also shows you when you are at a limit, but that is a convenience - it is not what stops you exceeding it. This matters because it means limits cannot be bypassed by calling the API directly.",
          },
          { type: "h2", text: "What happens when history expires" },
          {
            type: "p",
            text: "Scans and change events older than your plan's retention window are deleted by a nightly sweep, along with their screenshots and diff images. Snapshots referenced by an approved baseline are protected from that sweep regardless of age - your reference point is never deleted out from under you.",
          },
        ],
      },
      {
        slug: "wordpress-plugin",
        title: "The WordPress plugin: install, connect and Safe Updates",
        description:
          "How to install and connect the MyKavo WordPress plugin, what Safe Updates checks, and what the plugin sends to MyKavo.",
        keywords: [
          "mykavo wordpress plugin",
          "wordpress update broke site",
          "check wordpress site after update",
          "wordpress safe updates",
        ],
        capsule:
          "The MyKavo WordPress plugin brings a site's monitoring into wp-admin and adds Safe Updates: when WordPress updates a plugin, theme, translation or itself, or a plugin is activated or deactivated, MyKavo checks the site straight away and names the update on every change it finds. It is free on every plan; automatic checks need Pro or Agency. It adds nothing to the pages visitors load.",
        blocks: [
          {
            type: "steps",
            name: "Install and connect the MyKavo WordPress plugin",
            description: "Add the plugin to a WordPress site and link it to the site's website in MyKavo.",
            items: [
              {
                title: "Install the plugin",
                text: "In WordPress go to Plugins > Add New, search for MyKavo, and install MyKavo - Website Change Monitoring. It is listed at wordpress.org/plugins/mykavo. You need to be an administrator.",
              },
              {
                title: "Activate it",
                text: "Activate the plugin. To install it by hand instead, download the zip from wordpress.org/plugins/mykavo and upload it under Plugins > Add New > Upload Plugin - it is the same plugin.",
              },
              {
                title: "Connect",
                text: "Open MyKavo in the admin menu and press Connect to MyKavo. Sign in, or create a free account, choose which MyKavo website this site is, and approve. If the site is not in MyKavo yet, the approval screen offers to add it first.",
              },
              {
                title: "Check Safe Updates is on",
                text: "Open the Safe Updates tab. The switch is on by default. From now on every update is listed there with a verdict.",
              },
            ],
          },
          { type: "h2", text: "What Safe Updates checks" },
          {
            type: "ul",
            items: [
              "Plugin, theme, WordPress and translation updates, whether you pressed Update or WordPress updated automatically.",
              "A plugin being activated or deactivated, and the active theme being switched.",
              "Several updates in one go (a bulk update, or the nightly automatic run) are reported once, as one check.",
            ],
          },
          {
            type: "p",
            text: "When the update finishes the plugin tells MyKavo what changed, with the old and new versions, and MyKavo runs a deploy check: every monitored page is compared with its approved baseline. The result appears in the Safe Updates tab as \"Verified - nothing changed\" or \"3 changes found after this update\", and every change found is labelled with the update it appeared after. The same verdict goes to your email and chat alerts if you use them.",
          },
          {
            type: "note",
            text: "Automatic checks are part of Pro and Agency. On the Free plan every update is still listed, so you know what changed and when, but no check runs.",
          },
          { type: "h2", text: "Other things the plugin adds" },
          {
            type: "ul",
            items: [
              "The MyKavo screen: status, uptime, response time and SSL, changes with before-and-after screenshots, one-click approve, fixed or ignore, scan history and monitored pages.",
              "A \"Monitor with MyKavo\" link under every published page and post, and an address box on the Pages tab.",
              "With WooCommerce active, a store guard that shows whether Shop, Cart, Checkout and My account are monitored and adds the missing ones.",
              "A warning on the Plugins screen for a plugin whose last update changed the site.",
              "A MyKavo test in Tools > Site Health and a MyKavo section in its Info tab.",
              "WP-CLI commands: wp mykavo status, changes, scan --wait, monitor, updates, safe-updates and disconnect.",
            ],
          },
          { type: "h2", text: "Performance and privacy" },
          {
            type: "p",
            text: "The plugin adds nothing to the pages visitors load: no scripts, styles, database queries or remote requests, no autoloaded options and no cron jobs. It sends MyKavo only the site's address when connecting, the names and versions of what was updated or switched on or off, the addresses of pages you choose to monitor, and the actions you take on the MyKavo screen. Nothing about visitors is sent. The connection key stays on your server and works for that one website only.",
          },
          { type: "h2", text: "Disconnecting" },
          {
            type: "p",
            text: "Disconnect from the MyKavo screen's menu, from Settings > WordPress sites in the MyKavo dashboard, or by deleting the website in MyKavo. Deleting the plugin removes everything it stored on the site. Monitoring in your MyKavo account is not affected.",
          },
        ],
        faqs: [
          {
            q: "Does the plugin slow WordPress down?",
            a: "No. Nothing runs on the pages visitors load. The plugin works inside wp-admin and right after an update, and scanning happens on MyKavo's servers.",
          },
          {
            q: "Which WordPress and PHP versions are supported?",
            a: "WordPress 6.2 or newer, tested up to 7.1, on PHP 7.4 or newer.",
          },
        ],
      },
      {
        slug: "supabase",
        title: "Supabase: check your site when content or code changes",
        description:
          "Use a Supabase Database Webhook, or a trigger with pg_net, to start a MyKavo check whenever content is published, and monitor the pages of apps built on Supabase.",
        keywords: [
          "supabase website monitoring",
          "supabase database webhook",
          "supabase pg_net webhook",
          "monitor supabase app changes",
        ],
        capsule:
          "MyKavo checks the public pages of sites and apps built on Supabase, and it can run a check the moment your data changes. Point a Supabase Database Webhook, or a trigger that calls pg_net, at your website's MyKavo deploy hook. When content is published, MyKavo compares every monitored page with its approved baseline and reports what changed.",
        blocks: [
          { type: "h2", text: "What the integration does" },
          {
            type: "ul",
            items: [
              "Content-driven sites often read pages straight from Supabase tables, so a single row can change what visitors see. The integration starts a MyKavo check when that happens, instead of waiting for the next scheduled scan.",
              "The check compares every monitored page with its approved baseline: status codes, titles, meta descriptions, canonicals, robots tags, visible content, screenshots, scripts and the buttons and forms you marked as conversion elements.",
              "The verdict goes to your alert channels: \"Deploy verified\" when nothing important changed, or the list of changes with before-and-after evidence.",
            ],
          },
          {
            type: "note",
            text: "Deploy checks are part of the Pro and Agency plans, and each check counts toward the plan's daily on-demand scan quota. Trigger checks on meaningful events such as publishing, not on every row edit.",
          },
          {
            type: "steps",
            name: "Start a MyKavo check from a Supabase Database Webhook",
            description: "Connect a Supabase table to MyKavo so that publishing content starts a check of the website.",
            items: [
              {
                title: "Copy your deploy hook URL",
                text: "In MyKavo open the website, go to Deploy checks and press Enable deploy checks. Copy the deploy hook URL. It is a secret: anyone with it can start checks for this website.",
              },
              {
                title: "Create a Database Webhook in Supabase",
                text: "In the Supabase dashboard open Database Webhooks and create a new webhook. Choose the table that holds your published content and the events that matter, usually Insert and Update.",
              },
              {
                title: "Point it at MyKavo",
                text: "Set the type to HTTP Request, the method to POST and the URL to your deploy hook URL. Keep the Content-Type header as application/json. MyKavo ignores the row data Supabase sends.",
              },
              {
                title: "Publish something",
                text: "Publish or update a row. The website's scan history in MyKavo shows a new deploy check within seconds, and the verdict arrives when it finishes.",
              },
            ],
          },
          { type: "h2", text: "Only on publish: a trigger with pg_net" },
          {
            type: "p",
            text: "A Database Webhook fires on every matching event. To check only when a post goes live, call the hook from a trigger with the pg_net extension, and keep the URL in Supabase Vault rather than in your SQL. The example assumes a posts table with a boolean published column; adjust the names to your schema.",
          },
          {
            type: "code",
            language: "SQL",
            text: `-- Once: enable pg_net and store the hook URL as a Vault secret.
create extension if not exists pg_net;
select vault.create_secret('https://mykavo.app/api/hooks/deploy/YOUR_TOKEN', 'mykavo_deploy_hook');

create or replace function public.mykavo_check_on_publish()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  hook_url text;
begin
  select decrypted_secret into hook_url
  from vault.decrypted_secrets
  where name = 'mykavo_deploy_hook';

  if hook_url is not null then
    perform net.http_post(
      url := hook_url,
      body := jsonb_build_object('note', 'Content published in Supabase'),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return new;
end;
$$;

create trigger mykavo_check_on_publish
after insert or update of published on public.posts
for each row
when (new.published is true)
execute function public.mykavo_check_on_publish();`,
          },
          {
            type: "p",
            text: "The optional note (up to 140 characters) appears in the scan history and in the verdict, so you can tell which change started the check. pg_net sends the request asynchronously, so publishing is never slowed down or blocked by MyKavo.",
          },
          { type: "h2", text: "After you deploy code" },
          {
            type: "p",
            text: "Front ends on Supabase are usually deployed from CI or a host such as Vercel or Netlify. Add one step after the deploy that sends a POST to the same deploy hook URL, for example with curl and a JSON body like {\"note\":\"v1.4.0\"}. The same check runs, labelled with your release.",
          },
          { type: "h2", text: "What to monitor on a Supabase app" },
          {
            type: "ul",
            items: [
              "Public pages rendered from your tables: the home page, listings and detail pages that bring in search traffic.",
              "Sign-up and log-in pages, with the form and its submit button added as conversion elements, so a broken auth screen is a critical alert.",
              "Pricing and checkout pages, and any page that loads analytics or payment scripts.",
            ],
          },
          {
            type: "p",
            text: "MyKavo loads pages the way a signed-out visitor does. It does not sign in, so it cannot check pages behind authentication, and it never connects to your database: the only link is the webhook you create.",
          },
          { type: "h2", text: "Security" },
          {
            type: "ul",
            items: [
              "The deploy hook URL works for one website and can only start a check. It cannot read data or change settings.",
              "If the URL leaks, regenerate it under Deploy checks. The old URL stops working immediately; update the Vault secret or webhook with the new one.",
              "Repeated calls are rate limited, and a call that arrives while a check is already running does not start a second one.",
            ],
          },
        ],
        faqs: [
          {
            q: "Does MyKavo need access to my Supabase project?",
            a: "No. MyKavo never connects to your database or API. Supabase calls MyKavo's deploy hook when your data changes, and MyKavo checks your public pages from the outside.",
          },
          {
            q: "Will a bulk import start hundreds of checks?",
            a: "No. The hook is rate limited and a check that is already running absorbs further calls. For bulk jobs, prefer a trigger that fires only when content is published, or call the hook once at the end of the job.",
          },
        ],
      },
      {
        slug: "how-mykavo-crawls",
        title: "How MyKavo crawls, and how it protects your network",
        description:
          "The user agent, robots.txt handling, request limits, and the SSRF protections applied to every URL.",
        keywords: ["mykavo bot", "website monitoring crawler", "ssrf protection"],
        capsule:
          "MyKavo identifies itself as MyKavoBot, respects robots.txt, and crawls within bounded limits rather than indefinitely. Every URL it is asked to fetch - including ones discovered from your own sitemap - is independently validated against private, loopback, link-local and cloud-metadata address ranges before any request is made.",
        blocks: [
          { type: "h2", text: "Identifying itself" },
          {
            type: "p",
            text: "Scans use a user agent naming MyKavoBot and linking to a page explaining what it is, so your logs and your firewall can tell what the traffic is. MyKavo does not disguise itself as a normal browser.",
          },
          { type: "h2", text: "Respecting robots.txt" },
          {
            type: "p",
            text: "robots.txt is read during discovery and respected. MyKavo does not include a setting to bypass it.",
          },
          { type: "h2", text: "Why every URL is re-validated" },
          {
            type: "p",
            text: "A monitoring service fetches URLs supplied by its users, which makes it an attractive way to reach things the internet cannot otherwise see - internal dashboards, cloud metadata endpoints, services on a private network. MyKavo therefore treats every URL as untrusted, no matter where it came from.",
          },
          {
            type: "ul",
            items: [
              "Only HTTP and HTTPS are allowed; URLs containing credentials are rejected.",
              "DNS is resolved and the resulting address checked before the request is made.",
              "Localhost, loopback, private, link-local and reserved ranges are blocked, as are cloud metadata endpoints.",
              "Redirects are re-validated at every hop, with a maximum redirect count - a public URL that redirects to an internal one is stopped at the redirect.",
              "Request timeouts, maximum response size, and per-workspace rate limits are all enforced.",
            ],
          },
          {
            type: "note",
            text: "This applies to URLs found in your sitemap and in your page HTML too, not just ones typed into the dashboard. Discovered URLs are not more trusted than typed ones.",
          },
          { type: "h2", text: "Bounded crawling" },
          {
            type: "p",
            text: "Discovery has maximum page counts, maximum discovered URLs and a maximum scan duration. MyKavo will not crawl a large site indefinitely, which protects your server as much as its own.",
          },
        ],
      },
      {
        slug: "your-data",
        title: "Your data, and what deletion actually deletes",
        description:
          "What MyKavo stores, where screenshots live, and what happens when you delete a website or an account.",
        keywords: ["mykavo data retention", "delete website monitoring data"],
        capsule:
          "MyKavo stores page measurements and screenshots for the retention window your plan allows. Screenshots live in object storage, never in the database. Deleting a website removes its scans, snapshots and change events immediately, and queues its screenshots and diff images for deletion from object storage.",
        blocks: [
          { type: "h2", text: "What is stored" },
          {
            type: "ul",
            items: [
              "Per-page measurements: status codes, timings, hashes, SEO metadata, headings, links, scripts and page weight.",
              "Full-page screenshots, stored in object storage and capped at 150KB each.",
              "Change events with previous and current values, plus diff images for visual changes.",
              "Account and workspace records, and notification history.",
            ],
          },
          { type: "h2", text: "What deletion does" },
          {
            type: "p",
            text: "Deleting a website removes it and everything belonging to it from the database in one transaction: monitored pages, scans, snapshots, baselines and change events. Its screenshots and diff images are then queued for deletion from object storage and removed by a worker, usually within seconds.",
          },
          {
            type: "p",
            text: "Screenshots are stored content-addressed, meaning two pages that look identical share one stored image. Deletion is therefore reference-counted: an image is only removed once nothing else points at it, so deleting one website can never blank another one's history.",
          },
          { type: "h2", text: "Retention" },
          {
            type: "p",
            text: "Scan history older than your plan's window is removed nightly, along with the associated artifacts. Snapshots referenced by an approved baseline are exempt - the baseline is your reference point and is not aged out.",
          },
        ],
      },
    ],
  },
];

export function findDocSection(slug: string): DocSection | undefined {
  return DOC_SECTIONS.find((s) => s.slug === slug);
}

export function findDocArticle(
  sectionSlug: string,
  articleSlug: string,
): { section: DocSection; article: DocArticle } | undefined {
  const section = findDocSection(sectionSlug);
  const article = section?.articles.find((a) => a.slug === articleSlug);
  return section && article ? { section, article } : undefined;
}

/** Every article, flattened - for the sitemap and the docs index. */
export function allDocArticles(): { section: DocSection; article: DocArticle }[] {
  return DOC_SECTIONS.flatMap((section) =>
    section.articles.map((article) => ({ section, article })),
  );
}
