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
    <div className="rounded-xl bg-primary-soft p-4">
      <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
        <Sparkles aria-hidden className="size-3.5 text-accent" />
        Upgrade to Pro
      </p>
      <p className="mt-1.5 text-[12px] leading-relaxed text-ink-secondary">
        {atLimit ? (
          <>
            You&apos;re using all {websiteLimit} website{websiteLimit === 1 ? "" : "s"} on
            Free. Pro monitors 25, scans daily and keeps a year of history.
          </>
        ) : (
          <>Daily scans, 25 websites, conversion monitoring and a year of history.</>
        )}
      </p>
      <Link
        href="/dashboard/billing"
        className="mt-3 inline-flex h-8 w-full items-center justify-center rounded-full bg-primary px-3 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover active:scale-[0.985] active:shadow-none motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        See plans
      </Link>
    </div>
  );
}
