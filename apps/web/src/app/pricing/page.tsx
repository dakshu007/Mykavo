import type { Metadata } from "next";
import Link from "next/link";
import { Check, CheckCircle2, Minus } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { TrackOnView } from "@/components/track-on-view";
import { ValueQuoteBanner } from "@/components/value-quote";
import { plans, formatLimit } from "@/config/plans";

export const metadata: Metadata = {
  title: "Pricing - Website Monitoring Plans from $0",
  description:
    "Simple, transparent pricing for website change monitoring. Start free with one website, or go Pro at $20/month for 8 websites with 15 monitored pages each, daily scans and alerts.",
  keywords: [
    "website monitoring pricing",
    "site monitoring tools pricing",
    "website change detection pricing",
    "affordable website monitoring",
  ],
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: "MyKavo Pricing - Website Monitoring from $0",
    description:
      "Free plan for one website. Pro at $20/month for 8 websites with 15 monitored pages each, daily scans and severity-ranked alerts.",
    url: "/pricing",
    type: "website",
  },
};

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
    a: "Each specific URL MyKavo scans on a schedule. You choose exactly which pages to monitor per website - home, pricing, checkout, key landing pages.",
  },
  {
    q: "What happens if I hit my plan limits?",
    a: "MyKavo keeps monitoring everything already configured. It simply asks you to upgrade before adding more websites or pages - nothing is silently dropped.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Monthly billing at launch; annual plans with a discount are on the roadmap.",
  },
];

export default function PricingPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <TrackOnView event="pricing_viewed" />
      <LandingNav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
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
            One missed regression costs more than a year of MyKavo. Start free with one website,
            or go Pro for $20/month - 8 websites with 15 monitored pages each.
          </p>
        </div>

        {/* Region-aware value quote */}
        <div className="mb-14">
          <ValueQuoteBanner />
        </div>

        {/* Plan cards */}
        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {plans.map((plan) => {
            const pro = plan.highlighted;
            return (
              <div
                key={plan.id}
                className={`flex flex-col rounded-2xl border p-8 text-[#151515] ${
                  pro
                    ? "border-[#151515] bg-[#FFD400] shadow-[7px_7px_0_#151515]"
                    : "border-black/10 bg-white"
                }`}
              >
                <div className="flex items-center justify-between">
                  <h2 className={`${fontDisplay} text-3xl`}>{plan.name}</h2>
                  {pro && (
                    <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]">
                      Most popular
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm leading-6 text-[#151515]/65">{plan.headline}</p>
                <p className="mt-6">
                  <span className={`${fontDisplay} text-5xl`}>${plan.priceMonthlyUsd}</span>
                  <span className="text-sm text-[#151515]/55"> / month</span>
                </p>
                <ul className="mt-7 flex-1 space-y-3">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6">
                      <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#151515]" aria-hidden />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="mt-8 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-center text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
                >
                  {pro ? "Start with Pro" : "Start free"}
                </Link>
              </div>
            );
          })}
        </div>

        {/* Comparison table */}
        <section className="mt-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// compare //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}>
            Every plan, side by side.
          </h2>
          <div className="mx-auto max-w-3xl overflow-x-auto rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
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
              Start on the free plan - upgrade whenever your websites need more.
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
