import Link from "next/link";
import { Sparkles } from "lucide-react";
import { getPlan, PAID_PLAN_ID, formatLimit } from "@/config/plans";

/**
 * Sidebar upsell, shown only on the free plan.
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
}: {
  websitesUsed: number;
  websiteLimit: number;
}) {
  const pro = getPlan(PAID_PLAN_ID);
  const atLimit = websiteLimit !== Infinity && websitesUsed >= websiteLimit;

  return (
    <div className="rounded-xl bg-primary-soft p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        Upgrade to {pro.name}
      </p>
      {/* Two lines at most. This sits in a fixed-height column above sign-out,
          so every extra line of copy is height taken from the nav. */}
      <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
        {atLimit ? (
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
        className="mt-2.5 inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.985] active:shadow-none motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        See plans
      </Link>
    </div>
  );
}
