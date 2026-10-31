"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { PlanBadge, planMetal } from "@/components/brand/plan-badge";
import { campaignCovers, campaignPrice, formatUsd } from "@/config/campaign";
import { useLiveCampaign } from "@/lib/campaign-client";
import { BillingIntervalSwitch, perMonth, usd, yearlySaving, type BillingInterval } from "./billing-interval";

/** A plan as the pricing cards need it: plain data, so a server page can pass it. */
export interface PricingPlan {
  id: "free" | "starter" | "pro" | "agency";
  name: string;
  headline: string;
  priceMonthlyUsd: number;
  priceYearlyUsd: number;
  highlighted: boolean;
  features: string[];
  /** "8" or "Unlimited": the plan's website count. */
  websitesLabel: string;
  /** "15": monitored pages per website. */
  pagesLabel: string;
  /** "Daily" or "Weekly". */
  scansLabel: string;
}

const display = "[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] tracking-[-0.03em]";

/**
 * The pricing page's plans, all four in one row: emblem, price, the same
 * three facts on every card (websites, pages each, scans), the button, then
 * the features, with the rest one click away. Pro is the dark card in the
 * middle of the row. A running campaign (Black Friday, say) shows its price
 * on the plans its code covers, on monthly billing, and the cards go back to
 * the regular prices by themselves when it ends.
 */
