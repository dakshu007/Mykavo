/**
 * What each Site Audit issue costs the site owner, in plain words: lost
 * visitors, lost sales or leads, lost trust, or being left out of AI answers.
 *
 * The registry says what an issue IS and how to fix it, in SEO terms. Most
 * owners do not connect "missing meta description" with fewer clicks, or a
 * slow server response with abandoned carts. This is the line that makes the
 * fix worth doing. Kept apart from the registry so the business copy can be
 * edited without touching check logic; a test asserts every check has one.
 */

import { AUDIT_CHECKS } from "./registry";

/** Visitors: fewer people find or reach the page. Sales: fewer buy, sign up or get in touch. */
export type AuditImpactArea = "visitors" | "sales" | "trust" | "ai";

export interface AuditImpact {
  /** One or two plain sentences: what this costs, without jargon. */
  costs: string;
  /** What it hurts, most important first. */
  hurts: AuditImpactArea[];
}

export const AUDIT_IMPACT: Record<string, AuditImpact> = {
  // HTTP status
  "http-4xx": { costs: "Anyone who lands here from Google, an ad or a shared link sees an error page and leaves. Every visit to it is a lost visitor, and possibly a lost sale.", hurts: ["visitors", "sales"] },
  "http-5xx": { costs: "The page is broken for everyone right now. Visitors leave, and if it keeps failing Google drops the page from search.", hurts: ["visitors", "sales"] },
  "http-fetch-error": { costs: "If MyKavo could not load it, some visitors and search engines probably cannot either. A page nobody can open earns nothing.", hurts: ["visitors"] },
  "http-redirect": { costs: "Each extra redirect makes the page a little slower to open and passes slightly less ranking strength. Small, but it adds up across many links.", hurts: ["visitors"] },
  "redirect-chain": { costs: "Every hop adds delay on phones, and long chains make Google give up before reaching the page, so it can slip in search.", hurts: ["visitors"] },
  "redirect-loop": { costs: "The page never opens, for anyone. Visitors see a browser error and search engines drop it.", hurts: ["visitors", "sales"] },
  "soft-404": { costs: "Google may treat this page as missing and stop showing it in search, so the traffic it could bring is lost.", hurts: ["visitors"] },
  "crawl-depth": { costs: "Pages buried this deep get found less often, by Google and by people, so they bring in fewer visitors than they could.", hurts: ["visitors"] },

  // Indexability
  "noindex-page": { costs: "This page is hidden from Google. If that was not on purpose, it gets no search traffic at all.", hurts: ["visitors"] },
  "canonical-missing": { costs: "Copies of this page (with tracking tags, for example) can compete with it in Google and split its ranking, so it ranks lower than it should.", hurts: ["visitors"] },
  "canonical-multiple": { costs: "Conflicting signals make Google ignore them, so it may show the wrong version of the page, or none.", hurts: ["visitors"] },
  "canonical-other": { costs: "Google is told to show a different page instead of this one. If that was not intended, this page gets no search traffic.", hurts: ["visitors"] },
  "canonical-redirect": { costs: "Google has to follow a detour to find the page you want ranked, which can weaken or confuse which page it shows.", hurts: ["visitors"] },
  "canonical-broken": { costs: "Google is pointed at a page that does not work, so it may drop this page from search entirely.", hurts: ["visitors"] },
  "meta-refresh": { costs: "Visitors see the page flash and jump, which feels broken, and search engines handle it worse than a normal redirect.", hurts: ["visitors", "trust"] },
  "canonical-relative": { costs: "Google may read the address wrongly and rank the wrong page, splitting the traffic this one should get.", hurts: ["visitors"] },

  // Titles
  "title-missing": { costs: "The title is the blue headline people click in Google. Without one, Google makes one up, and fewer people click.", hurts: ["visitors"] },
  "title-empty": { costs: "Search results and browser tabs show a made-up or blank headline, so fewer people click through.", hurts: ["visitors"] },
  "title-multiple": { costs: "Google may show the wrong headline in search, one that does not sell the page, so fewer people click.", hurts: ["visitors"] },
  "title-long": { costs: "The end of the headline gets cut off in Google with \"...\", often the part that would have made people click.", hurts: ["visitors"] },
  "title-short": { costs: "A headline this short gives people little reason to choose your result over the one above it.", hurts: ["visitors"] },
  "title-duplicate": { costs: "Pages with the same headline compete with each other in Google and look like copies, so both rank and get clicked less.", hurts: ["visitors"] },
  "title-h1-same": { costs: "A small missed chance: a different title and heading let one page match more of the ways people search.", hurts: ["visitors"] },

  // Meta description
  "desc-missing": { costs: "The description is the short text under your headline in Google. Without it, Google grabs random text, and fewer people click.", hurts: ["visitors"] },
  "desc-empty": { costs: "Google fills the gap with random text from the page, which rarely convinces anyone to click.", hurts: ["visitors"] },
  "desc-multiple": { costs: "Google may show the wrong description under your result, so fewer people click.", hurts: ["visitors"] },
  "desc-long": { costs: "The description is cut off mid-sentence in Google, which looks careless and loses the call to action.", hurts: ["visitors"] },
  "desc-short": { costs: "A very short description leaves your result looking empty next to the others, so it gets fewer clicks.", hurts: ["visitors"] },
  "desc-duplicate": { costs: "Pages with the same description look like copies in Google, so people cannot tell which one they want and click less.", hurts: ["visitors"] },

  // Headings
  "h1-missing": { costs: "The main heading tells visitors and Google what the page is about. Without it, the page ranks lower and people are less sure they are in the right place.", hurts: ["visitors"] },
  "h1-multiple": { costs: "Several main headings blur what the page is about, which can weaken how well it ranks.", hurts: ["visitors"] },
  "h1-duplicate": { costs: "Pages with the same main heading look like copies to Google and to visitors, so they compete instead of helping each other.", hurts: ["visitors"] },
  "h1-long": { costs: "A heading this long is hard to scan, so visitors take longer to see they are on the right page.", hurts: ["visitors"] },
  "heading-empty": { costs: "Empty headings confuse screen readers and add nothing for visitors or Google. A quick tidy-up.", hurts: ["trust"] },
  "heading-skip": { costs: "Skipped heading levels make the page harder to follow with a screen reader. Minor for ranking, real for some visitors.", hurts: ["trust"] },

  // Content
  "content-thin": { costs: "Pages with very little text rarely rank, and visitors who arrive leave without the answer they came for.", hurts: ["visitors", "sales"] },
  "content-lorem": { costs: "Placeholder text on a live page looks unfinished and unprofessional. Visitors lose trust on the spot.", hurts: ["trust", "sales"] },
  "content-duplicate": { costs: "Google picks one copy to show and ignores the rest, so pages you worked on bring in no traffic.", hurts: ["visitors"] },

  // Images
  "img-missing-alt": { costs: "Your images cannot be found in Google Images and are invisible to people using screen readers, so you miss visitors from both.", hurts: ["visitors", "trust"] },
  "img-missing-dims": { costs: "The page jumps around while it loads, so people tap the wrong thing, which is frustrating and can cost a click or a sale. Google also measures this.", hurts: ["sales", "visitors"] },
  "img-broken": { costs: "Visitors see a broken image, often a product photo or banner. It looks broken and untrustworthy, and costs sales.", hurts: ["sales", "trust"] },
  "img-no-lazy": { costs: "Phones download images nobody has scrolled to yet, so the page opens slower. Slow pages lose visitors before they see anything.", hurts: ["sales", "visitors"] },

  // Internal links
  "link-internal-broken": { costs: "A visitor clicks a link on your own site and hits an error. Many leave right there, and Google trusts the site a little less.", hurts: ["sales", "visitors"] },
  "link-internal-redirect": { costs: "Each click takes a detour, making the site slightly slower. Small on its own, worth tidying.", hurts: ["visitors"] },
  "link-orphan": { costs: "No page links here, so visitors cannot find it by browsing and Google treats it as unimportant. It brings in little or no traffic.", hurts: ["visitors"] },
  "link-empty-anchor": { costs: "A link with no text tells nobody where it goes, which is confusing for visitors and screen readers alike.", hurts: ["trust"] },
  "link-generic-anchor": { costs: "\"Click here\" tells Google nothing about the page it points to, a missed chance to help that page rank.", hurts: ["visitors"] },
  "link-js-only": { costs: "Google may not follow links that only work with JavaScript, so the pages behind them get found less often.", hurts: ["visitors"] },
  "link-internal-nofollow": { costs: "You are telling Google not to pass ranking strength to your own pages, which holds them back in search.", hurts: ["visitors"] },
  "link-too-many": { costs: "Too many links overwhelm visitors, who click none of them, and spread ranking strength so thin it helps no page.", hurts: ["visitors"] },

  // External links
  "link-external-broken": { costs: "Sending visitors to dead pages makes your site look neglected and less trustworthy.", hurts: ["trust"] },
  "link-external-http": { costs: "Visitors following the link may see a \"Not secure\" warning, which reflects on your site.", hurts: ["trust"] },

  // URLs
  "url-long": { costs: "Long addresses are hard to share and get cut off in search results, which looks messy and earns fewer clicks.", hurts: ["visitors"] },
  "url-uppercase": { costs: "The same page can exist at two addresses, splitting visitors and ranking between them.", hurts: ["visitors"] },
  "url-underscore": { costs: "Google reads \"word_word\" as one word, so the page can miss searches it should match.", hurts: ["visitors"] },
  "url-params": { costs: "Many versions of the same page can end up in Google and compete with each other, so each ranks worse.", hurts: ["visitors"] },
  "url-session-id": { costs: "Every visit creates a new address for the same page, flooding Google with copies, and shared links can leak a visitor's session.", hurts: ["visitors", "trust"] },

  // Sitemap
  "sitemap-missing": { costs: "Google finds new and deep pages more slowly, so they start bringing in visitors later, or not at all.", hurts: ["visitors"] },
  "sitemap-broken-url": { costs: "You are sending Google to pages that fail. It wastes Google's time on your site and makes it trust your sitemap less.", hurts: ["visitors"] },
  "sitemap-redirect-url": { costs: "Google takes a detour for these pages. Minor, but it slows how fast your real pages get picked up.", hurts: ["visitors"] },
  "sitemap-noindex-url": { costs: "Mixed signals: you ask Google to index a page and also tell it not to. Important pages can end up left out of search.", hurts: ["visitors"] },

  // Robots.txt
  "robots-missing": { costs: "Mostly harmless, but you miss the easiest way to point search engines at your sitemap.", hurts: ["visitors"] },
  "robots-no-sitemap": { costs: "Search engines have to guess where your sitemap is, so new pages may be found more slowly.", hurts: ["visitors"] },
  "robots-blocks-assets": { costs: "Google sees your pages without their styling, may decide they work badly on phones, and rank them lower.", hurts: ["visitors"] },

  // Structured data
  "schema-invalid-json": { costs: "The extra information that earns star ratings, prices or FAQs in Google is ignored, so your results look plainer and get fewer clicks.", hurts: ["visitors"] },
  "schema-missing": { costs: "Your results cannot show extras like stars, prices or breadcrumbs, so competitors' richer results win the click.", hurts: ["visitors"] },

  // Social tags
  "og-incomplete": { costs: "When someone shares this page on Facebook, LinkedIn or WhatsApp, the preview looks bare or wrong, and fewer people click it.", hurts: ["visitors"] },
  "twitter-missing": { costs: "Shares on X show a plain link instead of a card with an image, so they get fewer clicks.", hurts: ["visitors"] },
  "favicon-missing": { costs: "A blank icon in browser tabs and search results looks unfinished and makes your result easier to skip.", hurts: ["trust"] },

  // Security
  "sec-http-page": { costs: "Browsers label the page \"Not secure\". Many visitors leave, especially before paying or filling a form, and Google ranks it lower.", hurts: ["sales", "trust", "visitors"] },
  "sec-mixed-content": { costs: "Browsers block parts of the page or remove the padlock, so things may look broken and visitors trust it less.", hurts: ["trust", "sales"] },
  "sec-insecure-form": { costs: "What people type into this form travels unprotected, and browsers warn them. Most will not submit, so you lose those leads.", hurts: ["sales", "trust"] },
  "sec-no-hsts": { costs: "A small security gap on first visits. Rarely noticed by visitors, but worth closing.", hurts: ["trust"] },

  // Performance
  "perf-slow-ttfb": { costs: "Every visitor waits before anything appears. Slow pages lose people before they see your offer, and Google ranks them lower.", hurts: ["sales", "visitors"] },
  "perf-large-html": { costs: "Heavy pages open slower on phones, and every extra second loses some visitors.", hurts: ["sales", "visitors"] },
  "perf-no-compression": { costs: "Pages take several times longer to download than they need to, especially on mobile data. Slower pages convert worse.", hurts: ["sales", "visitors"] },
  "perf-no-caching": { costs: "Returning visitors download everything again, so the site feels slower than it should.", hurts: ["sales"] },
  "perf-inline-bloat": { costs: "Every page carries extra weight that cannot be reused, so each one opens a little slower.", hurts: ["sales"] },

  // Mobile
  "mobile-no-viewport": { costs: "On phones the page shows tiny and zoomed out. Most of your visitors are on phones, so many leave, and Google ranks the page lower.", hurts: ["sales", "visitors"] },

  // International
  "hreflang-invalid": { costs: "Google may show the wrong language version of your page, so visitors abroad land on a page they cannot read.", hurts: ["visitors"] },
  "hreflang-no-self": { costs: "Google may ignore your language settings, sending people to the wrong country or language version.", hurts: ["visitors"] },
  "lang-missing": { costs: "Screen readers may read the page in the wrong accent, and search engines are less sure who to show it to.", hurts: ["trust"] },

  // Accessibility
  "a11y-empty-link": { costs: "People using screen readers cannot tell what this button or link does, so they cannot use it, and those are customers you lose.", hurts: ["sales", "trust"] },
  "a11y-input-no-label": { costs: "Forms without labels are harder for everyone to fill in, and impossible for some, so fewer people finish them.", hurts: ["sales"] },

  // AI search
  "ai-crawlers-blocked": { costs: "ChatGPT, Claude and Perplexity cannot read your site, so they never mention or link to you when people ask them for recommendations.", hurts: ["ai", "visitors"] },
  "ai-training-crawlers-blocked": { costs: "Usually a deliberate choice. It keeps your content out of AI training, but AI models may know less about your brand over time.", hurts: ["ai"] },
  "ai-llms-txt-missing": { costs: "Small for now: some AI tools look for this file. It does not affect Google search.", hurts: ["ai"] },
  "ai-llms-txt-invalid": { costs: "AI tools that look for your site summary get an error page instead.", hurts: ["ai"] },
  "ai-no-entity-schema": { costs: "AI assistants and Google are less sure who you are, so they may not name your business when people ask about it.", hurts: ["ai", "trust"] },
  "ai-questions-no-faq-schema": { costs: "Your answers are harder for AI and Google to pick up and quote, so a competitor's answer may be shown instead.", hurts: ["ai", "visitors"] },
  "ai-article-no-author": { costs: "Content without a named author looks less credible, to AI answers, to Google and to readers.", hurts: ["ai", "trust"] },
  "ai-article-no-date": { costs: "AI and Google cannot tell if the page is current, so they may prefer a newer-looking page from someone else.", hurts: ["ai", "visitors"] },
  "ai-no-lead-answer": { costs: "AI answers and Google like to quote a short, clear answer near the top. Without one, they quote someone else.", hurts: ["ai", "visitors"] },

  // Trust signals
  "trust-no-contact": { costs: "Visitors who cannot find a way to reach you trust you less and buy less. Google looks for this too.", hurts: ["trust", "sales"] },
  "trust-no-privacy": { costs: "Shoppers, ad platforms and payment providers expect a privacy policy. Without one you can lose sales and even ad approval.", hurts: ["trust", "sales"] },

  // HTML hygiene
  "html-no-doctype": { costs: "Browsers may display the page inconsistently, so it can look broken for some visitors.", hurts: ["trust"] },
  "html-no-charset": { costs: "Accents, symbols or prices can show as garbled characters, which looks broken.", hurts: ["trust"] },
  "html-deprecated-tags": { costs: "Old markup can display unpredictably in modern browsers. Usually minor, but a sign the page needs updating.", hurts: ["trust"] },
};

