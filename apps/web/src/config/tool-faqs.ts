import type { ToolFaq } from "@/components/landing/tool-faq";

/**
 * FAQ copy for the six free tools, kept together so the answers stay
 * consistent about shared behaviour (SSRF-guarded fetching, no signup, public
 * pages only) instead of drifting apart across six files.
 *
 * House rules for these answers:
 *  - Every answer opens with a direct statement that stands on its own. An
 *    answer engine lifts one paragraph; it cannot carry context in from the
 *    sentence before.
 *  - Only checkable facts. No "the best", no invented benchmarks, no numbers
 *    that are not true of the shipped product.
 *  - Where a real limit exists, it is stated. Naming a boundary is what makes
 *    the rest of the answer trustworthy to a model deciding whether to cite.
 */

export const CHANGE_DETECTOR_FAQS: readonly ToolFaq[] = [
  {
    q: "What is a website change detector?",
    a: "A website change detector captures the state of a page and compares it against a later capture, then reports what differs. This one compares two URLs, or one URL against a snapshot you took earlier, and groups the result into title, meta, heading, link, script and visible-text changes rather than dumping raw HTML at you.",
  },
  {
    q: "How do I check if a web page has changed?",
    a: "Paste the page URL and run a check to store a snapshot, then run it again later and compare. The tool shows the previous and current value side by side for every field that moved. For ongoing checks you need something that re-scans on a schedule, because a manual comparison only tells you about the moment you happened to look.",
  },
  {
    q: "Is this website change detector free?",
    a: "Yes, and it needs no account. The tool runs entirely in the browser session with no signup, no card and no trial period. A free MyKavo account adds scheduled re-scans of one website and five pages, which is what turns a one-off comparison into monitoring.",
  },
  {
    q: "Can I monitor a page for changes automatically?",
    a: "Not with this tool on its own - it compares on demand. Automatic monitoring means approving a baseline and re-scanning on a schedule, which is what a MyKavo account does: it re-checks your chosen pages daily or weekly and emails you only when something meaningful changed, with before-and-after evidence attached.",
  },
  {
    q: "Does it work on pages behind a login?",
    a: "No. The tool fetches pages the way a search engine would, so it only sees publicly reachable URLs. Pages behind authentication, paywalls or IP allowlists cannot be checked. Requests are also validated to block private and internal network addresses.",
  },
];

export const META_TAG_FAQS: readonly ToolFaq[] = [
  {
    q: "What is a meta tag checker?",
    a: "A meta tag checker reads the tags a search engine uses to understand and display a page: the title, meta description, canonical URL, robots directives, Open Graph tags and H1 headings. This one fetches a live URL and reports each value with pass or warn guidance, so you can see what Google would actually read.",
  },
  {
    q: "What is a good meta description length?",
    a: "Roughly 120 to 160 characters. Shorter than that wastes the space Google gives you under the headline; longer and it gets truncated mid-sentence in results. Title tags follow the same logic at 50 to 60 characters. The checker flags anything outside those ranges, and the exact pixel cutoff varies by device.",
  },
  {
    q: "Why does my page have no meta description?",
    a: "Usually because the CMS template does not set one, or the field was left blank on that page. When a description is missing, Google generates its own snippet from page content, which is often a stray sentence rather than your pitch. The checker reports missing descriptions explicitly rather than showing an empty row.",
  },
  {
    q: "What does the canonical tag do?",
    a: "A canonical tag tells search engines which URL is the authoritative version of a page when the same content is reachable at several addresses. Getting it wrong can point ranking signals at the wrong page or remove a page from results entirely, which is why a canonical that changes unexpectedly is treated as a high-severity event in MyKavo.",
  },
  {
    q: "Is the meta tag checker free?",
    a: "Yes, with no account required. It checks one URL at a time. To watch these same tags over time and get alerted when a title, description, canonical or robots directive changes, a free MyKavo account monitors five pages on a weekly schedule.",
  },
];

export const REDIRECT_CHAIN_FAQS: readonly ToolFaq[] = [
  {
    q: "What is a redirect chain?",
    a: "A redirect chain is when one URL redirects to another, which redirects again, before reaching the final page. Each extra hop costs load time, dilutes link signals and gives another chance for something to break. This tool follows every hop and shows the status code and destination at each step.",
  },
  {
    q: "How many redirects are too many?",
    a: "One hop is normal, two is tolerable, three or more should be collapsed. Browsers give up after roughly twenty, but the practical damage starts far earlier through added latency on every request. A redirect loop, where the chain returns to a URL it already visited, never resolves at all and the tool flags it separately.",
  },
  {
    q: "What is the difference between a 301 and a 302 redirect?",
    a: "A 301 is permanent and tells search engines to transfer ranking signals to the new URL. A 302 is temporary and tells them to keep the original indexed. Using a 302 for a permanent move is a common and costly mistake, because the new URL never inherits the authority of the old one.",
  },
  {
    q: "Why did my redirects change without a deploy?",
    a: "Redirect rules commonly live outside your codebase - in a CDN, a host control panel, a WordPress plugin or a domain registrar's forwarding settings. A change in any of those takes effect without a deploy and without a trace in your repository, which is why redirect behaviour is worth monitoring rather than assuming.",
  },
];

