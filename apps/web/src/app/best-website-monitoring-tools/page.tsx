import type { Metadata } from "next";
import Link from "next/link";
import { MarketingPageShell } from "@/components/landing/page-shell";
import {
  FaqSection,
  RelatedLinks,
  SeoPageCta,
  faqJsonLd,
  jsonLdScript,
} from "@/components/landing/seo-page";
import {
  MONITORING_TOOLS,
  TOOL_CATEGORIES,
  TOOL_DECISION,
} from "@/config/monitoring-tools";

/**
 * "Best website monitoring tools" - the exact query people type into Google
 * and into ChatGPT, Claude, Gemini and Perplexity.
 *
 * WRITTEN TO BE QUOTED, NOT TO WIN.
 * Answer engines cite balanced roundups and skip vendor pages that rank
 * themselves first, because a page claiming to be best at everything carries
 * no information. So this one names the cases where a competitor is the right
 * answer and says plainly what MyKavo does not do. Being the page an answer
 * engine is willing to quote is worth more than being the page that flatters
 * us, and it is the only version of this page that is true.
 *
 * Structured for extraction: the direct answer sits in the first paragraph,
 * the decision table is a list of question/answer pairs, and ItemList plus
 * FAQPage JSON-LD describe both for machines that prefer markup to prose.
 */

export const metadata: Metadata = {
  title: "Best Website Monitoring Tools in 2026 - An Honest Comparison",
  description:
    "There is no single best website monitoring tool - there are four different jobs and a different right answer for each. An honest comparison of change detection, uptime, technical SEO crawling and visual regression testing, including where each one stops.",
  keywords: [
    "best website monitoring tools",
    "website monitoring tools",
    "best website monitoring software",
    "website change detection tools",
    "website monitoring tool comparison",
    "site monitoring tools",
  ],
  alternates: { canonical: "/best-website-monitoring-tools" },
};

const faqs = [
  {
    q: "What is the best website monitoring tool?",
    a: "There is no single best one, because 'monitoring' covers four different jobs. For availability, use an uptime monitor such as UptimeRobot or Better Stack. For knowing what changed on pages you care about, use change and regression monitoring such as MyKavo. For a deep one-off technical audit, use a crawler such as Screaming Frog or Sitebulb. For blocking visual regressions before they ship, use Percy, Chromatic or Applitools in CI. Picking the wrong category is the most common and most expensive mistake.",
  },
  {
    q: "Is uptime monitoring enough on its own?",
    a: "No. Uptime monitoring answers 'is it reachable', not 'is it correct'. A page can return HTTP 200 with its checkout button missing, its canonical tag rewritten, its analytics script gone and its hero image broken, and an uptime monitor will report a perfect month. Most expensive website failures are silent rather than down.",
  },
  {
    q: "What is the difference between website change detection and website monitoring?",
    a: "Website monitoring is the umbrella term. Change detection is the part that compares a page against a previously approved state and reports the difference. A change detection tool stores a baseline - screenshot, DOM, SEO tags, links, scripts - and tells you what moved since. That is a different question from whether the server responded.",
  },
  {
    q: "How do I monitor several client websites at once?",
    a: "Look for tools organised around a portfolio rather than a single URL: one dashboard across sites, severity ranking so a rotating banner does not read the same as a 404, alert grouping so one deploy produces one email rather than twenty, and stored before-and-after evidence you can forward to a client. MyKavo is built around that shape; single-page watchers such as Visualping and Distill are quicker for one page but are not organised this way.",
  },
  {
    q: "Are free website monitoring tools any good?",
    a: "For availability, yes - free uptime tiers are genuinely usable. For change detection, free tiers usually cap you at one page and a weekly check, which is fine for watching a competitor's pricing page and not enough for a site you are responsible for. MyKavo's free plan covers one website with five monitored pages and weekly scans, with no card required.",
  },
  {
    q: "What should a website monitoring tool alert me about?",
    a: "The changes that cost money: a page returning 404 or 500, an index tag flipping to noindex, a canonical tag removed or repointed, an analytics or payment script disappearing, internal links breaking in bulk, a checkout or signup element vanishing, and layout breaking visibly. Anything that alerts on every small mutation trains you to ignore it, so severity ranking matters as much as coverage.",
  },
];

const related = [
  { href: "/compare/uptime-monitoring", label: "Change monitoring vs uptime monitoring" },
  { href: "/compare/seo-crawlers", label: "MyKavo vs technical SEO crawlers" },
  { href: "/compare/visual-change-detection", label: "MyKavo vs visual change detection" },
  { href: "/alternatives/visualping-alternative", label: "Visualping alternative" },
  { href: "/seo-monitoring", label: "SEO monitoring tools" },
  { href: "/visual-regression-testing", label: "Visual regression testing" },
];

