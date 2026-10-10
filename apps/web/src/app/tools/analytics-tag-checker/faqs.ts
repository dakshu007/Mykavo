import type { ToolFaq } from "@/components/landing/tool-faq";

/** FAQ for the Analytics Tag Checker. House rules: top of config/tool-faqs.ts. */
export const ANALYTICS_TAG_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I check if Google Analytics is installed on a website?",
    a: "Enter the page URL. The checker reads the page's HTML and lists every GA4 measurement ID (G-) it finds in the gtag.js script or a gtag config call, along with Google Tag Manager containers (GTM-), Google Ads tags (AW-) and other analytics tools. If GA4 is set up only inside a GTM container, it won't appear in the HTML, and the checker says so.",
  },
  {
    q: "Why does the checker find GTM but not GA4?",
    a: "Because GA4 is configured inside the Tag Manager container. GTM loads the GA4 tag after the page starts running, so it is never written into the HTML this tool reads. To confirm GA4 fires in that setup, use GTM's Preview mode or Google Tag Assistant.",
  },
  {
    q: "Can having GA4 and Google Tag Manager on the same page double count visits?",
    a: "It can. If GA4 is installed directly with gtag.js and the GTM container also fires a GA4 tag for the same measurement ID, each page view is sent twice. The checker flags pages with both so you can check the container, and it also flags a measurement ID that is configured more than once in the page.",
  },
  {
    q: "Is Universal Analytics still collecting data?",
    a: "No. Google stopped processing data for standard Universal Analytics properties on July 1, 2023, and for Analytics 360 properties on July 1, 2024. A UA- tag still on a page sends data nowhere useful, so the checker marks it as retired and it can be removed once GA4 is in place.",
  },
];
