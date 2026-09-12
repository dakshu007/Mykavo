import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Sidebar upsell, shown only on the free plan.
 *
 * Deliberately states the limits rather than adjectives: "1 website, weekly
 * scans" is the reason someone upgrades, and a card that says "unlock more"
 * teaches them nothing and reads as filler. It disappears the moment they pay
 * - an upsell shown to a paying customer is an insult.
 */
export function UpgradeCard({ websitesUsed, websiteLimit }: {
  websitesUsed: number;
  websiteLimit: number;
}) {
  const atLimit = websiteLimit !== Infinity && websitesUsed >= websiteLimit;

  return (
    <div className="rounded-xl bg-primary-soft p-3.5">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        Upgrade to Pro
      </p>
      {/* Two lines at most. This sits in a fixed-height column above sign-out,
          so every extra line of copy is height taken from the nav. */}
      <p className="mt-1 text-[12px] leading-snug text-ink-secondary">
        {atLimit ? (
          <>
            All {websiteLimit} Free website{websiteLimit === 1 ? "" : "s"} in use. Pro
            monitors 25.
          </>
        ) : (
          <>25 websites, daily scans, a year of history.</>
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
