import type { Metadata } from "next";
import { Check, Minus } from "lucide-react";
import { MarketingNav } from "@/components/marketing/nav";
import { MarketingFooter } from "@/components/marketing/footer";
import { PlanCards } from "@/components/marketing/plan-cards";
import { WaitlistForm } from "@/components/waitlist-form";
import { TrackOnView } from "@/components/track-on-view";
import { plans } from "@/config/plans";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Simple, transparent pricing for website change monitoring. Free plan for 1 website; agency plans up to 100 websites and 2,500 monitored pages.",
  alternates: { canonical: "/pricing" },
};

const comparisonRows: Array<{
  label: string;
  value: (p: (typeof plans)[number]) => string | boolean;
}> = [
  { label: "Websites", value: (p) => String(p.limits.websites) },
  { label: "Monitored pages", value: (p) => p.limits.monitoredPages.toLocaleString("en-US") },
  { label: "Scan frequency", value: (p) => (p.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly") },
  { label: "History retention", value: (p) => (p.limits.historyDays >= 365 ? "1 year" : `${p.limits.historyDays} days`) },
  { label: "Email alerts", value: () => true },
  { label: "Manual scans", value: (p) => p.limits.manualScans },
  { label: "Advanced monitoring settings", value: (p) => p.limits.advancedMonitoringSettings },
  { label: "Conversion element monitoring", value: (p) => p.limits.conversionElementMonitoring },
  { label: "Priority scanning", value: (p) => p.limits.priorityScanning },
  { label: "Multi-user workspace", value: (p) => p.limits.multiUserWorkspace },
  { label: "Client-ready reports", value: (p) => p.limits.clientReports },
];

const pricingFaqs = [
  {
    q: "Can I change plans later?",
    a: "Yes. Upgrades and downgrades take effect immediately, and limits adjust with your plan.",
  },
  {
    q: "What counts as a monitored page?",
    a: "Each specific URL Fluxen scans on a schedule. You choose exactly which pages to monitor per website — home, pricing, checkout, key landing pages.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "Fluxen keeps monitoring everything already configured and asks you to upgrade before adding more websites or pages. Nothing is silently dropped.",
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
            One missed regression costs more than a year of Fluxen. Start free, upgrade when your
            websites do.
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
        <section className="mx-auto mt-20 max-w-xl text-center" id="waitlist">
          <h2 className="text-2xl font-semibold tracking-tight text-ink">
            Ready when you are
          </h2>
          <p className="mb-6 mt-2 text-[15px] text-ink-secondary">
            Join the waitlist — early access seats open in small batches.
          </p>
          <WaitlistForm source="pricing" align="center" />
        </section>
      </main>
      <MarketingFooter />
    </>
  );
}
