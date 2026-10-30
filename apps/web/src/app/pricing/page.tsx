import type { Metadata } from "next";
import { withSocial } from "@/lib/social-metadata";
import Link from "next/link";
import { Check, Minus } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { PricingCampaignBanner } from "@/components/landing/campaign-announcement";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { TrackOnView } from "@/components/track-on-view";
import { ValueQuoteBanner } from "@/components/value-quote";
import { plans, formatLimit, getPlan } from "@/config/plans";
import { PricingPlans, type PricingPlan } from "@/components/marketing/pricing-plans";
import { yearlyBillingEnabled } from "@/lib/billing/config";
import { TRIAL_DAYS, TRIAL_MAX_WEBSITES, TRIAL_REMINDER_DAYS_LEFT } from "@mykavo/shared";
import {
  FEATURE_LIST,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
  softwareApplicationNode,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = withSocial({
  title: "Pricing - Website Monitoring Plans from $0",
  description: `Website change monitoring from $0. New accounts get a ${TRIAL_DAYS}-day Pro trial on up to ${TRIAL_MAX_WEBSITES} websites. Starter $7/month for 2 websites, Pro $20/month for 8, Agency $79/month for 30.`,
  keywords: [
    "website monitoring pricing",
    "site monitoring tools pricing",
    "website change detection pricing",
    "affordable website monitoring",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "MyKavo Pricing - Website Monitoring from $0",
    description: `New accounts get a ${TRIAL_DAYS}-day Pro trial on up to ${TRIAL_MAX_WEBSITES} websites, then a free plan for one. Starter at $7/month for 2 websites. Pro at $20/month for 8 websites. Agency at $79/month for 30 websites, white-label client reports and 15 team members.`,
    url: "/pricing",
    type: "website",
  },
});

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
    a: `Yes, on every plan. MyKavo AI Website Insights explains each alert in plain English with fix steps for your platform, and writes a weekly status note for every website. Free includes ${formatLimit(freePlan.limits.aiExplanationsPerMonth)} change explanations a month, Starter ${formatLimit(getPlan("starter").limits.aiExplanationsPerMonth)}, Pro ${formatLimit(proPlan.limits.aiExplanationsPerMonth)} and Agency ${formatLimit(getPlan("agency").limits.aiExplanationsPerMonth)}. Weekly notes don't count toward the allowance.`,
  },
  {
    q: "Is there a free trial?",
    a: `Yes. Every new account starts with a ${TRIAL_DAYS}-day Pro trial, no card needed. You get every Pro feature, including daily scans and ${formatLimit(proPlan.limits.pagesPerWebsite)} monitored pages per website, on up to ${TRIAL_MAX_WEBSITES} websites. Paid Pro covers ${formatLimit(proPlan.limits.websites)} websites. You can upgrade at any time during the trial, and we email you ${TRIAL_REMINDER_DAYS_LEFT} days before it ends. If you don't upgrade, the account moves to the Free plan: your oldest monitored website stays monitored, checked weekly. Any others are paused, not deleted, and their baselines are kept (Free keeps ${freePlan.limits.historyDays} days of history). Upgrading resumes paused websites. Already on Free and never had a trial? Start it from Billing in your dashboard.`,
  },
  {
    q: "What's the difference between Starter and Pro?",
    a: "Both have every monitoring feature: daily scans, AI explanations, post-deploy checks, WordPress Safe Updates, conversion element monitoring and site audits. Starter is sized for one person with up to 2 websites (10 pages each, 90 days of history). Pro covers 8 websites with 15 pages each, up to 3 team members, bigger site audits and a full year of history. Starting on Starter and moving up later takes one click in Billing.",
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
    a: "Yes, on every plan including Free. It brings your monitoring into wp-admin. Safe Updates - an automatic check after every plugin, theme and WordPress update, and after plugins are switched on or off - is included in Pro and Agency.",
  },
  {
    q: "What counts as a monitored page?",
    a: "Each specific URL MyKavo scans on a schedule. You choose exactly which pages to monitor per website - home, pricing, checkout, key landing pages.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "MyKavo keeps monitoring everything already configured. It simply asks you to upgrade before adding more websites or pages - nothing is silently dropped. The one exception is a Pro trial that ends without an upgrade: the oldest monitored website stays monitored and any others are paused, not deleted, until you upgrade.",
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

const pricingPlans: PricingPlan[] = plans.map((plan) => ({
  id: plan.id,
  name: plan.name,
  headline: plan.headline,
  priceMonthlyUsd: plan.priceMonthlyUsd,
  priceYearlyUsd: plan.priceYearlyUsd,
  highlighted: Boolean(plan.highlighted),
  features: plan.features,
  websitesLabel: formatLimit(plan.limits.websites),
}));

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
        <div className="mx-auto mb-14 max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// pricing //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}>
            Monitoring that
            <br />
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">pays for itself.</span>
            </span>
          </h1>
          <p className="mt-6 text-[15px] leading-7 text-[#6B6B60]">
            One missed regression costs more than a year of MyKavo. Every new account starts with
            a {TRIAL_DAYS}-day Pro trial on up to {TRIAL_MAX_WEBSITES} websites. After that, stay
            free with one website, start small on Starter for $7/month, go Pro for $20/month, or run
            every client site on Agency for $79/month.
          </p>
        </div>

        {/* Region-aware value quote */}
        <div className="mb-14">
          <ValueQuoteBanner />
        </div>

        {/* A running campaign's offer; nothing outside one. */}
        <PricingCampaignBanner />

        {/* Plan cards, with the monthly/yearly switch and any running offer. */}
        <PricingPlans
          plans={pricingPlans}
          yearlyEnabled={yearlyBillingEnabled}
          trialDays={TRIAL_DAYS}
          trialMaxWebsites={TRIAL_MAX_WEBSITES}
        />

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
              Every new account starts with a {TRIAL_DAYS}-day Pro trial on up to{" "}
              {TRIAL_MAX_WEBSITES} websites, no card. Then stay on Free, or upgrade whenever your
              websites need more.
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
