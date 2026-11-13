=== MyKavo - Website Change Monitoring ===
Contributors: dakshu007
Tags: monitoring, change detection, seo, uptime, screenshots
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.3.2
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Know when an update breaks your site. MyKavo checks your pages after every plugin, theme and WordPress update. Zero front-end impact.

== Description ==

Updates are the number one way WordPress sites break. A plugin, theme or WordPress update, often an automatic one overnight, quietly changes a layout, removes a checkout button or sets a page to "noindex". Usually a customer notices first, and nobody knows which update did it.

MyKavo watches the pages that matter on your site and tells you when something important changes or breaks. This plugin brings that monitoring into WordPress and adds **Safe Updates**: after every update, MyKavo checks your pages and tells you whether it broke something, and exactly which update it was.

= Safe Updates =

* **Every update is checked:** plugins, themes, WordPress and translations, manual or automatic, plus plugin activations and theme switches.
* **A clear verdict:** "Verified, nothing changed" or "3 changes found after this update", with before-and-after evidence.
* **The culprit, named:** "Appeared after: Updated WooCommerce 8.1.0 → 8.2.0".
* **Know before you update:** the Plugins screen flags a plugin whose last update changed things on your site.
* **One-click rollback** for plugins from WordPress.org, on every plan including free.
* Update checks come with every paid plan. On Free, updates are still listed and rollback works.

= Free safety tools =

* **Snapshots.** Right before a plugin or theme updates, MyKavo zips its folder (closed to the web), so any of them, premium ones too, can be rolled back for seven days.
* **"Did it crash?"** Seconds after an update the site loads its home page and up to three monitored pages and looks for errors, with a "Roll back now" button if one broke.
* **Safe Update All.** Optional UpdraftPlus backup, then plugins update one at a time, each checked, and any that breaks the site is rolled back.
* **Silent-disaster alerts.** Search engines discouraged, site address, permalinks or admin email changed, or a new administrator: a notice on every wp-admin screen. Paid plans also get email or Slack alerts.
* **For agencies.** A read-only "MyKavo viewer" role, and a Network Admin overview on multisite.

= Paid plan extras =

* **Automatic rollback (Pro, Agency):** when MyKavo's check finds a critical change after a plugin update, those plugins go back to their previous version.
* **Update windows (Agency):** automatic updates only on the days and hours you choose.
* **Plugin health and known vulnerabilities:** abandoned plugins and plugins with known security issues flagged; Pro and Agency can update vulnerable ones automatically.
* **Update risk:** how the same update went on other MyKavo sites, shown next to "Update now".
* **Watch buttons and forms:** pick the button, link or form that matters and get alerted if it disappears or changes; the block editor warns before you remove one. Contact forms are checked too.
* **Site report (Agency):** the last 30 days on one branded page, ready to share.

= AI Keywords & Blog Writer drafts =

Write a post with MyKavo's AI Keywords & Blog Writer, click "Save as draft in WordPress", and it appears under Posts as a draft with its title, slug, meta description, FAQ and schema. Yoast SEO and Rank Math fields are filled in when either is active. Nothing is ever published for you: you review the draft and publish it.

= See which AI reads your site =

* **AI crawler visits:** ChatGPT, Claude, Perplexity and other AI crawlers, which pages they read, and errors served to them.
* **Block AI training, allow AI search (free):** one switch writes the robots.txt rules, or allow and block each crawler yourself.
* **Real or fake (free):** OpenAI, Perplexity and Amazon crawlers are verified, so fakes are counted separately.
* **Fix errors served to AI (free):** one-click redirects for addresses that answered a crawler with 404.
* **llms.txt (free):** your site's name, description and important pages for AI assistants; paid plans add a summary of each page.

Crawlers are counted by their User-Agent name only: no IP addresses, no cookies, nothing about human visitors.

= Built for WooCommerce =

MyKavo shows whether your Shop, Cart, Checkout and My account pages are monitored and adds the missing ones in one click. On Pro and Agency, **Guard checkout** also watches the Place order, Proceed to checkout and Add to cart buttons.

= What you see in WordPress =

* One clear status, with a badge in the admin menu
* Before-and-after screenshots with a slider and highlighted differences
* The exact old and new values: title, meta description, robots tag, canonical, button text
* Severity from Critical to Info, with noise filtered out
* Accept a change as the new baseline, mark it fixed, or ignore it
* Scans on demand, uptime, response time and SSL expiry
* A Dashboard widget, Site Health integration and WP-CLI (`wp mykavo status`, `wp mykavo scan --wait` and more)