/** Words for each area, for badges and summaries. */
export const IMPACT_AREA_LABEL: Record<AuditImpactArea, string> = {
  visitors: "Visitors",
  sales: "Sales and leads",
  trust: "Trust",
  ai: "AI answers",
};

/** The impact of one check; a sensible fallback for checks added later. */
export function auditImpactOf(checkId: string): AuditImpact {
  return (
    AUDIT_IMPACT[checkId] ?? {
      costs: AUDIT_CHECKS[checkId]
        ? "Fixing this helps the page work better for visitors and search engines."
        : "",
      hurts: ["visitors"],
    }
  );
}

/**
 * How many issue types (and affected pages) hurt each area, for the "why
 * fix these" summary at the top of an audit.
 */
export function summarizeImpact(
  groups: { checkId: string | null; count: number }[],
): Record<AuditImpactArea, { issues: number; pages: number }> {
  const out: Record<AuditImpactArea, { issues: number; pages: number }> = {
    visitors: { issues: 0, pages: 0 },
    sales: { issues: 0, pages: 0 },
    trust: { issues: 0, pages: 0 },
    ai: { issues: 0, pages: 0 },
  };
  for (const g of groups) {
    if (!g.checkId || !AUDIT_CHECKS[g.checkId]) continue;
    for (const area of auditImpactOf(g.checkId).hurts) {
      out[area].issues += 1;
      out[area].pages += g.count;
    }
  }
  return out;
}