export const BULK_STATUS_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I check HTTP status codes for many URLs at once?",
    a: "Paste your list of URLs and the tool requests each one, following redirects, and reports the final status code alongside any hops on the way. It is built for checking a sitemap, a migration list or a set of campaign landing pages in one pass rather than opening each in a browser tab.",
  },
  {
    q: "What does a 404 status code mean?",
    a: "A 404 means the server could not find anything at that URL. For visitors it is a dead end; for search engines it eventually means the page is dropped from the index. A 410 is the deliberate version, meaning the page is gone permanently, and search engines act on it faster than on a 404.",
  },
  {
    q: "What is the difference between a 404 and a soft 404?",
    a: "A real 404 returns the 404 status code. A soft 404 returns a 200 success status while showing a not-found message to the visitor, which is worse: search engines keep the page indexed because the server told them everything was fine. A status checker catches the first case, and only reading the page content catches the second.",
  },
  {
    q: "Is there a limit on how many URLs I can check?",
    a: "Yes, the tool caps each run to keep it fast and to avoid hammering the sites being checked. Requests are validated against the same protections MyKavo uses for scanning, so private and internal network addresses are refused. For continuous checking of a whole site, a site audit crawls and re-checks on a schedule instead.",
  },
];

export const SCRIPT_DETECTOR_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I see what third-party scripts a website loads?",
    a: "Enter the URL and the tool lists every external script the page requests, grouped by domain, and names the recognised services such as Google Analytics, Google Tag Manager, Meta Pixel, Stripe, Hotjar, Intercom and HubSpot. It reads the page as delivered, so it shows what actually loads rather than what a tag manager was configured to load.",
  },
  {
    q: "Why does it matter if an analytics script disappears?",
    a: "Because nothing breaks visibly when it does. The site keeps working, no error appears, and data collection silently stops - so the loss is usually discovered weeks later when someone opens a report and finds a gap. A missing analytics or tag manager script is treated as a high-severity change in MyKavo for exactly this reason.",
  },
  {
    q: "Can this tool find a tracking script that was added without my knowledge?",
    a: "It can show you every third-party script currently loading, which is how you would spot one you did not expect. Comparing that list over time is what actually catches an addition, since a single snapshot has nothing to compare against. Unexpected third-party scripts are worth taking seriously as they can indicate a compromised dependency or tag manager.",
  },
  {
    q: "Does it detect scripts loaded by a tag manager?",
    a: "It detects the scripts present in the delivered page, including those a tag manager injects during load where they are observable. Scripts injected later in response to a user interaction may not appear, because the tool captures the page as it loads rather than driving the page like a real session.",
  },
];

export const EEAT_FAQS: readonly ToolFaq[] = [
  {
    q: "What is E-E-A-T in SEO?",
    a: "E-E-A-T stands for Experience, Expertise, Authoritativeness and Trust. It is the framework Google's search quality raters use to judge whether content deserves to rank, and the same signals increasingly decide whether an AI answer engine will cite a page. It is not a direct ranking score, but the signals behind it are observable on the page.",
  },
  {
    q: "How do I improve the E-E-A-T of a page?",
    a: "Name a real author and say why they are qualified, cite sources by linking to them, show when the page was published and last updated, make contact and policy pages easy to reach, and publish something that is not a restatement of what already ranks. This analyser scores each of those signals on a URL and reports which are missing.",
  },
  {
    q: "Does E-E-A-T affect whether AI Overviews cite my page?",
    a: "The signals overlap heavily. Answer engines need to attribute claims, so they favour pages that state who wrote something, when, and on what basis - the same evidence E-E-A-T describes. Structured data declaring the organisation, author and dates makes those signals machine-readable rather than something a model has to infer.",
  },
  {
    q: "Is this E-E-A-T score an official Google score?",
    a: "No, and treat any tool claiming otherwise with suspicion. Google publishes no E-E-A-T score and no API for one. This analyser inspects the observable signals on a page that map to the published rater guidelines, and reports them so you can act on the specific gaps.",
  },
];
