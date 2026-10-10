import type { ToolFaq } from "@/components/landing/tool-faq";

export const HREFLANG_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I check hreflang tags on a page?",
    a: "Enter the page URL. The checker reads every hreflang annotation in the HTML and in the HTTP Link header, validates each language and region code, then opens up to 15 of the alternate pages to confirm each one loads, isn't noindex, and links back to the page you checked. Hreflang declared only in an XML sitemap isn't read by this tool.",
  },
  {
    q: "Why is en-UK wrong in hreflang?",
    a: "Because the region part must be an ISO 3166-1 country code, and the code for the United Kingdom is GB, not UK. Google ignores annotations it can't parse, so en-UK quietly does nothing; en-GB is the correct value. The same rule rejects underscores like en_US and a country on its own like us.",
  },
  {
    q: "What is a hreflang return link?",
    a: "It's the matching annotation on the other page. If your English page says the German version is at /de/, the /de/ page must list the English page too. Google may ignore hreflang pairs that aren't confirmed from both sides, so a missing return link is the most common reason hreflang doesn't work.",
  },
  {
    q: "Do I need x-default?",
    a: "No, it's optional. x-default tells Google which page to show people whose language or region doesn't match any of your versions, often a language picker or your main site. Without it, Google chooses for those visitors itself.",
  },
];
