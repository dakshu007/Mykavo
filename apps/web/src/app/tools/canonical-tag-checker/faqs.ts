import type { ToolFaq } from "@/components/landing/tool-faq";

/** FAQ copy for the Canonical Tag Checker. Follows the house rules in src/config/tool-faqs.ts. */
export const CANONICAL_FAQS: readonly ToolFaq[] = [
  {
    q: "How do I check the canonical tag of a page?",
    a: "Enter the URL and the checker reads every rel=\"canonical\" declaration the page sends, both the <link> tag in the HTML and the HTTP Link header. If the canonical points to a different URL, it then fetches that URL and reports its status code, any redirects, whether it is noindex and what its own canonical says.",
  },
  {
    q: "What happens if a page has more than one canonical tag?",
    a: "When a page declares canonicals that point to different URLs, Google may ignore all of them and choose a canonical itself. The same applies when the HTML tag and the HTTP Link header disagree. Duplicate tags that agree are not a conflict, but they usually mean a theme and a plugin both add one, so keeping a single tag is safer.",
  },
  {
    q: "Should a canonical tag point to the page itself?",
    a: "Yes, for most pages a self-referencing canonical is correct. A canonical should only point elsewhere when this page is a duplicate or near-duplicate of that URL, such as a filtered or tracking-parameter version. The target should return 200 directly, without redirects, and must not be noindex.",
  },
  {
    q: "What can't this canonical checker see?",
    a: "It reads the HTML the server delivers and does not run JavaScript, so a canonical added only by client-side scripts will not appear. It checks public pages only, follows the canonical one step rather than through a whole chain, and reports what the page declares, not which URL Google finally chose. Search Console's URL Inspection shows Google's choice.",
  },
];
