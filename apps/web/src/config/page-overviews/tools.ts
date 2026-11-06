import type { PageOverview } from "./types";

/** AI Overviews for the free tools, keyed by the path under /tools. */
export const TOOL_OVERVIEWS: Record<string, PageOverview> = {
  "/tools/website-change-detector": {
    answer:
      "A website change detector captures a snapshot of a page and compares it with a later snapshot, or with a second URL, to show exactly what differs. MyKavo's Website Change Detector records the HTTP status, SEO tags, links and scripts of any public page, and it is free with no account needed.",
    takeaways: [
      "Each snapshot covers status and redirect chain, title, meta description, canonical, robots meta, H1s, link counts, third-party scripts, HTML weight and response time.",
      "Changes are grouped by field, with the previous and current value side by side instead of a raw HTML diff.",
      "It checks one public page at a time, on demand. Pages behind a login cannot be fetched.",
      "A MyKavo account re-scans chosen pages on a schedule, adds screenshot comparison and emails severity-ranked alerts when something meaningful changes.",
    ],
  },
  "/tools/meta-tag-checker": {
    answer:
      "A meta tag checker reads the tags search engines use to understand and display a page: the title, meta description, canonical URL, robots meta, Open Graph tags and H1 headings. Enter a URL and this checker fetches the live HTML and grades each tag with pass or warn guidance. It is free and needs no account.",
    takeaways: [
      "Aim for a title tag of 50 to 60 characters and a meta description of 120 to 160 characters.",
      "A single noindex in the robots meta can remove the page from Google entirely.",
      "Open Graph tags (og:title, og:description, og:image) control link previews, and a page should have exactly one H1.",
      "MyKavo can monitor these tags on the pages you choose and email you when a title, description, canonical or robots value changes.",
    ],
  },
  "/tools/redirect-chain-checker": {
    answer:
      "A redirect chain checker follows a URL hop by hop until it reaches the final page, recording the status code and destination at each step. This tool counts the hops and flags redirect loops and needlessly long chains. It is free with no account needed.",
    takeaways: [
      "One hop is normal and two is tolerable. Chains of three or more hops should be collapsed into a single redirect.",
      "301 and 308 are permanent redirects that pass ranking signals; 302, 303 and 307 are temporary and usually do not.",
      "A redirect loop, where a URL leads back to one it already visited, never resolves and breaks the page.",
      "Redirect rules often live in a CDN, host panel or plugin, so MyKavo re-checks monitored pages and alerts when a destination or status changes.",
    ],
  },
  "/tools/bulk-url-status-checker": {
    answer:
      "To check HTTP status codes for many URLs at once, paste up to 20 URLs and this tool requests each one fresh, follows redirects, and reports the final status code and response time. It suits sitemaps, migration lists and campaign landing pages, and it is free with no account needed.",
    takeaways: [
      "Each URL is checked independently, so one dead server does not hide the results for the others.",
      "A 404 means nothing was found at the URL; a 410 means the page is gone permanently, and search engines act on it faster.",
      "A soft 404 returns 200 while showing a not-found message, so a status check alone will not catch it.",
      "MyKavo can check important pages on a schedule and email you when a page that returned 200 starts returning an error.",
    ],
  },
  "/tools/script-detector": {
    answer:
      "A script detector lists the external scripts a page loads, so you can see which third-party services run on it. Enter a URL and this tool shows each script's full URL and domain, marks the third-party ones, and names known services such as Google Analytics, Google Tag Manager, Meta Pixel, Stripe, Hotjar, Intercom and HubSpot. It is free with no account needed.",
    takeaways: [
      "It reads the delivered HTML, so scripts injected later at runtime, such as tags fired through Google Tag Manager, may not appear.",
      "A missing analytics script breaks nothing visibly: data collection simply stops until someone finds a gap in the reports.",
      "An unknown third-party script appearing on a page can indicate a compromised dependency or tag manager.",
      "MyKavo snapshots the scripts on every monitored page each scan and alerts when an important one is removed or an unfamiliar one appears.",
    ],
  },
  "/tools/eeat-analyzer": {
    answer:
      "An E-E-A-T analyzer checks a page for the on-page signals behind Google's Experience, Expertise, Authoritativeness and Trust framework. This free tool scores any URL against 20 deterministic signals drawn from the Search Quality Rater Guidelines and gives a concrete fix for each one that is missing. Google publishes no official E-E-A-T score, so the result is a checklist of observable signals, not a Google metric.",
    takeaways: [
      "The 20 checks are grouped into the four pillars, and Trust is weighted double in the overall score.",
      "Signals include a named author with credentials, visible dates, cited sources, an About page, contact details, a privacy policy and HTTPS.",
      "The same page always produces the same result, so the failed checks work as a to-do list.",
      "MyKavo can monitor your pages and alert you when trust signals such as bylines, policy links or schema change.",
    ],
  },
  "/tools/noindex-checker": {
    answer:
      "To check if a page is noindex, enter its URL and this checker reads it the way Googlebot does: every robots and googlebot meta tag, the X-Robots-Tag HTTP header, the final status code after redirects, and robots.txt. It then says in one line whether the page can be indexed and, if not, which signal is blocking it. It is free with no account needed.",
    takeaways: [
      "A noindex can arrive in the X-Robots-Tag header, which never shows in View Source. This checker reads both the header and the HTML.",
      "robots.txt blocks crawling, not indexing. To remove a page from Google, allow crawling and use noindex.",
      "A canonical pointing at a different page is flagged, because Google usually indexes that URL instead.",
      "MyKavo checks the robots meta on every monitored page each scan and treats a change from index to noindex as a critical alert.",
    ],
  },
  "/tools/wordpress-theme-detector": {
    answer:
      "To find out what WordPress theme a site uses, enter its URL: the detector finds the theme folder the page loads files from and reads that theme's style.css header. It reports the theme name, version, author and, for a child theme, its parent, plus the plugins the page loads. It is free with no account needed.",
    takeaways: [
      "Plugins are found from /wp-content/plugins/ paths and from plugins that identify themselves, such as Yoast SEO, Rank Math, WooCommerce and Elementor.",
      "Plugins that only work inside wp-admin, like most security and backup tools, leave nothing on the public page to detect.",
      "If a site hides wp-content or removes the generator tag, the detector reports no WordPress signals rather than guessing.",
      "The free MyKavo WordPress plugin checks your key pages after every plugin, theme and core update and names the update behind any change.",
    ],
  },
  "/tools/robots-txt-tester": {
    answer:
      "A robots.txt tester shows whether a crawler may fetch a specific URL under a site's robots.txt rules. Paste a page URL and this tool applies Google's matching rules for Googlebot, Bingbot and the AI crawlers GPTBot, ClaudeBot, PerplexityBot and CCBot, then shows the exact line that decided each result. It is free with no account needed.",
    takeaways: [
      "Each crawler obeys only the group that names its user agent, or the * group if no group names it.",
      "The longest matching path wins, Allow wins a tie, * matches anything and a trailing $ anchors the end of the URL.",
      "A missing robots.txt (404) blocks nothing, but a 5xx error makes Google treat the whole site as blocked.",
      "robots.txt controls crawling, not indexing. To keep a page out of search results, let it be crawled and add noindex.",
    ],
  },
  "/tools/ssl-certificate-checker": {
    answer:
      "To check when an SSL certificate expires, enter the domain and this checker connects over HTTPS on port 443, reads the certificate the server presents, and shows the expiry date and days remaining. It also lists the issuer, every hostname the certificate covers, and whether browsers trust the chain. It is free with no account needed.",
    takeaways: [
      "Automated certificates such as Let's Encrypt are valid for 90 days and normally renew with about 30 days left.",
      "Under 21 days without a renewal means the automation needs checking; under 7 days is an emergency.",
      "A missing intermediate certificate can look fine in a browser while apps, payment webhooks and older devices fail to connect.",
      "MyKavo checks the certificate of every monitored website on every plan, including Free, and alerts you within 14 days of expiry.",
    ],
  },
  "/tools/analytics-tag-checker": {
    answer:
      "To check if Google Analytics is installed on a website, enter a page URL and this checker reads the HTML for GA4 measurement IDs (G-), Google Tag Manager containers (GTM-), Google Ads tags (AW-) and pixels such as Meta, LinkedIn and TikTok. It reports each ID with where it was found. It is free with no account needed.",
    takeaways: [
      "GA4 set up only inside a GTM container is not in the HTML, so confirm it with GTM Preview mode or Tag Assistant.",
      "GA4 installed directly alongside a GTM container that also fires it can count each page view twice, and the checker flags that setup.",
      "Universal Analytics (UA-) stopped processing standard property data on July 1, 2023, so leftover UA code is marked as retired.",
      "MyKavo re-scans the pages you choose and alerts you when a known analytics or tag manager script stops loading.",
    ],
  },
  "/tools/broken-link-checker": {
    answer:
      "To find broken links on a page, enter its URL and this checker requests every internal and external link in the HTML, following redirects, and lists the broken ones first with their anchor text. A link counts as broken when it returns 404, 410, another 4xx error or a 5xx error, or its domain cannot be reached. It is free with no account needed.",
    takeaways: [
      "It checks one page at a time, up to the first 100 unique links, and does not crawl from page to page.",
      "401, 403 and 429 responses and servers slower than the 5-second limit are shown as couldn't verify, not broken.",
      "mailto:, tel:, javascript: and same-page #anchor links are skipped, and links added by JavaScript after load are not seen.",
      "MyKavo checks internal links on monitored pages after each scan and raises one grouped change when working links start failing.",
    ],
  },
  "/tools/canonical-tag-checker": {
    answer:
      "A canonical tag checker shows which URL a page tells search engines to index and whether that canonical URL actually works. This one reads both the rel=\"canonical\" link in the HTML and the HTTP Link header, then follows a canonical that points elsewhere to test its status code, redirects and noindex. It is free with no account needed.",
    takeaways: [
      "For most pages a self-referencing canonical is correct. A canonical target should return 200 directly and must not be noindex.",
      "Canonicals that disagree, including an HTML tag and Link header pointing to different URLs, can lead Google to ignore them all.",
      "The checker also flags relative canonical URLs and canonical tags placed in the body, where Google ignores them.",
      "It reports what the page declares, not which URL Google chose. Search Console's URL Inspection shows Google's choice.",
    ],
  },
  "/tools/heading-structure-checker": {
    answer:
      "A heading structure checker lists every H1 to H6 heading on a page as an indented outline, in the order a reader meets them. Enter a URL and this checker flags a missing H1, several H1s, empty headings, skipped levels and headings over 70 characters. It is free with no account needed.",
    takeaways: [
      "Google says several H1s on one page are fine, but one H1 naming the topic is the clearest structure for readers.",
      "Skipped levels such as H2 to H4 do not stop a page ranking. They mainly affect screen reader navigation, so they are reported as information.",
      "Headings added by JavaScript after load, and headings inside script, style, template and noscript tags, are not included.",
      "MyKavo compares the H1 on every monitored page each scan and raises a high-severity alert when it disappears.",
    ],
  },
  "/tools/hreflang-checker": {
    answer:
      "A hreflang checker validates the annotations that tell Google which version of a page to show in each language or country. Enter a URL and this tool reads hreflang in the HTML and the HTTP Link header, checks every code, the self-reference and x-default, then opens up to 15 alternates to confirm each one loads, is indexable and links back. It is free with no account needed.",
    takeaways: [
      "Region codes must be ISO 3166-1 country codes: en-GB is valid, while en-UK, en_US and a country on its own are ignored.",
      "Every alternate must link back, because Google may ignore hreflang pairs that are not confirmed from both pages.",
      "An alternate that redirects, is noindex or names a different canonical breaks the set.",
      "x-default is optional and sets the page shown to visitors whose language or region matches none of your versions.",
    ],
  },
  "/tools/page-size-checker": {
    answer:
      "To check the size of a web page, enter its URL and this checker downloads the HTML, lists every script, stylesheet, image, preloaded font and iframe it references, and measures up to 40 of those files. It reports the HTML size, total measured weight, a breakdown by file type, which files are third-party, and the 10 heaviest files. It is free with no account needed.",
    takeaways: [
      "The tool's rules of thumb: HTML under about 100 KB, total weight under about 3 MB, fewer than about 80 requests, no file over 1 MB.",
      "It reads HTML rather than running a browser, so fonts and images loaded from CSS or by JavaScript are not counted.",
      "File sizes are uncompressed, so HTML, JavaScript and CSS usually transfer fewer bytes over the network than shown.",
      "MyKavo records page weight and request count on each scan and flags a weight increase over 20% or a request count increase over 25%.",
    ],
  },
  "/tools/shopify-theme-detector": {
    answer:
      "To find out what Shopify theme a store uses, enter its URL and the detector reads the Shopify.theme object every storefront publishes in its HTML. It reports the original theme behind any rename, such as Dawn, its version, the merchant's name for it, whether it came from the Theme Store, and the apps the page loads. It is free with no account needed.",
    takeaways: [
      "A theme with no theme_store_id was built custom or bought outside the Shopify Theme Store.",
      "Apps are found from the files they load, including theme app extensions on cdn.shopify.com/extensions/ and scripts from app domains like Klaviyo.",
      "Apps that work only in the Shopify admin, or only on pages you did not check, leave nothing to detect.",
      "MyKavo monitors storefront pages from outside with nothing to install and alerts you when scripts, SEO tags or watched buttons change.",
    ],
  },
  "/tools/structured-data-checker": {
    answer:
      "A structured data checker finds the schema markup on a page and shows what it says. Enter a URL and this tool parses every JSON-LD block, including arrays and @graph containers, lists each entity's @type and key properties, reports blocks that are not valid JSON, and counts microdata and RDFa items. It is free with no account needed.",
    takeaways: [
      "It checks common required and recommended properties for Product, Article, FAQPage, BreadcrumbList, LocalBusiness, Event, Recipe and VideoObject.",
      "Search engines ignore a JSON-LD block that cannot be parsed. Trailing commas, comments and unescaped quotes are common causes.",
      "Google recommends JSON-LD and also reads microdata and RDFa. This tool validates JSON-LD properties and only counts the other two.",
      "It is not Google's full validator. Use the Rich Results Test, linked from your results, to confirm rich result eligibility.",
    ],
  },
  "/tools/competitor-analysis-tool": {
    answer:
      "A competitor analysis tool shows how a rival's website compares with yours and what changes on it over time. This free tool compares your page with a competitor's side by side without signing up, covering title, meta description, indexability, canonical, redirects, page weight, server response, third-party scripts, headings, links and recognized services. A MyKavo account can then watch the competitor's pages on a schedule and email you the before-and-after when they change.",
    takeaways: [
      "MyKavo reads only public pages, the way a browser or search engine does, obeys robots.txt and never tries to see behind a login.",
      "Changes it catches include pricing and plan names, homepage rewrites, new or removed pages, third-party script swaps, title rewrites and CTAs.",
      "Monitored pages are checked weekly on the Free plan and daily on Pro, Agency and the Pro trial.",
      "The Free plan covers one website with five monitored pages and email alerts, with no card required.",
    ],
  },
};
