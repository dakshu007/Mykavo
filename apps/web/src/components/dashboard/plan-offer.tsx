import { ArrowRight, Check } from "lucide-react";
import { PlanBadge, type BadgePlan } from "@/components/brand/plan-badge";
import { campaignCovers, campaignPrice, formatUsd, type Campaign } from "@/config/campaign";
import { formatLimit, type Plan } from "@/config/plans";
import type { BillingInterval } from "@/lib/billing/config";

/** The emblem for a plan id (Agency Unlimited shares Agency's gold). */
export function badgePlan(id: string): BadgePlan {
  return id === "starter" || id === "pro" || id === "agency" ? id : "free";
}

/** One plan offered to a Free or trial workspace, with its own checkout. */
export function PlanOffer({
  plan,
  checkoutHref,
  available,
  highlighted,
  note,
  campaign,
  interval = "month",
}: {
  plan: Plan;
  checkoutHref: string;
  available: boolean;
  highlighted: boolean;
  note?: string | null;
  campaign?: Campaign | null;
  interval?: BillingInterval;
}) {
  // A campaign's code only discounts the plans it was created for in Dodo,
  // and only monthly billing (its cycle limit counts months).
  if (campaign && (interval === "year" || !campaignCovers(campaign, plan.id))) campaign = null;
  const yearly = interval === "year";
  const href = yearly ? `${checkoutHref}${checkoutHref.includes("?") ? "&" : "?"}interval=year` : checkoutHref;
  const offerPrice = campaign ? formatUsd(campaignPrice(plan.priceMonthlyUsd, campaign.percent)) : null;
  const price = offerPrice ?? (yearly ? `$${plan.priceYearlyUsd}` : `$${plan.priceMonthlyUsd}`);
  // The same three facts on every card, so plans compare at a glance.
  const facts: [string, string][] = [
    [formatLimit(plan.limits.websites), plan.limits.websites === 1 ? "website" : "websites"],
    [formatLimit(plan.limits.pagesPerWebsite), "pages each"],
    [plan.limits.maxMembers === 1 ? "Just you" : `${formatLimit(plan.limits.maxMembers)}`, plan.limits.maxMembers === 1 ? "one seat" : "team seats"],
  ];
  // The facts box already says how many websites and pages; the list starts after.
  const features = plan.features.filter((f) => !/^[\d,]+ websites?$|monitored pages per website/i.test(f));
  const [top, rest] = [features.slice(0, 5), features.slice(5)];
  return (
    <div
      className={`relative flex flex-col rounded-card border bg-card p-5 ${
        highlighted ? "border-accent shadow-[0_8px_30px_rgba(0,0,0,0.08)] ring-1 ring-accent md:-translate-y-2" : "border-line"
      }`}
    >
      {highlighted && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide text-primary-contrast">
          {campaign ? `${campaign.name} -${campaign.percent}%` : "Most popular"}
        </span>
      )}
      <div className="flex items-center gap-3">
        <PlanBadge plan={badgePlan(plan.id)} size={40} title={`${plan.name} plan`} />
        <h2 className="text-lg font-semibold tracking-tight text-ink">{plan.name}</h2>
      </div>

      <p className="mt-4 flex items-baseline gap-1.5">
        <span className="text-3xl font-semibold tracking-tight text-ink">{price}</span>
        {offerPrice && <span className="text-sm text-ink-faint line-through">${plan.priceMonthlyUsd}</span>}
        <span className="text-sm text-ink-secondary">/{yearly ? "year" : "month"}</span>
      </p>
      <p className="mt-1 min-h-10 text-[12.5px] leading-5 text-ink-secondary">
        {campaign
          ? `First ${campaign.cycles} months, then $${plan.priceMonthlyUsd}/month. Applied at checkout.`
          : yearly
            ? `$${(Math.round((plan.priceYearlyUsd / 12) * 100) / 100).toFixed(2)}/month. You save $${plan.priceMonthlyUsd * 12 - plan.priceYearlyUsd}.`
            : plan.headline}
      </p>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line rounded-field border border-line text-center">
        {facts.map(([value, label]) => (
          <div key={label} className="px-1 py-2.5">
            <dt className="sr-only">{label}</dt>
            <dd className="text-[15px] font-semibold text-ink">{value}</dd>
            <dd className="text-[11px] text-ink-faint">{label}</dd>
          </div>
        ))}
      </dl>

      <ul className="mt-4 space-y-2">
        {top.map((f) => (
          <li key={f} className="flex items-start gap-2 text-[13px] leading-5 text-ink-secondary">
            <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      {rest.length > 0 && (
        <details className="group mt-2">
          <summary className="cursor-pointer list-none text-[12.5px] font-medium text-accent hover:underline">
            <span className="group-open:hidden">+ {rest.length} more</span>
            <span className="hidden group-open:inline">Show less</span>
          </summary>
          <ul className="mt-2 space-y-2">
            {rest.map((f) => (
              <li key={f} className="flex items-start gap-2 text-[13px] leading-5 text-ink-secondary">
                <Check className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
        </details>
      )}
      {note && <p className="mt-3 text-[12px] leading-5 text-ink-faint">{note}</p>}

      <div className="mt-auto pt-5">
        {available ? (
          <a
            href={href}
            className={`flex h-11 w-full items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${
              highlighted
                ? "bg-primary text-primary-contrast hover:bg-primary-hover"
                : "border border-line text-ink hover:bg-surface"
            }`}
          >
            Get {plan.name}
            {yearly ? " yearly" : ""} <ArrowRight className="size-4" aria-hidden />
          </a>
        ) : (
          <p className="text-[12.5px] text-ink-faint">
            {plan.name} checkout is being set up. Email{" "}
            <a href="mailto:support@mykavo.app" className="font-medium text-accent hover:underline">
              support@mykavo.app
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );
}

