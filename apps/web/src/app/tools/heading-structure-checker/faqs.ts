import type { ToolFaq } from "@/components/landing/tool-faq";

/** FAQ copy for the Heading Structure Checker. House rules: see config/tool-faqs.ts. */
export const HEADING_STRUCTURE_FAQS: readonly ToolFaq[] = [
  {
    q: "What does a heading structure checker do?",
    a: "A heading structure checker lists every H1 to H6 heading on a page in the order it appears and shows them as an indented outline. This one fetches a live URL, counts headings per level, and flags a missing H1, several H1s, empty headings, skipped levels such as H2 to H4, and headings longer than 70 characters.",
  },
  {
    q: "Is it bad to have more than one H1 on a page?",
    a: "No, not for Google. Google has said several H1 headings on one page are fine and do not hurt rankings. The checker still mentions it because one H1 that names the page topic is the clearest structure for visitors and screen reader users, and a second H1 is often a theme or plugin adding one by accident.",
  },
  {
    q: "Do skipped heading levels hurt SEO?",
    a: "Skipped levels, such as an H2 followed directly by an H4, do not stop a page ranking. They matter more for accessibility: screen reader users often jump between headings, and a gap in the levels suggests a missing section. The checker reports skips as information rather than errors for that reason.",
  },
  {
    q: "Why can't the checker see some of my headings?",
    a: "The checker reads the HTML your server returns and does not run JavaScript, so headings added by client-side scripts after the page loads are not included. Headings inside script, style, template and noscript tags or HTML comments are ignored on purpose, and pages behind a login cannot be fetched.",
  },
];
