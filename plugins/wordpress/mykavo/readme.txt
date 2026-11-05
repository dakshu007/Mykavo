=== MyKavo - Website Change Monitoring ===
Contributors: dakshu007
Tags: monitoring, change detection, seo, uptime, screenshots
Requires at least: 6.2
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 1.3.1
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Know when an update breaks your site. MyKavo checks your pages after every plugin, theme and WordPress update. Zero front-end impact.

== Description ==

Updates are the number one way WordPress sites break. A plugin, theme or WordPress update - often an automatic one, overnight - quietly changes a layout, removes a checkout button or sets a page to "noindex". Usually a customer notices before you do, and nobody knows which update did it.

MyKavo fixes that. It watches the pages that matter on your site and tells you when something important changes or breaks. This plugin brings that monitoring into WordPress, and adds **Safe Updates**: every time WordPress updates anything, MyKavo checks your pages straight away and tells you whether the update broke something - and exactly which update it was.

= Safe Updates =

* **Every update is checked.** Plugins, themes, WordPress itself and translations, whether you clicked Update or WordPress did it automatically.
* **Every plugin switch too.** Activating or deactivating a plugin, or switching theme, breaks sites as often as updates do. Those are checked the same way.
* **A clear verdict.** "Verified - nothing changed", or "3 changes found after this update", with the before-and-after evidence one click away.
* **The culprit, named.** Changes found after an update say so: "Appeared after: Updated WooCommerce 8.1.0 → 8.2.0".
* **A history of every update**, with versions, kept on your site.
* **Know before you press Update.** On the Plugins screen, a plugin whose last update changed things on your site is flagged: "Last time this plugin updated, 2 things changed on your site."
* **Roll back in one click.** In the update history, any plugin from WordPress.org has a "Roll back to 8.1.0" button that reinstalls the version you had before, keeps the plugin active, and asks MyKavo to check the site again. This works on every plan, including free. Plugins from other sources cannot be rolled back here.
* Update checks are included in every paid plan, from Starter. On the free plan, updates are still listed so you know what changed and when, and one-click rollback works.

= Safe Update All, snapshots and "did it crash?" (free) =

* **A saved copy of everything you update.** Right before WordPress updates a plugin or theme, MyKavo zips the folder in wp-content/mykavo-snapshots (closed to the web). Any plugin or theme - premium ones too - can then be rolled back for seven days. The last two copies per plugin are kept, folders over 200 MB are skipped, and nothing is saved when the disk is low. MyKavo never snapshots or rolls back itself.
* **"Did it crash?"** About ten seconds after an update, the site loads its own home page and up to three monitored pages and looks for a server error, WordPress's "critical error" page, a PHP fatal error or an empty page. If it finds one, the update history says so with a "Roll back now" button.
* **Safe Update All.** One button: optionally start an UpdraftPlus backup first, update the plugins one at a time, check the site after each, and roll back any update that breaks it, then one verdict: "7 updated, 6 verified, 1 rolled back". On paid plans MyKavo also takes a fresh baseline first and checks the pages afterwards.
* **Silent-disaster alerts.** "Discourage search engines" switched on, the site or WordPress address changed, the permalinks changed, the admin email changed, or a new administrator appeared: a red notice on every wp-admin screen until someone dismisses it. Paid plans also get an instant email or Slack alert from MyKavo.
* **Email check.** Optional: WordPress sends one short test email a day to the admin address, and MyKavo shows whether it went out.
* **For agencies and their clients.** A "MyKavo viewer" role lets a client see the MyKavo screen without being able to change anything. On multisite, Network Admin > MyKavo lists every site's status.

= Automatic rollback, update windows and plugin health =

These come from MyKavo's service on paid plans. MyKavo makes the decision (whether an update broke something, when updates may run, which plugins are abandoned); the plugin shows the result and carries out what MyKavo says.