export function PricingPlans({
  plans,
  yearlyEnabled,
  trialDays,
  trialMaxWebsites,
  tone = "light",
}: {
  plans: PricingPlan[];
  yearlyEnabled: boolean;
  trialDays: number;
  trialMaxWebsites: number;
  /** "dark" for dark pages (Black Friday): every card turns dark, Pro glows gold. */
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const campaign = useLiveCampaign();
  const yearly = yearlyEnabled && interval === "year";

  return (
    <>
      {yearlyEnabled && (
        <div className="mb-10 flex justify-center">
          <BillingIntervalSwitch value={interval} onChange={setBillingInterval} tone={tone} />
        </div>
      )}
      <div className="mx-auto grid max-w-md gap-5 pt-4 md:max-w-3xl md:grid-cols-2 xl:max-w-7xl xl:grid-cols-4">
        {plans.map((plan) => {
          const pro = plan.highlighted;
          // Cards with light text: Pro always, and every card on a dark page.
          const inv = pro || dark;
          const paid = plan.priceMonthlyUsd > 0;
          const offer = !yearly && campaign && paid && campaignCovers(campaign, plan.id) ? campaign : null;
          const nextPath = yearly ? "/dashboard/billing?interval=year" : "/dashboard/billing";
          const href =
            offer || yearly || plan.id === "agency" || plan.id === "starter"
              ? `/signup?next=${encodeURIComponent(nextPath)}`
              : "/signup";
          const amount = offer
            ? formatUsd(campaignPrice(plan.priceMonthlyUsd, offer.percent))
            : `$${yearly && paid ? plan.priceYearlyUsd : plan.priceMonthlyUsd}`;
          const period = yearly && paid ? "year" : "month";
          const note = offer
            ? `First ${offer.cycles} months, then $${plan.priceMonthlyUsd}/month.`
            : yearly && paid
              ? `${usd(perMonth(plan.priceYearlyUsd))}/month · save ${usd(yearlySaving(plan.priceMonthlyUsd, plan.priceYearlyUsd))}`
              : !paid
                ? "Free forever. No card."
                : "Billed monthly. Cancel anytime.";
          const features = plan.features.filter(
            (f) => !/^[\d,]+ websites?$|monitored pages per website|^(daily|weekly) scans$/i.test(f),
          );
          const [top, rest] = [features.slice(0, 5), features.slice(5)];
          const cta = !paid
            ? "Start free"
            : offer
              ? `Get ${plan.name} for ${amount}/mo`
              : yearly
                ? `Get ${plan.name} yearly`
                : plan.id === "pro"
                  ? `Try ${plan.name} free for ${trialDays} days`
                  : `Get ${plan.name}`;

          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-[28px] p-7 transition-transform duration-300 motion-reduce:transition-none ${
                pro && dark
                  ? "bg-[radial-gradient(120%_90%_at_50%_0%,#2a2205,#0B0B0B_60%)] text-white shadow-[0_0_0_1px_#FFCF00,0_30px_90px_-20px_rgba(255,207,0,0.35)] xl:-translate-y-3"
                  : pro
                    ? "bg-[#111111] text-white shadow-[0_30px_80px_-20px_rgba(17,17,17,0.55)] ring-1 ring-black xl:-translate-y-3"
                    : dark
                      ? "bg-white/[0.035] text-white ring-1 ring-white/10 hover:-translate-y-1"
                      : "bg-white text-[#151515] ring-1 ring-black/[0.07] hover:-translate-y-1"
              }`}
            >
              {(pro || offer) && (
                <span
                  className={`absolute -top-3 left-7 rounded-full px-3 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] ${
                    offer ? "bf-stamp bg-[#FFCF00] text-[#0B0B0B]" : "bg-[#FFD400] text-[#151515]"
                  }`}
                >
                  {offer ? `${offer.name} -${offer.percent}%` : "Most popular"}
                </span>
              )}

              {/* Emblem, name and metal. */}
              <div className="flex items-center gap-3">
                <PlanBadge plan={plan.id} size={44} />
                <div>
                  <h2 className={`${display} text-[22px] font-semibold leading-tight`}>{plan.name}</h2>
                  <p className={`font-mono text-[10.5px] uppercase tracking-[0.18em] ${inv ? "text-white/45" : "text-[#151515]/40"}`}>
                    {planMetal(plan.id)}
                  </p>
                </div>
              </div>

              {/* Price. */}
              <div className="mt-7 flex items-end gap-2">
                <span
                  key={`${amount}-${period}`}
                  className={`${display} inline-block animate-[price-in_.35s_ease-out] text-[52px] font-semibold leading-none motion-reduce:animate-none`}
                >
                  {amount}
                </span>
                {offer && (
                  <span className={`pb-1.5 text-lg line-through decoration-2 ${inv ? "text-white/40" : "text-[#151515]/35"}`}>
                    ${plan.priceMonthlyUsd}
                  </span>
                )}
                <span className={`pb-1.5 text-sm ${inv ? "text-white/55" : "text-[#151515]/50"}`}>/ {period}</span>
              </div>
              <p className={`mt-2 min-h-5 text-[13px] ${offer ? "font-semibold text-[#FFCF00]" : inv ? "text-white/60" : "text-[#151515]/55"}`}>
                {note}
              </p>
              <p className={`mt-4 min-h-12 text-[14px] leading-6 ${inv ? "text-white/70" : "text-[#151515]/65"}`}>{plan.headline}</p>

              {/* Three facts, the same on every card. */}
              <dl
                className={`mt-5 grid grid-cols-3 rounded-2xl text-center ${
                  inv ? "bg-white/[0.06]" : "bg-[#F6F5EE]"
                }`}
              >
                {[
                  [plan.websitesLabel, plan.websitesLabel === "1" ? "website" : "websites"],
                  [plan.pagesLabel, "pages each"],
                  [plan.scansLabel, "scans"],
                ].map(([v, l]) => (
                  <div key={l} className="px-1 py-3">
                    <dt className="sr-only">{l}</dt>
                    <dd className="text-[15px] font-semibold">{v}</dd>
                    <dd className={`text-[11px] ${inv ? "text-white/45" : "text-[#151515]/45"}`}>{l}</dd>
                  </div>
                ))}
              </dl>

              <Link
                href={href}
                className={`group mt-6 inline-flex h-12 items-center justify-center gap-2 rounded-full text-[14px] font-semibold transition-colors ${
                  pro
                    ? "bg-[#FFD400] text-[#111111] hover:bg-[#ffdf33]"
                    : dark
                      ? "bg-white text-[#0B0B0B] hover:bg-white/90"
                      : "bg-[#151515] text-white hover:bg-[#2a2a2a]"
                }`}
              >
                {cta}
                <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
              <p className={`mt-2.5 min-h-10 text-center text-[11.5px] leading-5 ${inv ? "text-white/45" : "text-[#151515]/45"}`}>
                {plan.id === "pro" && !offer && !yearly
                  ? `No card. The trial covers ${trialMaxWebsites} websites.`
                  : paid
                    ? "Create your account, then check out from Billing."
                    : "One website, checked weekly."}
              </p>

              {/* Features. */}
              <div className={`mt-4 border-t pt-5 ${inv ? "border-white/10" : "border-black/[0.07]"}`}>
                <ul className="space-y-2.5">
                  {top.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-5">
                      <Check className={`mt-0.5 size-4 shrink-0 ${inv ? "text-[#FFD400]" : "text-[#151515]/70"}`} aria-hidden />
                      <span className={inv ? "text-white/80" : "text-[#151515]/75"}>{f}</span>
                    </li>
                  ))}
                </ul>
                {rest.length > 0 && (
                  <details className="group/more mt-3">
                    <summary
                      className={`cursor-pointer list-none text-[13px] font-semibold underline decoration-[#FFD400] decoration-2 underline-offset-4 ${
                        inv ? "text-white" : "text-[#151515]"
                      }`}
                    >
                      <span className="group-open/more:hidden">All {features.length} features</span>
                      <span className="hidden group-open/more:inline">Fewer features</span>
                    </summary>
                    <ul className="mt-3 space-y-2.5">
                      {rest.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-[13.5px] leading-5">
                          <Check className={`mt-0.5 size-4 shrink-0 ${inv ? "text-[#FFD400]" : "text-[#151515]/70"}`} aria-hidden />
                          <span className={inv ? "text-white/80" : "text-[#151515]/75"}>{f}</span>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