= What MyKavo detects =

* Pages that go down or return errors
* Visual changes against an approved baseline
* SEO changes: title, meta description, canonical, noindex, headings, structured data
* Broken internal links
* Tracking scripts added or removed (Google Analytics, Tag Manager, Meta Pixel and others)
* Performance regressions: page weight, request count, response time
* Missing or changed buttons and forms you watch

= Built to never slow your site down =

* **Nothing for your visitors.** No scripts, styles or remote requests on public pages. Two quick text matches spot AI crawlers and answer /llms.txt; a redirect is looked up only on a request that is already a 404. Posts saved from the AI Blog Writer get their schema in the page head.
* **The scanning runs on MyKavo's servers**, not yours. Small WP-Cron jobs send daily totals and collect AI Blog Writer drafts.
* **No autoloaded options**, admin scripts only on MyKavo's screens, and short, cached requests.

= Secure by design =

* Connecting uses an OAuth-style approval with PKCE, and the key works for this one website only.
* The key stays on your server; your browser never sees it.
* Only administrators can act on monitoring. Disconnect at any time.

= Plans =

MyKavo has a free plan: 1 website, 5 monitored pages and weekly scans, no card required. Paid plans add daily scans, more websites and pages, manual scans and more. See [mykavo.app/pricing](https://mykavo.app/pricing).

== External services ==

This plugin connects your site to MyKavo (https://mykavo.app), a website monitoring service operated by MyKavo. It does not work without a MyKavo account.

**What is sent, and when:**

* **When you press "Connect to MyKavo":** your browser is sent to mykavo.app with your site's address, its name, its WordPress admin address, the plugin and WordPress version numbers, and one-time security values for the connection. Your site's server then sends a one-time code and your site's address to mykavo.app to finish connecting.
* **After WordPress updates plugins, themes, translations or itself, and after a plugin is activated or deactivated or the theme is switched:** your site's server sends the names and version numbers of what changed, and whether the update was automatic, so MyKavo can check the site. You can switch this off on the Safe Updates screen.
* **When you add a page to monitoring** (the "Monitor with MyKavo" link, the Pages tab, the store guard or WP-CLI): the page's address and title.
* **While an administrator views a MyKavo screen or runs a `wp mykavo` command:** your site's server requests this website's monitoring data from mykavo.app, and sends the actions you take (for example "approve this change" or "run a scan").
* **Screenshots** of your pages are loaded by the administrator's browser directly from mykavo.app, using links that expire after 30 minutes.
* **Once a day, while connected (WP-Cron):** the AI crawler totals for the last 14 days - for each day and crawler name, the number of visits, how many got an error, and the paths of the 10 most-visited pages. No IP addresses or visitor data. You can switch this off on the AI crawlers screen.
* **Once a day, while connected (WP-Cron), for plugin health:** the folder name, name, version and active state of each installed plugin. The plugin also reads this website's MyKavo settings (the update window), and refreshes them at most every ten minutes while WordPress is deciding on automatic updates.
* **After a plugin update, on plans with automatic rollback:** your site's server asks mykavo.app for the result of the check every five minutes, for up to 40 minutes.
* **When a plugin is rolled back (by you, or automatically):** the plugin's earlier version is downloaded from WordPress.org (https://downloads.wordpress.org, operated by the WordPress.org project; see https://wordpress.org/about/privacy/), the same way WordPress downloads any plugin update. The rollback (plugin name and versions) is then reported to mykavo.app so it can check the site again.
* **When you press Guard checkout:** the addresses of your cart page, checkout page and one product page.
* **AI Blog Writer drafts, while connected:** when an administrator or editor opens wp-admin (at most once a minute), every 15 minutes from WP-Cron, and when mykavo.app signals that a draft is waiting, your site's server asks mykavo.app for drafts saved for this site, then reports back the ID and edit link of each draft it created.
* **When you disconnect:** your site tells mykavo.app to revoke its key.
* **When an important setting changes** (search engine visibility, site or WordPress address, permalinks, admin email, a new administrator), while connected: from WP-Cron, a few seconds later, the kind of change, the old and new value (for example the new admin email address or administrator's login name), the name of the user who made it, and the time.
* **After an update, the "did it crash?" result:** whether the home page and up to three monitored pages loaded, their status codes and addresses, and what was updated.
* **Safe Update All, on paid plans:** a request to take a fresh baseline before the updates.
* **llms.txt, when switched on, on paid plans:** once a day, the addresses of the pages it lists, to receive a short summary of each.
* **When you ask for redirect suggestions:** the paths that answered AI crawlers with 404.
* **When you pick an element to watch:** the page address, the element's CSS selector, the name you give it, and its text and link.
* **When the Plugins screen opens with updates waiting:** the folder name and the current and offered version of those plugins, to show how the same update went on other MyKavo sites (at most twice a day).
* **Once a day, on paid plans, for contact forms:** the addresses and titles of pages that hold a Contact Form 7, Gravity Forms or WPForms form, and which plugin.
* **On the Site report tab (Agency):** the brand name and colour you save.
* **Once a day, while AI crawler counting is on (WP-Cron):** the plugin downloads the public lists of IP ranges OpenAI (https://openai.com/gptbot.json, searchbot.json and chatgpt-user.json; see https://openai.com/policies/privacy-policy/) and Perplexity (https://www.perplexity.ai/perplexitybot.json and perplexity-user.json; see https://www.perplexity.ai/hub/legal/privacy-policy) publish for their crawlers. Nothing about your site is sent to them; it is a plain download.

Nothing is sent when visitors view your site, and nothing about your human visitors is ever recorded or sent. MyKavo scans your public pages from its own servers, the same way a visitor would.

* Terms of service: https://mykavo.app/terms
* Privacy policy: https://mykavo.app/privacy

== Installation ==

1. Install and activate the plugin.
2. Open **MyKavo** in the admin menu and press **Connect to MyKavo**.
3. Sign in to MyKavo (or create a free account), choose which MyKavo website this site is, and approve.
4. You are back in WordPress with your site's monitoring on screen.

If your site isn't in MyKavo yet, the approval screen offers to add it first; it takes about a minute.

== Frequently Asked Questions ==

= Will this slow down my website? =

No. The plugin adds no scripts, styles, queries or remote requests to the pages your visitors load. The only public-side work is a text match on the User-Agent header; when the visitor is an AI crawler, one counter is updated after the page is built. Everything else runs inside wp-admin, and the scanning happens on MyKavo's servers.

= Why does it count AI crawlers? =

AI search is a growing way people find websites. If ChatGPT, Claude or Perplexity never read your pages, they cannot cite them. The AI crawlers screen shows which ones do, which pages they read, and which pages give them errors. It records crawler names only - never IP addresses or anything about people - and you can switch it off.

= Do I need a MyKavo account? =

Yes. The plugin shows the monitoring MyKavo does for your site. The free plan covers one website with five pages, with no card required.

= Who can see the MyKavo screen? =

Administrators (users who can manage options) can see and do everything. Give a client the "MyKavo viewer" role (or any role the mykavo_view capability) and they can see the MyKavo screen and its Dashboard widget, read-only: they cannot approve changes, run scans, roll back, connect or change settings.

= What is a snapshot, and where is it kept? =

Right before WordPress updates a plugin or theme, MyKavo zips its folder into wp-content/mykavo-snapshots. That folder has an index.php, an .htaccess and a web.config that close it to the web, and the file names are random. The last two snapshots per plugin or theme are kept, for seven days at most, and deleting the plugin deletes them all.

= Does the "did it crash?" check work on every host? =

It loads the site from the site's own server, like WordPress's own Site Health loopback test. If the host blocks those requests, the check says nothing rather than raising a false alarm.

= What happens if I disconnect or delete the plugin? =

Disconnecting revokes this site's key. Deleting the plugin removes everything it stored. Monitoring in your MyKavo account is not affected, and you can connect again at any time.

= How do Safe Updates work? =

When WordPress finishes updating anything, the plugin tells MyKavo what changed (for example "WooCommerce 8.1.0 → 8.2.0"). MyKavo scans your monitored pages against your approved baseline and reports back: nothing changed, or exactly what did. It works for automatic background updates too.

= Do Safe Updates slow down updates? =

No. The plugin reads version numbers while WordPress is already updating, and sends one small report at the end of the request. The scan itself runs on MyKavo's servers.

= Can I use it from the command line? =

Yes. With WP-CLI: `wp mykavo status` shows the site's status, `wp mykavo changes` lists changes, and `wp plugin update --all && wp mykavo scan --wait` updates everything and then waits for MyKavo's verdict, exiting with an error if something important changed. Run `wp help mykavo` for every command.

= Does it check after I activate or deactivate a plugin? =

Yes. Switching a plugin on or off, or changing the theme, is checked the same way as an update, and named in the result: "Deactivated WP Rocket - 2 changes found".

= What is free and what needs a paid plan? =

Everything that runs only inside WordPress is free, on every plan: the whole MyKavo screen, the update history, snapshots and one-click rollback of any plugin or theme, the "did it crash?" check, Safe Update All (with an UpdraftPlus backup first), silent-disaster notices, the critical-change notice, the MyKavo viewer role, suggested pages, the multisite network screen, the block editor panel, AI crawler counts for the last 30 days with real-or-fake checks, per-crawler robots.txt rules, 404 redirects, llms.txt, the daily email test, the number of plugins with a known security issue, and the update-risk line on the Plugins screen. One watched element is included on the free plan.

Paid plans, from Starter, add MyKavo's automatic checks after every update, instant email and Slack alerts for silent disasters, a fresh baseline before Safe Update All, plugin health and vulnerability details, 12 months of AI crawler history, llms.txt page summaries, redirect suggestions and contact form checks. Pro and Agency add automatic rollback, holding back risky automatic updates for 48 hours, automatic updates for vulnerable plugins, more watched elements, test entries through contact forms, the WooCommerce checkout guard and ChatGPT and Claude (MCP). Agency adds update windows and your branded site report. Paid features are provided by MyKavo's service: the plugin contains no locked code.

= How does rollback work? =

The update history offers "Roll back to" the version you had before. For a plugin from WordPress.org, WordPress downloads that exact version from WordPress.org; for any other plugin or theme (premium ones too), the snapshot taken just before the update is put back. Either way the plugin stays active if it was, MyKavo is told about it and checks your site again. Snapshots are kept for seven days, and MyKavo never rolls itself back.

= Can I connect several WordPress sites? =

Yes. Install the plugin on each site and connect each one to its own website in MyKavo.

= My site is behind a firewall. Will it work? =

Your server needs to be able to make outbound HTTPS requests to mykavo.app, which almost every host allows. MyKavo also needs to be able to reach your public pages to scan them.

== Screenshots ==

1. Overview: uptime, response time and SSL at a glance, what needs you first, and every change waiting for review.
2. Safe Updates: update plugins one at a time with a check after each, automatic rollback, and a verdict for every update.
3. A change up close: drag the slider to compare the page before and after.
4. Changes: tick several and approve, mark reviewed or ignore them in one go.
5. AI crawlers: which AI systems read your site and which pages, with allow or block for each crawler.
6. Pages: monitored pages, suggested pages, and Watch an element for buy buttons and forms.
7. The MyKavo panel in the block editor warns before you save an edit that removes a watched button or changes the title.
8. Your site report: updates, uptime, changes and AI crawler visits for the last 30 days, ready to share.
9. Your plan: what is included, Ask ChatGPT and Claude (MCP), and your site audit score.

== Changelog ==

= 1.3.2 =
* New: drafts from MyKavo's AI Keywords & Blog Writer. Click "Save as draft in WordPress" in MyKavo and the post appears under Posts as a draft, with its title, slug, meta description, FAQ and schema. It never publishes: you review it and publish. The plugin collects drafts when you open WP Admin and every 15 minutes.
* New: the meta description and focus keyword fill in Yoast SEO or Rank Math when either is active, and the post's schema is added only when no SEO plugin adds its own.

= 1.3.1 =
* New: your plan's medal (Free steel, Starter bronze, Pro silver, Agency gold) in the top bar, and a Plan tab with everything your plan includes and, on Free and Starter, what Pro adds.
* New: ChatGPT and Claude (MCP) card with the address to connect them, on Pro and Agency.
* New: Site audit card on the Overview and in the Dashboard widget, opening your MyKavo site audit.
* New: snapshots. Every plugin and theme update leaves a saved copy for seven days, so any of them - premium ones too - can be rolled back. Free.
* New: "did it crash?" check right after every update, with "Roll back now" when the site broke. Free.
* New: Safe Update All: optional UpdraftPlus backup, one plugin at a time, a check after each and an automatic rollback of any that break the site. Free; paid plans add a fresh baseline and MyKavo's check.
* New: silent-disaster alerts for search engine visibility, site address, permalinks, admin email and new administrators, on every wp-admin screen. Free; paid plans also get instant email or Slack alerts.
* New: critical changes shown as a notice on every wp-admin screen (from the cached status, no extra requests).
* New: "MyKavo viewer" role for read-only access.
* New: suggested pages to monitor after connecting and on the Pages tab.
* New: pick a button, link or form on a page to watch, and a MyKavo panel in the block editor that warns before an edit removes it.
* New: select several changes on the Changes tab and approve, accept as baseline, mark reviewed, fixed or ignored in one go.
* New: AI crawlers: allow or block each crawler, real-or-fake checks, redirects for 404s served to AI, and llms.txt. Free; paid plans add redirect suggestions and llms.txt page summaries.
* New: known security issues in Plugin health (count for everyone, details from Starter, automatic updates on Pro and Agency).
* New: update risk next to "Update now" on the Plugins screen; risky automatic updates wait 48 hours on Pro and Agency.
* New: daily email test (free) and contact form checks (paid).
* New: Your site report tab with your logo and colour (Agency).
* New: Network Admin screen on multisite with every site's status. Free.
* Fix: the robots.txt rules no longer claim a private site is public on WordPress 5.3 and later.
* New: a redesigned MyKavo screen. Bigger, clearer numbers, larger text and buttons, and pill tabs that are easier to tap.
* New: Site vitals on the Overview. Response time for the last 7 days, with your plugin and theme updates marked on the chart, so you can see if an update slowed the site.
* New: the Overview leads with what matters most right now, in one highlight card: a failed update check, changes that need you, or all clear.
* Open changes are now grouped by how soon they need you: Needs you, Review, When you can.
* Performance: nothing new loads on your visitors' pages. The MyKavo screen uses your system fonts, loads its files only on its own admin page, and caches site data for 60 seconds.

= 1.3.0 =
* New: roll back a plugin from WordPress.org to its previous version in one click, from the update history. Free on every plan.
* New: automatic rollback (Pro and Agency). When MyKavo's check after a plugin update finds a critical change, the update is rolled back and the site checked again. Can be switched off.
* New: "Block AI training, allow AI search" robots.txt rules on the AI crawlers screen. Free.
* New: 12 months of AI crawler history, with the day each crawler first visited (paid plans, from Starter).
* New: plugin health. MyKavo flags installed plugins that were closed on WordPress.org or have not been updated in two years (paid plans, from Starter).
* New: Guard checkout for WooCommerce. MyKavo watches the Place order, Proceed to checkout and Add to cart buttons (Pro and Agency).
* New: update windows. Automatic updates run only on the days and hours you choose (Agency).
* Safe Updates checks are now included in every paid plan, from Starter.

= 1.2.0 =
* Redesigned MyKavo screen: a new header with your site and its status, tabs with icons, and one status panel that brings together the verdict, open changes by severity and your site's uptime, response time, SSL and pages.
* Click a severity in the status panel to jump straight to those changes.
* Cleaner change lists that line up on phones, clearer before-and-after values, and a Pages list that shows each address once.

= 1.1.0 =
* New: AI crawlers screen - which AI systems (ChatGPT, Claude, Perplexity and more) read your site, which pages they read most, visits per day, and errors served to them. Also shown in your MyKavo dashboard.
* Crawler names only: no IP addresses, cookies or visitor data. Can be switched off.

= 1.0.0 =
* First release.
* Safe Updates: a check after every plugin, theme, WordPress and translation update (automatic updates included), and after plugins are activated or deactivated or the theme is switched, with the change named on everything it found.
* Overview with one clear status, uptime, response time and SSL expiry.
* Changes with before-and-after screenshots, exact old and new values, and one-click approve, fixed, ignore or accept as new baseline.
* On-demand scans with live progress, scan history and monitored pages.
* WooCommerce store guard for Shop, Cart, Checkout and My account.
* "Monitor with MyKavo" under every published page and post.
* A warning on the Plugins screen for a plugin whose last update changed your site.
* Site Health test and Info section, admin menu badge and Dashboard widget.
* WP-CLI commands: `wp mykavo status`, `changes`, `scan --wait`, `monitor`, `updates`, `safe-updates` and `disconnect`.
* Suggested privacy policy text.

== Upgrade Notice ==

= 1.3.2 =
Save posts from MyKavo's AI Keywords & Blog Writer straight to your drafts. Nothing is ever published for you.

= 1.3.1 =
A redesigned, easier-to-read MyKavo screen with your plan at a glance, one-click rollback for any plugin or theme, a crash check after every update, Safe Update All, alerts for silent setting changes, AI crawler controls and llms.txt. Still nothing added to your public pages.

= 1.3.0 =
One-click rollback for plugin updates, AI training crawler rules for robots.txt, and new paid features: automatic rollback, plugin health, checkout guard and update windows.

= 1.2.0 =
A redesigned, easier-to-read MyKavo screen.

= 1.1.0 =
See which AI systems read your site: the new AI crawlers screen.

= 1.0.0 =
First release.