* **Automatic rollback (Pro and Agency).** When MyKavo's check after a plugin update finds a critical change, the plugins from that update are put back to their previous version from WordPress.org automatically, and MyKavo checks the site again. You can switch it off on the Safe Updates screen. MyKavo never rolls itself back, never rolls back a rollback, and WordPress will not automatically update a rolled back plugin straight back to the version that broke.
* **Update windows (Agency).** Choose the days and hours, in your time zone, when WordPress may install automatic updates. Outside the window, automatic plugin, theme and core updates wait for the next one, so they happen when someone is around.
* **Plugin health (paid plans, from Starter).** Once a day the plugin sends MyKavo the list of installed plugins, and MyKavo flags the ones that were closed on WordPress.org or have not been updated in two years.
* **Known security issues.** Every plan sees how many installed plugins have a known vulnerability. Paid plans, from Starter, see which plugin, what the issue is and the version that fixes it; Pro and Agency can have vulnerable plugins updated automatically as soon as the fix is out.
* **Update risk.** On the Plugins screen, next to "Update now": "Updated on 214 MyKavo sites, 3% saw changes" (anonymous results of Safe Updates across MyKavo). On Pro and Agency, an automatic update MyKavo marks risky waits 48 hours.
* **Watch buttons and forms.** On the Pages tab, open a page, click the button, link or form that matters, and MyKavo alerts you if it disappears or changes. In the block editor, a MyKavo panel warns before you save an edit that removes a watched element or changes the page title or SEO description. The free plan watches one element; more come with Pro and Agency.
* **Contact forms (paid).** Pages with a Contact Form 7, Gravity Forms or WPForms form are checked by MyKavo (from Starter), and on Pro and Agency MyKavo also sends a labelled test entry.
* **Your site report (Agency).** A Site report tab with the last 30 days on one page - updates, rollbacks, uptime, SSL, changes caught and AI crawler visits - with your logo and brand colour, ready to share or print as a PDF.
* **Your plan at a glance.** The plan medal (Free steel, Starter bronze, Pro silver, Agency gold) in the top bar, a Plan tab with everything your plan includes, a Site audit card that opens your MyKavo site audit, and, on Pro and Agency, the address to connect ChatGPT, Claude or any MCP app to MyKavo.

= See which AI reads your site =

ChatGPT, Claude, Perplexity and other AI systems send crawlers to read your pages before they quote or recommend them. The **AI crawlers** screen shows:

* **Who visits.** Visits from OAI-SearchBot, ChatGPT-User, GPTBot, Claude-SearchBot, Claude-User, ClaudeBot, PerplexityBot, Perplexity-User, Amazonbot, DuckAssistBot, Meta-ExternalAgent, MistralAI-User, CCBot and Bytespider, and why each one visits (AI search answers, a person asking about your page, or training).
* **Which pages AI reads most**, and visits per day for the last 30 days.
* **Errors served to AI.** Pages that answered a crawler with 404 or 5xx - pages AI cannot quote.

* **Block AI training, allow AI search (free).** One switch adds rules to your robots.txt that ask crawlers collecting AI training data (GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, Bytespider and Meta-ExternalAgent) to stay away, while the crawlers that read pages for AI search answers or open a page someone asked about (OAI-SearchBot, ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot and Perplexity-User) are left alone. It works with the robots.txt WordPress generates; if your site has its own robots.txt file, the screen shows the rules to copy into it.
* **Last 12 months (paid plans, from Starter).** Twelve months of AI crawler visits kept by MyKavo, by month and by crawler, with the day each crawler first visited.
* **Allow or block each AI crawler (free).** A table with every known AI crawler, each allowed or blocked in robots.txt, plus a "Block training, allow search" button.
* **Real or fake? (free).** Anyone can call themselves GPTBot. Visits from OpenAI and Perplexity crawlers are checked against the IP ranges those companies publish, and Amazonbot by reverse DNS, so fakes are counted separately. Only a salted hash of the address is cached for six hours; addresses are never stored. Requests that come through a proxy or CDN are not checked.
* **Fix errors served to AI (free).** Addresses that answered an AI crawler with 404 get a "Create redirect" button. The redirect only runs on requests that would otherwise be a 404. Paid plans, from Starter, also get a suggested target page from MyKavo.
* **llms.txt (free).** Switch on a /llms.txt for AI assistants: your site's name, description and important pages. Paid plans, from Starter, add a one-line summary of each page written by MyKavo.

Crawlers are counted by the name they send in the User-Agent header. No IP addresses, no cookies and nothing about human visitors are ever recorded. You can switch counting off on that screen.

= Built for WooCommerce stores =

A broken cart or checkout loses sales every minute it stays broken. If WooCommerce is active, MyKavo shows whether your Shop, Cart, Checkout and My account pages are monitored, and adds the missing ones in one click.

On Pro and Agency, **Guard checkout** goes further: MyKavo also watches the Place order, Proceed to checkout and Add to cart buttons on your cart, checkout and a product page, and sends a critical alert the moment one goes missing.

= What you see in WordPress =

