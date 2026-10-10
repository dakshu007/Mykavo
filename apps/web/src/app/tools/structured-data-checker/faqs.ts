import type { ToolFaq } from "@/components/landing/tool-faq";

/** FAQ copy for the Structured Data Checker. House rules: see config/tool-faqs.ts. */
export const STRUCTURED_DATA_FAQS: readonly ToolFaq[] = [
  {
    q: "What does a structured data checker do?",
    a: "A structured data checker finds the schema markup on a page and shows what it says. This one fetches a live URL, parses every JSON-LD block including @graph containers, lists each entity with its @type and key properties, reports blocks that are not valid JSON, and counts any microdata and RDFa items with their types.",
  },
  {
    q: "Is this the same as Google's Rich Results Test?",
    a: "No. This tool checks the common required and recommended properties for popular types such as Product, Article, FAQPage, BreadcrumbList, LocalBusiness, Event, Recipe and VideoObject. Google's Rich Results Test is the authority on rich result eligibility, renders JavaScript, and checks values in more depth. Each result links to it with your URL filled in.",
  },
  {
    q: "Why is my JSON-LD reported as invalid?",
    a: "Because the block is not valid JSON, and search engines ignore the whole block when it cannot be parsed. Common causes are a trailing comma, a comment, unescaped quotes inside a string, or a template tag that printed nothing. The checker shows the parser's error message and the start of the block so you can find the problem.",
  },
  {
    q: "Which structured data format should I use?",
    a: "Google recommends JSON-LD, though it also reads microdata and RDFa. JSON-LD sits in its own script tag, so it is easier to add, review and keep correct when the page design changes. This checker validates JSON-LD properties and only detects and counts microdata and RDFa.",
  },
];
