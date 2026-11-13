/**
 * The post as HTML for a CMS: the article, then its FAQ as headings. Shared
 * by the editor's "Copy as HTML" and the WordPress draft, so both give the
 * same article. Pure: safe in the browser.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function faqHtml(faq: readonly FaqItem[]): string {
  if (faq.length === 0) return "";
  return `\n<h2>Frequently asked questions</h2>\n${faq.map((f) => `<h3>${esc(f.question)}</h3>\n<p>${esc(f.answer)}</p>`).join("\n")}`;
}

/** Body and FAQ, without a title heading: WordPress shows the post title itself. */
export function articleHtml(bodyHtml: string, faq: readonly FaqItem[]): string {
  return `${bodyHtml}${faqHtml(faq)}`;
}

/** The whole post as one HTML document body, title first (Copy as HTML, download). */
export function fullPostHtml(title: string, bodyHtml: string, faq: readonly FaqItem[]): string {
  return `<h1>${esc(title)}</h1>\n${articleHtml(bodyHtml, faq)}`;
}

/** Reads the stored FAQ JSON defensively. */
export function asFaq(value: unknown): FaqItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((f) =>
    f && typeof f === "object" && typeof (f as FaqItem).question === "string" && typeof (f as FaqItem).answer === "string"
      ? [{ question: (f as FaqItem).question, answer: (f as FaqItem).answer }]
      : [],
  );
}
