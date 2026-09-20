import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { MarketingPageShell } from "@/components/landing/page-shell";
import { SeoPageCta } from "@/components/landing/seo-page";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";
import { ALTERNATIVES, VERIFIED_ON, type Alternative } from "@/config/alternatives";

/**
 * Renderer for named-vendor comparison pages.
 *
 * Structurally the same as the category comparison renderer, with two
 * additions that only a named-vendor page needs:
 *
 *  - a "what it is" paragraph that describes the other product fairly and in
 *    its own terms, before any comparison starts. A page that never says what
 *    the competitor is good at is not a comparison, it is an advert;
 *  - a visible sources block with the date every claim was checked. Quoting a
 *    rival's price without saying when you looked is how comparison pages go
 *    quietly wrong, and it is the reader who pays for it.
 */
export function AlternativePage({ alternative }: { alternative: Alternative }) {
  const related = ALTERNATIVES.filter((a) => a.slug !== alternative.slug);

  return (
    <MarketingPageShell
      eyebrowText="alternatives"
      title={alternative.title}
      intro={alternative.capsule}
      updated={VERIFIED_ON}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(alternative.faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([
              { name: "Alternatives", path: "/alternatives" },
              { name: alternative.name, path: `/alternatives/${alternative.slug}` },
            ]),
          ),
        }}
      />

      <h2>What {alternative.name} is</h2>
      <p>{alternative.whatItIs}</p>

      <h2>
        {alternative.name} vs MyKavo, capability by capability
      </h2>
      <p>
        Anything listed for MyKavo is in the shipped product today, not a roadmap item.
        Everything listed for {alternative.name} was taken from their own published material on{" "}
        {VERIFIED_ON}; sources are at the foot of this page.
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
                {alternative.name}
              </th>
              <th scope="col" className="px-4 py-3 font-semibold text-[#151515]">
                MyKavo
              </th>
            </tr>
          </thead>
          <tbody>
            {alternative.rows.map((row) => (
              <tr key={row.capability} className="border-b border-black/10 last:border-b-0">
                <th scope="row" className="px-4 py-3 align-top font-medium text-[#151515]">
                  {row.capability}
                </th>
                <td className="px-4 py-3 align-top text-[#6B6B60]">{row.them}</td>
                <td className="px-4 py-3 align-top text-[#151515]">{row.us}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Where {alternative.name} is the better choice</h2>
      <p>
        There are real cases where {alternative.name} wins, and pretending otherwise would waste
        your time and cost you a refund. Choose it over MyKavo when:
      </p>
      <ul className="not-prose my-6 space-y-2.5">
        {alternative.whereTheyWin.map((point) => (
          <li key={point} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
            <Minus className="mt-1 size-4 shrink-0 text-[#6B6B60]" aria-hidden />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <h2>Who should choose MyKavo?</h2>
      <p>{alternative.bestFor}</p>
      <ul className="not-prose my-6 space-y-2.5">
        {[
          "Free plan: 1 website, 5 monitored pages, weekly scans, 30-day history, no card",
          "Pro at $20/month: 8 websites, 15 monitored pages each, daily scans, 1-year history, 5 seats",
          "Site audit on every plan: 89 checks across 22 categories, with CSV export",
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
      {alternative.faqs.map((faq) => (
        <div key={faq.q}>
          <h3>{faq.q}</h3>
          <p>{faq.a}</p>
        </div>
      ))}

      <h2>Sources and last check</h2>
      <p>
        Every {alternative.name} claim on this page was checked on {VERIFIED_ON} against the
        sources below. Software pricing and features change often - if you are making a decision,
        confirm the current details on their own site. If anything here is out of date, tell us
        and we will correct it.
      </p>
      <ul>
        {alternative.sources.map((source) => (
          <li key={source.url}>
            <a href={source.url} rel="nofollow noopener" target="_blank">
              {source.label}
            </a>
          </li>
        ))}
      </ul>

      <SeoPageCta heading="Know what changed. Fix what matters." />

      <h2>Other comparisons</h2>
      <ul>
        {related.map((a) => (
          <li key={a.slug}>
            <Link href={`/alternatives/${a.slug}`}>{a.title}</Link>
          </li>
        ))}
        <li>
          <Link href="/compare">How MyKavo compares with categories of tool</Link>
        </li>
      </ul>
    </MarketingPageShell>
  );
}
