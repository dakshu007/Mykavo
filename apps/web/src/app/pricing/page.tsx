import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { PlanCards } from "@/components/marketing/plan-cards";
import { ButtonLink } from "@/components/ui/button";
import { TrackOnView } from "@/components/track-on-view";
import { plans, formatLimit } from "@/config/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for website change monitoring. Start free with one website, or go Pro at $12/month for 8 websites with 20 monitored pages each — add more anytime.",
  alternates: { canonical: "/pricing" },
};

const comparisonRows: Array<{
  label: string;
  value: (p: (typeof plans)[number]) => string | boolean;
}> = [
  {
    label: "Websites",
    value: (p) =>
      p.id === "pro" ? `${p.limits.websites} + add-ons` : formatLimit(p.limits.websites),
  },
  {
    label: "Monitored pages",
    value: (p) => `${formatLimit(p.limits.pagesPerWebsite)} per website`,
  },
  { label: "Scan frequency", value: (p) => (p.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly") },
  { label: "History retention", value: (p) => (p.limits.historyDays >= 365 ? "1 year" : `${p.limits.historyDays} days`) },
  { label: "Email alerts", value: () => true },
  { label: "Manual scans", value: (p) => p.limits.manualScans },
  { label: "Conversion element monitoring", value: (p) => p.limits.conversionElementMonitoring },
];

const pricingFaqs = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrades and downgrades take effect immediately, and limits adjust with your plan.",
  },
  {
    q: "What counts as a monitored page?",
    a: "Each specific URL MyKavo scans on a schedule. You choose exactly which pages to monitor per website — home, pricing, checkout, key landing pages.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "MyKavo keeps monitoring everything already configured. On Pro you can add another website anytime for $6/month (up to 3 add-ons); otherwise it asks you to upgrade before adding more. Nothing is silently dropped.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Monthly billing at launch; annual plans with a discount are on the roadmap.",
  },
];

export default function PricingPage() {
  return (
    <>
      <TrackOnView event="pricing_viewed" />
      <MarketingNav />
      <main className="mx-auto max-w-300 px-5 py-16 lg:px-8">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <p className="label-micro mb-3">Pricing</p>
          <h1 className="text-4xl font-semibold tracking-tight text-ink sm:text-5xl">
            Monitoring that pays for itself
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-ink-secondary">
            One missed regression costs more than a year of MyKavo. Start free with one website,
            or go Pro for $12/month — 8 websites with 20 monitored pages each, add more anytime.
          </p>
        </div>

        <PlanCards />

        {/* Comparison table */}
        <section className="mt-20">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-ink">
            Compare plans
          </h2>
          <div className="overflow-x-auto rounded-card bg-card p-6 shadow-card">
            <table className="w-full min-w-160 text-left">
              <thead>
                <tr className="border-b border-line">
                  <th className="label-micro py-3 pr-4 font-semibold">Feature</th>
                  {plans.map((p) => (
                    <th key={p.id} className="px-4 py-3 text-sm font-semibold text-ink">
                      {p.name}
                      <span className="block text-xs font-normal text-ink-faint">
                        ${p.priceMonthlyUsd}/mo
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td className="py-3.5 pr-4 text-sm font-medium text-ink">{row.label}</td>
                    {plans.map((p) => {
                      const v = row.value(p);
                      return (
                        <td key={p.id} className="px-4 py-3.5 text-sm text-ink-secondary">
                          {typeof v === "boolean" ? (
                            v ? (
                              <Check className="size-4.5 text-primary" aria-label="Included" />
                            ) : (
                              <Minus className="size-4.5 text-ink-faint" aria-label="Not included" />
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
        <section className="mx-auto mt-20 max-w-2xl">
          <h2 className="mb-6 text-center text-2xl font-semibold tracking-tight text-ink">
            Pricing questions
          </h2>
          <div className="space-y-3">
            {pricingFaqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-card bg-card px-6 py-5 shadow-card open:pb-6"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-ink-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-ink-secondary">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Ready when you are
          </h2>
          <p className="mb-6 mt-2 text-[15px] text-ink-secondary">
            Start on the free plan — upgrade whenever your websites need more.
          </p>
          <ButtonLink href="/signup" size="lg">
            Start Monitoring Free
          </ButtonLink>
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