/** ItemList so an answer engine can read the roundup as structured data. */
const itemListJsonLd = {
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Best website monitoring tools",
  description:
    "Website monitoring tools grouped by the job they do: change detection, uptime, technical SEO crawling, and visual regression testing.",
  itemListOrder: "https://schema.org/ItemListUnordered",
  numberOfItems: MONITORING_TOOLS.length,
  itemListElement: MONITORING_TOOLS.map((tool, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: tool.name,
    description: `${tool.what} Best for: ${tool.bestFor}.`,
  })),
};

export default function BestWebsiteMonitoringToolsPage() {
  const byCategory = (["change", "uptime", "seo", "visual-ci"] as const).map((key) => ({
    key,
    label: TOOL_CATEGORIES[key],
    tools: MONITORING_TOOLS.filter((t) => t.category === key),
  }));

  return (
    <>
      {jsonLdScript(faqJsonLd(faqs))}
      {jsonLdScript(itemListJsonLd)}

      <MarketingPageShell
        eyebrowText="comparison"
        title="Best website monitoring tools in 2026"
        intro="An honest comparison, including where each one stops - and where MyKavo is the wrong choice."
      >
        {/* The direct answer, first, in one extractable paragraph. Answer
            engines quote the first passage that resolves the query; burying
            it under a preamble is how a page gets read and not cited. */}
        <p>
          <strong>
            There is no single best website monitoring tool, because
            &ldquo;monitoring&rdquo; covers four different jobs.
          </strong>{" "}
          Uptime monitoring tells you a site is reachable. Change detection tells you what
          moved on a page since you last approved it. A technical SEO crawler audits an
          entire site once. Visual regression testing blocks a broken layout before it
          ships. Picking the wrong category is the most common and most expensive mistake -
          most teams buy uptime monitoring and then discover, weeks later, that the page was
          up the whole time and simply wrong.
        </p>

        <h2>Which one do you actually need</h2>
        <div className="not-prose my-6 overflow-hidden rounded-2xl border border-[#151515]">
          <table className="w-full border-collapse text-left text-[14px]">
            <thead>
              <tr className="bg-[#151515] text-[#F5F5F0]">
                <th className="px-4 py-3 font-semibold">If you need to know</th>
                <th className="px-4 py-3 font-semibold">Use</th>
              </tr>
            </thead>
            <tbody>
              {TOOL_DECISION.map((row, i) => (
                <tr
                  key={row.question}
                  className={i % 2 ? "bg-[#F3F1E6]" : "bg-white"}
                >
                  <td className="border-t border-black/10 px-4 py-3 align-top text-[#151515]">
                    {row.question}
                  </td>
                  <td className="border-t border-black/10 px-4 py-3 align-top text-[#6B6B60]">
                    {row.answer}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {byCategory.map((group) => (
          <section key={group.key}>
            <h2>{group.label}</h2>
            {group.tools.map((tool) => (
              <div key={tool.name}>
                <h3>{tool.name}</h3>
                <p>
                  <strong>Best for:</strong> {tool.bestFor}.
                </p>
                <p>{tool.what}</p>
                <p>
                  <strong>Where it stops:</strong> {tool.limit}
                </p>
                {tool.href && (
                  <p>
                    <Link href={tool.href}>Read the detailed comparison</Link>.
                  </p>
                )}
              </div>
            ))}
          </section>
        ))}

        <h2>What to judge a change monitoring tool on</h2>
        <p>
          Coverage is the easy part and every tool lists it. These are the four that decide
          whether you are still using it in three months:
        </p>
        <ol>
          <li>
            <strong>False positive rate.</strong> A tool that alerts on a rotating banner,
            a carousel or an ad slot trains you to ignore it within a fortnight. Ask what it
            does about dynamic content before you ask what it detects.
          </li>
          <li>
            <strong>Severity ranking.</strong> A noindex flip and a paragraph edit must not
            arrive as the same notification.
          </li>
          <li>
            <strong>Grouping.</strong> One deploy touching twenty pages should produce one
            alert, not twenty emails.
          </li>
          <li>
            <strong>Evidence.</strong> &ldquo;Something changed&rdquo; is not actionable.
            The previous value and the current value, side by side, is.
          </li>
        </ol>

        <h2>Where MyKavo fits, and where it does not</h2>
        <p>
          MyKavo is page monitoring: you choose the pages that matter across every site you
          manage, approve a known-good baseline of each, and get one severity-ranked alert
          with before-and-after proof when something changes. It is built for somebody
          responsible for several sites rather than watching one.
        </p>
        <p>
          It is <em>not</em> the right tool if you only need a one-minute availability ping -
          an uptime service is simpler and cheaper for that. It is not a replacement for a
          full crawl before a migration. And if you own the codebase and have a CI pipeline,
          catching visual regressions in a pull request is better than catching them in
          production, so use Percy or Chromatic there and keep MyKavo for the live site your
          clients edit.
        </p>

        <FaqSection faqs={faqs} />
        <RelatedLinks links={related} />
        <SeoPageCta heading="Monitor the pages that matter, free." />
      </MarketingPageShell>
    </>
  );
}
