/**
 * Structured data for a post, built in code from the post itself rather than
 * asked of the model, so it is always valid schema.org (spec round 6).
 */

export type FaqItem = {
  question: string;
  answer: string;
};

export function buildJsonLd(post: {
  title: string;
  metaDescription: string;
  language: string;
  siteName: string;
  siteUrl: string;
  faq: FaqItem[];
}): Record<string, unknown>[] {
  const article: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title.slice(0, 110),
    description: post.metaDescription,
    inLanguage: post.language,
    publisher: { "@type": "Organization", name: post.siteName, url: post.siteUrl },
  };
  const blocks: Record<string, unknown>[] = [article];
  const faq = post.faq.filter((f) => f.question.trim() && f.answer.trim());
  if (faq.length > 0) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faq.map((f) => ({
        "@type": "Question",
        name: f.question.trim(),
        acceptedAnswer: { "@type": "Answer", text: f.answer.trim() },
      })),
    });
  }
  return blocks;
}

/** The <script> tags to paste into a page, one per block. */
export function jsonLdScripts(blocks: Record<string, unknown>[]): string {
  return blocks
    .map(
      (b) =>
        `<script type="application/ld+json">${JSON.stringify(b, null, 2).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n");
}