* **Safe Updates:** a check and a verdict after every update, with the update named.
* **One clear status.** "All clear", or exactly how many important changes need attention, at the top of the screen and as a badge in the admin menu.
* **Before-and-after screenshots.** Drag a slider across the old and new version of a page, or switch to the highlighted differences.
* **The exact values that changed.** Old and new title, meta description, robots tag, canonical URL, button text and more, side by side.
* **Severity you can trust.** Every change is ranked Critical, High, Medium, Low or Info. Ad slots and other noise are filtered out, so alerts mean something.
* **One-click decisions.** Accept an intentional change as the new baseline, mark it fixed, or ignore it.
* **Run a scan on demand.** Check the site right after an update and watch the progress live.
* **Uptime, response time and SSL expiry** at a glance.
* **Scan history and monitored pages**, with a link to each page.
* **A small Dashboard widget** with the current status.
* **Monitor any page from WordPress.** A "Monitor with MyKavo" link under every published page and post, or paste an address on the Pages tab.
* **Site Health.** MyKavo's status appears in Tools > Site Health, and its details in the Info tab for support requests.
* **WP-CLI.** `wp mykavo status`, `wp mykavo changes`, `wp mykavo scan --wait`, `wp mykavo monitor`, `wp mykavo updates` and more, for scripted maintenance runs.

= What MyKavo detects =

* Pages that go down or return errors (404, 500)
* Visual changes, measured against an approved baseline
* SEO changes: title, meta description, canonical, robots / noindex, headings, structured data
* Broken internal links
* Tracking and third-party scripts added or removed (Google Analytics, Tag Manager, Meta Pixel and others)
* Performance regressions: page weight, request count, response time
* Missing or changed buttons and forms you choose to watch (conversion elements)

= Built to never slow your site down =

Many plugins get deleted because they make a site slower. MyKavo is built so that cannot happen:

* **Nothing on the public site.** No scripts, no styles, no database queries and no remote requests on the pages your visitors load. The only things that run are two text matches - the User-Agent header, to spot AI crawlers, and the request path, to answer /llms.txt - and human visitors stop there. A redirect is looked up only on a request that is already a 404.
* **AI crawler counting is one counter update.** A request from an AI crawler adds one row update to a small table, after the page has been built. Rows older than 35 days are deleted.
* **No autoloaded options.** The connection is stored in a single option that WordPress only reads on MyKavo's own screens.
* **One small daily job.** Once a day, WP-Cron sends the AI crawler totals and the list of installed plugins to MyKavo. The scanning itself runs on MyKavo's servers, not yours.
* **Snapshots and checks run only during updates.** A snapshot is taken while WordPress is already updating, and the "did it crash?" check is one WP-Cron job a few seconds later.
* **Automatic rollback waits quietly.** On plans with automatic rollback, WP-Cron asks MyKavo every five minutes, for up to 40 minutes after a plugin update, how its check went. Nothing else runs between updates.
* **Admin screens only.** Scripts load on the MyKavo screen alone (plus a 2 KB script for the Dashboard widget), using only libraries WordPress already includes.
* **Update checks cost nothing extra.** The plugin notes versions while WordPress is updating, then sends one short report when the update finishes. Nothing runs between updates.
* **Cached and time-limited.** Answers from MyKavo are cached for a minute, and every request has a short timeout.

= Secure by design =

* Connecting uses an OAuth-style approval with PKCE. You approve on mykavo.app, and your site receives a key that only works for this one website.
* The key stays on your server. Your browser never sees it.
* Only administrators can act on monitoring. Users with the "MyKavo viewer" role can see it, read-only.
* Disconnect at any time, from WordPress or from your MyKavo account.

= Plans =

MyKavo has a free plan: 1 website, 5 monitored pages and weekly scans, with no card required. Paid plans add daily scans, more websites and pages, manual scans and more. See [mykavo.app/pricing](https://mykavo.app/pricing).

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

1. Overview: one clear status, uptime and SSL, what needs attention first, and the latest update check.
2. Safe Updates: every update, plugin switch and theme change, with a verdict and the change named.
3. A change that appeared after an update, with the update named.
4. A change, with a before-and-after slider over the page screenshots.
5. Exactly what changed: old and new values side by side.
6. All changes, filtered by status and severity.
7. Scan history.
8. Connect in two clicks. Nothing is added to your public pages.
9. WooCommerce store guard: see which store pages are monitored and add the rest in one click.

== Changelog ==

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
