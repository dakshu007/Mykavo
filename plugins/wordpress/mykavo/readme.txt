=== MyKavo - Website Change Monitoring ===
Contributors: mykavo
Tags: monitoring, change detection, seo, uptime, screenshots
Requires at least: 6.2
Tested up to: 6.8
Requires PHP: 7.4
Stable tag: 1.0.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Know what changed on your site, and whether it matters. Before-and-after screenshots, SEO and broken-link alerts, inside WordPress. Zero front-end impact.

== Description ==

A plugin update, a theme tweak or a page builder change can quietly break your site: a checkout button disappears, a page is set to "noindex", links start returning 404. Usually a customer notices before you do.

MyKavo watches the pages that matter on your site and tells you when something important changes or breaks. This plugin brings that monitoring into your WordPress admin, so you can see what changed, how serious it is, and fix it or accept it without leaving WordPress.

= What you see in WordPress =

* **One clear status.** "All clear", or exactly how many important changes need attention, at the top of the screen and as a badge in the admin menu.
* **Before-and-after screenshots.** Drag a slider across the old and new version of a page, or switch to the highlighted differences.
* **The exact values that changed.** Old and new title, meta description, robots tag, canonical URL, button text and more, side by side.
* **Severity you can trust.** Every change is ranked Critical, High, Medium, Low or Info. Ad slots and other noise are filtered out, so alerts mean something.
* **One-click decisions.** Accept an intentional change as the new baseline, mark it fixed, or ignore it.
* **Run a scan on demand.** Check the site right after an update and watch the progress live.
* **Uptime, response time and SSL expiry** at a glance.
* **Scan history and monitored pages**, with a link to each page.
* **A small Dashboard widget** with the current status.

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

* **Nothing on the public site.** No scripts, no styles, no database queries and no remote requests on the pages your visitors load.
* **No autoloaded options.** The connection is stored in a single option that WordPress only reads on MyKavo's own screens.
* **No cron jobs and no custom tables.** The scanning runs on MyKavo's servers, not yours.
* **Admin screens only.** Scripts load on the MyKavo screen alone (plus a 2 KB script for the Dashboard widget), using only libraries WordPress already includes.
* **Cached and time-limited.** Answers from MyKavo are cached for a minute, and every request has a short timeout.

= Secure by design =

* Connecting uses an OAuth-style approval with PKCE. You approve on mykavo.app, and your site receives a key that only works for this one website.
* The key stays on your server. Your browser never sees it.
* Only administrators can see or act on monitoring.
* Disconnect at any time, from WordPress or from your MyKavo account.

= Plans =

MyKavo has a free plan: 1 website, 5 monitored pages and weekly scans, with no card required. Paid plans add daily scans, more websites and pages, manual scans and more. See [mykavo.app/pricing](https://mykavo.app/pricing).

== External services ==

This plugin connects your site to MyKavo (https://mykavo.app), a website monitoring service operated by MyKavo. It does not work without a MyKavo account.

**What is sent, and when:**

* **When you press "Connect to MyKavo":** your browser is sent to mykavo.app with your site's address, its name, its WordPress admin address, the plugin and WordPress version numbers, and one-time security values for the connection. Your site's server then sends a one-time code and your site's address to mykavo.app to finish connecting.
* **While an administrator views a MyKavo screen:** your site's server requests this website's monitoring data from mykavo.app, and sends the actions you take (for example "approve this change" or "run a scan").
* **Screenshots** of your pages are loaded by the administrator's browser directly from mykavo.app, using links that expire after 30 minutes.
* **When you disconnect:** your site tells mykavo.app to revoke its key.

Nothing is sent when visitors view your site, and nothing about your visitors is ever sent. MyKavo scans your public pages from its own servers, the same way a visitor would.

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

No. The plugin does nothing on the pages your visitors load: no scripts, styles, queries or remote requests. It only runs inside wp-admin, on its own screens. The scanning happens on MyKavo's servers.

= Do I need a MyKavo account? =

Yes. The plugin shows the monitoring MyKavo does for your site. The free plan covers one website with five pages, with no card required.

= Who can see the MyKavo screen? =

Administrators only (users who can manage options).

= What happens if I disconnect or delete the plugin? =

Disconnecting revokes this site's key. Deleting the plugin removes everything it stored. Monitoring in your MyKavo account is not affected, and you can connect again at any time.

= Can I connect several WordPress sites? =

Yes. Install the plugin on each site and connect each one to its own website in MyKavo.

= My site is behind a firewall. Will it work? =

Your server needs to be able to make outbound HTTPS requests to mykavo.app, which almost every host allows. MyKavo also needs to be able to reach your public pages to scan them.

== Screenshots ==

1. Overview: one clear status, uptime and SSL, and what needs attention first.
2. A change, with a before-and-after slider over the page screenshots.
3. Exactly what changed: old and new values side by side.
4. All changes, filtered by status and severity.
5. Scan history.
6. Connect in two clicks. Nothing is added to your public pages.

== Changelog ==

= 1.0.0 =
* First release: overview, changes with before-and-after screenshots, one-click approve, ignore and fixed, new baselines, on-demand scans with live progress, scan history, monitored pages, admin menu badge and Dashboard widget.

== Upgrade Notice ==

= 1.0.0 =
First release.
