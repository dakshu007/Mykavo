import Link from "next/link";
import { Gauge, Sparkles } from "lucide-react";
import { getPlan, PAID_PLAN_ID, formatLimit } from "@/config/plans";
import { campaignCovers, campaignPrice, formatUsd, type Campaign } from "@/config/campaign";
import type { LimitHit } from "@/lib/dashboard-cards";

/**
 * Sidebar upsell, shown on the Free plan and during a Pro trial that is
 * already running (new trials are no longer offered).
 *
 * Every number is READ FROM THE PLAN CONFIG (spec §37: never hardcode plan
 * limits). The first version of this card hardcoded "{formatLimit(pro.limits.websites)} websites, a year of
 * history" from the spec's aspirational pricing table - Pro actually ships 8
 * websites at $20. An upsell that misstates what you get is worse than no
 * upsell: the customer finds out after paying.
 */
export function UpgradeCard({
  websitesUsed,
  websiteLimit,
  trialDaysLeft = null,
  campaign = null,
  limit = null,
}: {
  websitesUsed: number;
  websiteLimit: number;
  /**
   * Set only while a Pro trial that started before trials closed (13 Nov
   * 2026) is still running: the card counts down instead of upselling.
   */
  trialDaysLeft?: number | null;
  /** A running offer (config/campaign.ts): the price line shows it. */
  campaign?: Campaign | null;
  /** A plan limit already reached: the card says so and offers the plan that lifts it. */
  limit?: LimitHit | null;
}) {
  if (limit) return <LimitCard limit={limit} campaign={campaign} />;
  const pro = getPlan(PAID_PLAN_ID);
  if (campaign && !campaignCovers(campaign, "pro")) campaign = null;
  const offer = campaign
    ? `${campaign.name}: ${formatUsd(campaignPrice(pro.priceMonthlyUsd, campaign.percent))}/mo for ${campaign.cycles} months, then $${pro.priceMonthlyUsd}.`
    : null;
  if (trialDaysLeft !== null) {
    return (
      <div className="rounded-xl bg-primary-soft p-3.5">
        <p className="flex items-center gap-1.5 pr-6 text-[13px] font-semibold text-ink">
          <Sparkles aria-hidden className="size-3.5 text-accent" />
          {pro.name} trial: {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
        </p>
        {/* Same two-line budget as the Free card below. websiteLimit is the
            trial's cap (TRIAL_MAX_WEBSITES), so say it plainly next to Pro's. */}
        <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
          {websitesUsed >= websiteLimit
            ? `All ${formatLimit(websiteLimit)} trial website${websiteLimit === 1 ? "" : "s"} in use.`
            : `The trial covers ${formatLimit(websiteLimit)} website${websiteLimit === 1 ? "" : "s"}.`}{" "}
          {offer ?? `${pro.name} has ${formatLimit(pro.limits.websites)} for $${pro.priceMonthlyUsd}/mo.`}
        </p>
        <Link
          href="/dashboard/billing?from=sidebar:trial"
          className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.985] active:shadow-none disabled:opacity-70 motion-reduce:transition-none motion-reduce:active:scale-100"
        >
          Keep {pro.name}
        </Link>
      </div>
    );
  }
  const atLimit = websiteLimit !== Infinity && websitesUsed >= websiteLimit;

  return (
    <div className="rounded-xl bg-primary-soft p-3.5">
      <p className="flex items-center gap-1.5 pr-6 text-[13px] font-semibold text-ink">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        {campaign ? `${campaign.percent}% off ${pro.name}` : `Upgrade to ${pro.name}`}
      </p>
      {/* Two lines at most. This sits in a fixed-height column above sign-out,
          so every extra line of copy is height taken from the nav. */}
      <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
        {offer ? (
          offer
        ) : atLimit ? (
          <>
            All {formatLimit(websiteLimit)} Free website
            {websiteLimit === 1 ? "" : "s"} in use. {pro.name} monitors{" "}
            {formatLimit(pro.limits.websites)}.
          </>
        ) : (
          <>
            {formatLimit(pro.limits.websites)} websites,{" "}
            {pro.limits.scanFrequency === "DAILY" ? "daily" : "weekly"} scans, $
            {pro.priceMonthlyUsd}/mo.
          </>
        )}
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.985] active:shadow-none disabled:opacity-70 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        See plans
      </Link>
    </div>
  );
}

/** A limit is used up: say which, when it refills, and what the next plan gives. */
function LimitCard({ limit, campaign }: { limit: LimitHit; campaign: Campaign | null }) {
  const next = limit.next;
  const deal =
    campaign && campaignCovers(campaign, next.id)
      ? ` Now ${formatUsd(campaignPrice(next.priceMonthlyUsd, campaign.percent))}/mo for ${campaign.cycles} months.`
      : ` $${next.priceMonthlyUsd}/mo.`;
  return (
    <div className="rounded-xl bg-primary-soft p-3.5" role="status">
      <p className="flex items-center gap-1.5 pr-6 text-[13px] font-semibold text-ink">
        <Gauge aria-hidden className="size-3.5 shrink-0 text-accent" />
        {limit.title}
      </p>
      <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
        {limit.body}
        {deal}
      </p>
      <Link
        href={`/dashboard/billing?from=limit:${limit.kind}`}
        className="mt-2.5 inline-flex h-8 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.985] active:shadow-none motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        Continue with {next.name}
      </Link>
    </div>
  );
}
