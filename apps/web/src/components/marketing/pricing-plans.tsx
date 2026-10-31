"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Tag } from "lucide-react";
import { PlanBadge } from "@/components/brand/plan-badge";
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
  /** "8" or "Unlimited": Pro's website count for the trial note. */
  websitesLabel: string;
}

/**
 * The pricing page's plan cards with the Monthly / Yearly switch. A running
 * campaign (Black Friday, say) shows its price on the plans its code covers,
 * on monthly billing, and the cards go back to the regular prices by
 * themselves when it ends: nothing to change or redeploy.
 */
export function PricingPlans({
  plans,
  yearlyEnabled,
  trialDays,
  trialMaxWebsites,
}: {
  plans: PricingPlan[];
  yearlyEnabled: boolean;
  trialDays: number;
  trialMaxWebsites: number;
}) {
  const [interval, setBillingInterval] = useState<BillingInterval>("month");
  const campaign = useLiveCampaign();
  const yearly = yearlyEnabled && interval === "year";

  return (
    <>
      {yearlyEnabled && (
        <div className="mb-10 flex justify-center">
          <BillingIntervalSwitch value={interval} onChange={setBillingInterval} />
        </div>
      )}
      <div className="mx-auto grid max-w-3xl gap-6 md:max-w-5xl md:grid-cols-2 xl:max-w-7xl xl:grid-cols-4">
        {plans.map((plan) => {
          const pro = plan.highlighted;
          const paid = plan.priceMonthlyUsd > 0;
          const offer =
            !yearly && campaign && paid && campaignCovers(campaign, plan.id) ? campaign : null;
          const nextPath = yearly ? "/dashboard/billing?interval=year" : "/dashboard/billing";
          const href =
            offer || yearly || plan.id === "agency" || plan.id === "starter"
              ? `/signup?next=${encodeURIComponent(nextPath)}`
              : "/signup";
          return (
            <div
              key={plan.id}
              className={`relative flex flex-col rounded-2xl border p-8 text-[#151515] xl:p-6 ${
                pro ? "border-[#151515] bg-[#FFD400] shadow-[7px_7px_0_#151515]" : "border-black/10 bg-white"
              }`}
            >
              {offer && (
                <span className="bf-stamp absolute -right-3 -top-3 inline-flex items-center gap-1 rounded-lg bg-[#0B0B0B] px-2.5 py-1 font-mono text-[11px] font-black text-[#FFCF00] shadow-[3px_3px_0_#FFCF00]">
                  <Tag className="size-3" aria-hidden />
                  {offer.name.toUpperCase()} -{offer.percent}%
                </span>
              )}
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-3 [font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] text-3xl font-medium tracking-[-0.02em]">
                  <PlanBadge plan={plan.id} size={40} />
                  {plan.name}
                </h2>
                {pro && !offer && (
                  <span className="rounded-full bg-[#151515] px-3 py-1 text-xs font-semibold text-[#FFD400]">
                    Most popular
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-6 text-[#151515]/65">{plan.headline}</p>

              <Price plan={plan} yearly={yearly} offerPercent={offer?.percent ?? null} />
              {offer ? (
                <p className="mt-1 text-[12.5px] font-semibold leading-5">
                  For your first {offer.cycles} months, then ${plan.priceMonthlyUsd}/month. Code {offer.code} applied
                  at checkout.
                </p>
              ) : yearly && paid ? (
                <p className="mt-1 text-[12.5px] font-semibold leading-5">
                  {usd(perMonth(plan.priceYearlyUsd))}/month, billed yearly. You save{" "}
                  {usd(yearlySaving(plan.priceMonthlyUsd, plan.priceYearlyUsd))}.
                </p>
              ) : null}

              <ul className="mt-7 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px] leading-6">
                    <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#151515]" aria-hidden />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={href}
                className="mt-8 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-center text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
              >
                {!paid
                  ? "Start free"
                  : offer
                    ? `Get ${plan.name} for ${formatUsd(campaignPrice(plan.priceMonthlyUsd, offer.percent))}/mo`
                    : yearly
                      ? `Get ${plan.name} yearly`
                      : plan.id === "pro"
                        ? `Try ${plan.name} free for ${trialDays} days`
                        : `Get ${plan.name}`}
              </Link>
              {plan.id === "pro" && !offer && !yearly && (
                <p className="mt-3 text-center text-[12.5px] leading-5 text-[#151515]/70">
                  The trial covers up to {trialMaxWebsites} websites ({plan.name} has {plan.websitesLabel}). No card.
                  Then Free unless you upgrade.
                </p>
              )}
              {paid && (offer || yearly || plan.id !== "pro") && (
                <p className="mt-3 text-center text-[12.5px] leading-5 text-[#151515]/70">
                  Create your account, then check out from Billing. Cancel anytime.
                </p>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}

/** The big number: monthly, yearly, or the campaign price with the regular one struck through. */
function Price({ plan, yearly, offerPercent }: { plan: PricingPlan; yearly: boolean; offerPercent: number | null }) {
  const display = "[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] font-medium tracking-[-0.02em]";
  if (offerPercent !== null) {
    return (
      <p className="mt-6 flex items-baseline gap-2">
        <span className={`${display} text-5xl`}>{formatUsd(campaignPrice(plan.priceMonthlyUsd, offerPercent))}</span>
        <span className="text-xl text-[#151515]/50 line-through decoration-2">${plan.priceMonthlyUsd}</span>
        <span className="text-sm text-[#151515]/70">/ month</span>
      </p>
    );
  }
  const amount = yearly && plan.priceMonthlyUsd > 0 ? plan.priceYearlyUsd : plan.priceMonthlyUsd;
  return (
    <p className="mt-6">
      {/* Keyed by interval: the number re-enters when the switch flips. */}
      <span key={yearly ? "y" : "m"} className={`${display} inline-block animate-[price-in_.35s_ease-out] text-5xl motion-reduce:animate-none`}>
        ${amount}
      </span>
      <span className="text-sm text-[#151515]/70"> / {yearly && plan.priceMonthlyUsd > 0 ? "year" : "month"}</span>
    </p>
  );
}
