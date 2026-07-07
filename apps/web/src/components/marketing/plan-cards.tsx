import Link from "next/link";
import { Check } from "lucide-react";
import { plans } from "@/config/plans";
import { cn } from "@/lib/utils";

export function PlanCards({ compact = false }: { compact?: boolean }) {
  return (
    <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((plan) => (
        <div
          key={plan.id}
          className={cn(
            "relative flex flex-col rounded-card bg-card p-6 shadow-card",
            plan.highlighted && "ring-2 ring-primary",
          )}
        >
          {plan.highlighted && (
            <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-[11px] font-semibold text-white">
              Most popular
            </span>
          )}
          <h3 className="text-[15px] font-semibold text-ink">{plan.name}</h3>
          <p className="mt-1 text-[13px] text-ink-secondary">{plan.headline}</p>
          <p className="mt-4">
            <span className="text-4xl font-semibold tracking-tight text-ink">
              ${plan.priceMonthlyUsd}
            </span>
            <span className="text-sm text-ink-faint">/month</span>
          </p>
          <ul className={cn("mt-5 space-y-2.5", compact && "mt-4 space-y-2")}>
            {plan.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/#waitlist"
            className={cn(
              "mt-6 inline-flex h-11 items-center justify-center rounded-full text-sm font-medium transition-colors",
              plan.highlighted
                ? "bg-primary text-white hover:bg-primary-hover"
                : "border border-line bg-card text-ink hover:border-ink-faint",
            )}
          >
            {plan.priceMonthlyUsd === 0 ? "Start free" : `Choose ${plan.name}`}
          </Link>
        </div>
      ))}
    </div>
  );
}
