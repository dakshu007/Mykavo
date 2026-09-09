import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";
import { COMPARISONS, type Comparison } from "@/config/comparisons";

/**
 * Renderer for the category comparison pages.
 *
 * Built to be quotable by answer engines, which is a different target from
 * being persuasive to a reader skimming:
 *
 *  - opens with a direct answer capsule, before any argument;
 *  - the substance is a real HTML <table>, because comparative queries are
 *    exactly where answer engines lift tabular data;
 *  - a "where they win" section states, plainly, where the other category is
 *    the better choice. This is not modesty. A comparison that only flatters
 *    its author is recognisably marketing and gets discounted accordingly,
 *    whereas one that concedes real ground is far likelier to be cited - and
 *    it is the only version that is honest.
 */
export function ComparisonPage({ comparison }: { comparison: Comparison }) {
  const related = COMPARISONS.filter((c) => c.slug !== comparison.slug);

  return (
    <MarketingPageShell
      eyebrowText="compare"
      title={comparison.title}
      intro={comparison.capsule}
      updated="September 9, 2026"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(comparison.faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Compare", path: "/compare" },
              { name: comparison.name, path: `/compare/${comparison.slug}` },
            ]),
          ),
        }}
      />

      <h2>How do {comparison.themLabel.toLowerCase()} compare with MyKavo?</h2>
      <p>
        The table below is capability by capability. Anything marked for MyKavo is in the
        shipped product today, not a roadmap item.
      </p>

      {/* Wide tables scroll inside their own container rather than pushing the
          page sideways on a phone. */}
      <div className="not-prose my-8 overflow-x-auto rounded-xl border border-black/15">
        <table className="w-full min-w-160 border-collapse text-left text-[14px]">
          <thead>
            <tr className="border-b border-black/15 bg-[#F3F1E6]">
              <th scope="col" className="px-4 py-3 font-semibold text-[#151515]">
                Capability
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-[#151515]">
                {comparison.themLabel}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-[#151515]">
                MyKavo
              </th>
            </tr>
          </thead>
          <tbody>
            {comparison.rows.map((row) => (
              <tr key={row.capability} className="border-b border-black/10 last:border-b-0">
                <th
                  scope="row"
                  className="px-4 py-3 align-top font-medium text-[#151515]"
                >
                  {row.capability}
                </th>
                <td className="px-4 py-3 align-top text-[#6B6B60]">{row.them}</td>
                <td className="px-4 py-3 align-top text-[#151515]">{row.us}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Where {comparison.themLabel.toLowerCase()} are the better choice</h2>
      <p>
        There are real cases where the other tool wins, and pretending otherwise would waste
        your time. Pick them over MyKavo when you need:
      </p>
      <ul className="not-prose my-6 space-y-2.5">
        {comparison.whereTheyWin.map((point) => (
          <li key={point} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
            <Minus className="mt-1 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <h2>Who should choose MyKavo?</h2>
      <p>{comparison.bestFor}</p>
      <ul className="not-prose my-6 space-y-2.5">
        {[
          "Free plan: 1 website, 5 monitored pages, weekly scans, 30-day history, no card",
          "Pro at $20/month: 8 websites, 15 pages each, daily scans, 1-year history, 5 seats",
          "Site audit on every plan: 89 checks across 22 categories",
          "Every alert carries the previous and current value, and a screenshot diff for visual change",
        ].map((point) => (
          <li key={point} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
            <Check
              className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]"
              aria-hidden
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <h2>Frequently asked questions</h2>
      {comparison.faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}

      <SeoPageCta heading="Know what changed. Fix what matters." />

      <h2>Other comparisons</h2>
      <ul>
        {related.map((c) => (
          <li key={c.slug}>
            <Link href={`/compare/${c.slug}`}>{c.title}</Link>
          </li>
        ))}
      </ul>
    </MarketingPageShell>
  );
}
