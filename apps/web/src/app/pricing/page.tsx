import type { Metadata } from "next";
import { AGENT_LIMITS, type AgentPlanId } from "@mykavo/keyword-agent/pure";
import { withSocial } from "@/lib/social-metadata";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { PricingCampaignBanner } from "@/components/landing/campaign-announcement";
import { PageOverviewBlock } from "@/components/landing/page-overview";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { TrackOnView } from "@/components/track-on-view";
import { ValueQuoteBanner } from "@/components/value-quote";
import { plans, formatLimit, getPlan } from "@/config/plans";
import { PricingPlans } from "@/components/marketing/pricing-plans";
import { pricingPlanData } from "@/components/marketing/pricing-plan-data";
import { yearlyBillingEnabled } from "@/lib/billing/config";
import { AI_KEYWORDS_NAME, FREE_VISIBLE_KEYWORDS, keywordAllowance, keywordAllowanceSummary } from "@/config/ai-keywords";
import {
  FEATURE_LIST,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
  softwareApplicationNode,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = withSocial({
  title: "Pricing - Website Monitoring and AI Blog Writer Plans from $0",
  description: "Website monitoring and the AI Keywords & Blog Writer from $0. Start on the Free plan for 1 website, no card. Starter $7/month for 2 websites, Pro $20/month for 8, Agency $79/month for 30.",
  keywords: [
    "website monitoring pricing",
    "ai blog writer pricing",
    "site monitoring tools pricing",
    "website change detection pricing",
    "affordable website monitoring",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "MyKavo Pricing - Website Monitoring and AI Keywords from $0",
    description: "A free plan for one website, no card. Starter at $7/month for 2 websites. Pro at $20/month for 8 websites. Agency at $79/month for 30 websites, white-label client reports and 15 team members. Every plan includes AI keyword reports and blog posts.",
    url: "/pricing",
    type: "website",
  },
});

/** AI Keywords & Blog Writer allowances, from the agent's own limits. */
function agentLimits(id: string) {
  return AGENT_LIMITS[(id in AGENT_LIMITS ? id : "free") as AgentPlanId];
}

const comparisonRows: Array<{
  label: string;
  value: (p: (typeof plans)[number]) => string | boolean;
}> = [
  {
    label: "Websites",
    value: (p) =>
      formatLimit(p.limits.websites),
  },
  {
    label: "Monitored pages",
    value: (p) => `${formatLimit(p.limits.pagesPerWebsite)} per website`,
  },
  { label: "Scan frequency", value: (p) => (p.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly") },
  { label: "History retention", value: (p) => (p.limits.historyDays >= 365 ? "1 year" : `${p.limits.historyDays} days`) },
  { label: "Email alerts", value: () => true },
  { label: "AI keyword reports", value: (p) => `${formatLimit(agentLimits(p.id).reports)} a month` },
  { label: "AI blog posts", value: (p) => `${formatLimit(agentLimits(p.id).posts)} a month` },
  {
    label: "Keywords shown per report",
    value: (p) => (agentLimits(p.id).visibleOpportunities === Infinity ? "All" : `Top ${agentLimits(p.id).visibleOpportunities}`),
  },
  {
    label: "AI change explanations",
    value: (p) => `${formatLimit(p.limits.aiExplanationsPerMonth)} a month`,
  },
  { label: "AI weekly website notes", value: () => true },
  { label: "Ask ChatGPT and Claude (MCP)", value: (p) => p.limits.aiAssistants },
  {
    label: "Manual scans",
    value: (p) => (p.limits.manualScans ? `${formatLimit(p.limits.manualScansPerDay)} a day` : false),
  },
  { label: "Conversion element monitoring", value: (p) => p.limits.conversionElementMonitoring },
  { label: "Post-deploy checks", value: (p) => p.limits.deployChecks },
  { label: "WordPress plugin", value: () => true },
  { label: "WordPress Safe Updates", value: (p) => p.limits.deployChecks },
  { label: "White-label client reports", value: (p) => p.limits.whiteLabelReports },
  { label: "Automatic client report emails", value: (p) => p.limits.whiteLabelReports },
  {
    label: "Team members",
    value: (p) => (p.limits.maxMembers === 1 ? "Just you" : `Up to ${p.limits.maxMembers}`),
  },
  { label: "Site audit", value: (p) => `${formatLimit(p.limits.siteAuditPages)} pages per crawl` },
];

const proPlan = getPlan("pro");
const freePlan = getPlan("free");

const pricingFaqs = [
  {
    q: "Is AI included?",
    a: `Yes, on every plan, in two parts. AI Website Insights explains each alert in plain English with fix steps for your platform, and writes a weekly status note for every website: Free includes ${formatLimit(freePlan.limits.aiExplanationsPerMonth)} change explanations a month, Starter ${formatLimit(getPlan("starter").limits.aiExplanationsPerMonth)}, Pro ${formatLimit(proPlan.limits.aiExplanationsPerMonth)} and Agency ${formatLimit(getPlan("agency").limits.aiExplanationsPerMonth)}, and weekly notes don't count toward that. The ${AI_KEYWORDS_NAME} finds keywords worth writing about and drafts SEO blog posts: ${keywordAllowanceSummary()}. Nothing is a paid add-on.`,
  },
  {
    q: `What is the ${AI_KEYWORDS_NAME}?`,
    a: `Monitoring protects the traffic you have; AI Keywords helps you win more. MyKavo reads your website and learns your business, then finds the keywords worth writing about from your Google Search Console data (including searches you already rank 8 to 20 for), Google search suggestions and today's live search results, ranked by what to write first. One click writes a full SEO blog post: title, URL slug, meta description, the article, an FAQ section and JSON-LD structured data, plus review notes. You edit it in MyKavo and copy it into your site; MyKavo never publishes it for you. Free shows the top ${FREE_VISIBLE_KEYWORDS} keywords per report, paid plans show all of them, and every post includes one free rewrite. Allowances refill monthly: on your billing date on paid plans, on your signup date on Free. Search Console is optional, but it makes the results better.`,
  },
  {
    q: "Is there a free plan?",
    a: `Yes. MyKavo has a free plan, and every new account starts on it with no card needed. Free covers ${formatLimit(freePlan.limits.websites)} website with ${formatLimit(freePlan.limits.pagesPerWebsite)} monitored pages, weekly scans and ${freePlan.limits.historyDays} days of history, and it does not expire. When you need more, upgrade from Billing in your dashboard: Pro adds daily scans, manual scans and ${formatLimit(proPlan.limits.pagesPerWebsite)} monitored pages per website on up to ${formatLimit(proPlan.limits.websites)} websites.`,
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: `Both have every monitoring feature: daily scans, AI explanations, post-deploy checks, WordPress Safe Updates, conversion element monitoring and site audits. Starter is sized for one person with up to 2 websites (10 pages each, 90 days of history) and ${keywordAllowance("starter")} a month. Pro covers 8 websites with 15 pages each, up to 3 team members, bigger site audits, a full year of history and ${keywordAllowance("pro")} a month. Starting on Starter and moving up later takes one click in Billing.`,
  },
  {
    q: "Should I pick Pro or Agency?",
    a: "Pro fits freelancers and in-house teams looking after up to 8 websites. Agency is for teams running client websites: 30 websites, reports under your own brand that email themselves to clients, and room for 15 people.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrading from Pro to Agency applies straight away and you pay only the difference for the rest of the month. Moving from Agency back to Pro happens at the end of the billing period you have already paid for.",
  },
  {
    q: "I'm already on Pro. Do I lose white-label reports?",
    a: "No. Anyone who subscribed to Pro before Agency launched keeps white-label client reports and 5 team seats for as long as they keep that subscription.",
  },
  {
    q: "Is the WordPress plugin included?",
    a: "Yes, on every plan including Free. It brings your monitoring into wp-admin. Safe Updates - an automatic check after every plugin, theme and WordPress update, and after plugins are switched on or off - is included in every paid plan: Starter, Pro and Agency.",
  },
  {
    q: "What counts as a monitored page?",
    a: "Each specific URL MyKavo scans on a schedule. You choose exactly which pages to monitor per website - home, pricing, checkout, key landing pages.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "MyKavo keeps monitoring everything already configured. It simply asks you to upgrade before adding more websites or pages - nothing is silently dropped.",
  },
  {
    q: "Do you offer annual billing?",
    a: yearlyBillingEnabled
      ? `Yes. Pay yearly and get 12 months for the price of 10: Starter $${getPlan("starter").priceYearlyUsd}, Pro $${getPlan("pro").priceYearlyUsd} and Agency $${getPlan("agency").priceYearlyUsd} a year. Switch between monthly and yearly above the plans.`
      : "Monthly billing for now; yearly plans with two months free are coming soon.",
  },
];

/**
 * Structured data for the page. Offers are built from plans.ts, and the FAQ
 * from the same array the page renders below, so the markup can never claim a
 * price or an answer the visitor does not see.
 */
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    softwareApplicationNode({
      offers: plans.map((plan) => ({
        name: plan.name,
        priceUsd: plan.priceMonthlyUsd,
        description: plan.headline,
      })),
      featureList: FEATURE_LIST,
    }),
  ],
};

const pricingPlans = pricingPlanData();

export default function PricingPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(pricingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(pricingFaqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Pricing", path: "/pricing" }])),
        }}
      />
      <TrackOnView event="pricing_viewed" />
      <LandingNav />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        {/* A short heading, so every plan is visible in the first screen. */}
        <div className="mx-auto mb-10 max-w-2xl text-center">
          <p className={`${eyebrow} mb-3`}>{"// pricing //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            Monitoring that{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">pays for itself.</span>
            </span>
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[#6B6B60]">
            Website monitoring and the AI Keywords &amp; Blog Writer on every plan. Start on Free,
            no card needed, and upgrade when you need more.
          </p>
        </div>

        {/* Plan cards, with the monthly/yearly switch and any running offer. */}
        <PricingPlans
          plans={pricingPlans}
          yearlyEnabled={yearlyBillingEnabled}
        />

        {/* A running campaign's offer; nothing outside one. */}
        <div className="mt-16">
          <PricingCampaignBanner />
        </div>

        {/* Region-aware value quote */}
        <div className="mt-6">
          <ValueQuoteBanner />
        </div>

        {/* Below the plan cards rather than the heading, so every plan stays
            in the first screen. */}
        <PageOverviewBlock path="/pricing" className="mt-16" />

        {/* Comparison table */}
        <section className="mt-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// compare //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}>
            Every plan, side by side.
          </h2>
          <div className="mx-auto max-w-4xl overflow-x-auto rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
            <table className="w-full min-w-130 text-left">
              <thead>
                <tr className="border-b border-black/10">
                  <th className="py-3 pr-4 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]">
                    Feature
                  </th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-sm font-semibold text-[#151515]">
                      {p.name}
                      <span className="block font-mono text-xs font-normal text-[#6B6B60]">
                        ${p.priceMonthlyUsd}/mo
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3.5 pr-4 text-sm font-medium text-[#151515]">{row.label}</td>
                    {plans.map((p) => {
                      const v = row.value(p);
                      return (
                        <td key={p.id} className="px-4 py-3.5 text-sm text-[#6B6B60]">
                          {typeof v === "boolean" ? (
                            v ? (
                              <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#FFD400]">
                                <Check className="size-3.5 text-[#151515]" aria-label="Included" />
                              </span>
                            ) : (
                              <Minus className="size-4.5 text-[#151515]/30" aria-label="Not included" />
                            )
                          ) : (
                            v
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto mt-24 max-w-2xl">
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}>
            Pricing questions.
          </h2>
          <div className="space-y-3">
            {pricingFaqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-black/10 bg-white px-6 py-5 transition-colors open:border-[#151515] open:pb-6 open:shadow-[4px_4px_0_#FFD400]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-[#6B6B60] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-24">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-16 text-center shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <h2 className={`${fontDisplay} mx-auto max-w-xl text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              Ready when <span className="text-[#FFD400]">you are.</span>
            </h2>
            <p className="mx-auto mb-8 mt-3 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              Start on the Free plan, no card needed. Upgrade whenever your websites need more.
            </p>
            <Link
              href="/signup"
              className="inline-flex rounded-full bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
            >
              Start Monitoring Free
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
