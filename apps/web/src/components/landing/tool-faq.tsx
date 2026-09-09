import { faqPage, breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";
import { eyebrow, fontDisplay } from "./style";

/**
 * FAQ block for the free-tool pages.
 *
 * Written for how answer engines read a page rather than how a person skims
 * one. Three things matter and all three are handled here:
 *
 *  - The question is a real <h2>, phrased the way someone would type or ask
 *    it, so a crawler can match the query to a heading.
 *  - The answer opens with a direct, self-contained statement. Answer engines
 *    lift a paragraph out of its page; anything that depends on the sentence
 *    before it is unusable to them.
 *  - The same pairs are emitted as FAQPage JSON-LD, which is the machine-
 *    readable form of exactly what the visitor sees. The rendered copy is the
 *    source of truth - the schema never says anything the page does not.
 *
 * The tool pages previously carried only WebApplication schema and no
 * questions at all, so they were invisible to question-shaped queries despite
 * being the highest-intent pages on the site.
 */

export interface ToolFaq {
  q: string;
  a: string;
}

export function ToolFaqSection({
  faqs,
  toolName,
  toolPath,
}: {
  faqs: readonly ToolFaq[];
  /** Used for the breadcrumb trail, e.g. "Meta Tag Checker". */
  toolName: string;
  /** Site-relative path, e.g. "/tools/meta-tag-checker". */
  toolPath: string;
}) {
  return (
    <section aria-label="Frequently asked questions" className="mx-auto mt-20 max-w-3xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Free tools", path: "/#free-tools" },
              { name: toolName, path: toolPath },
            ]),
          ),
        }}
      />

      <p className={`${eyebrow} mb-4`}>{"// questions //"}</p>
      <h2 className={`${fontDisplay} text-3xl leading-[1.1] text-[#151515] sm:text-4xl`}>
        Frequently asked questions
      </h2>

      {/* Real headings, not a <dl>: crawlers match a query against heading
          text, and a <dt> is not a heading. */}
      <div className="mt-8 divide-y divide-black/10 border-y border-black/10">
        {faqs.map((faq) => (
          <div key={faq.q} className="py-6">
            <h3 className="text-[17px] font-semibold leading-snug text-[#151515]">{faq.q}</h3>
            <p className="mt-2.5 text-[15px] leading-7 text-[#6B6B60]">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
