import type { ToolFaq } from "@/components/landing/tool-faq";

/** House rules: see the top of src/config/tool-faqs.ts. */
export const BROKEN_LINK_CHECKER_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I find broken links on a page?",
    a: "Enter the page URL and the checker reads every link in the page's HTML, then requests each one and reports the ones that fail. A link counts as broken when it returns 404, 410, another 4xx error (except 401, 403 and 429), a 5xx server error, or its domain doesn't resolve or refuses the connection. Broken links are listed first, with the anchor text so you can find them on the page.",
  },
  {
    q: "Does this tool check a whole website?",
    a: "No. It checks one page at a time, and up to the first 100 unique links on that page. It doesn't crawl from page to page. To check a list of specific URLs instead, the Bulk URL Status Checker takes up to 20 at once. Links added by JavaScript after the page loads aren't in the HTML, so this checker can't see them.",
  },
  {
    q: "Why does a link show as \"couldn't verify\" instead of broken?",
    a: "Because the result wasn't definite. Many sites, including large social networks, answer automated requests with 401, 403 or 429 even when the page works fine in a browser, and some servers are just slow to respond within the 5-second limit. Rather than guess, the checker labels these as couldn't verify so a broken result reflects a definite failure we saw.",
  },
  {
    q: "Can I get alerted when links on my site break?",
    a: "Yes, with monitoring rather than a one-off check. MyKavo checks the internal links on the pages you monitor after each scheduled scan and raises one grouped change when links that worked start returning 404, 410, a 5xx error or stop resolving. Five or more newly broken links is rated high severity, which is emailed by default; fewer is rated medium and shows in the dashboard, or by email if you lower your alert threshold. Links that were already broken when you approved the baseline don't alert again. External links are not monitored.",
  },
];
