import { formatLimit, plans } from "@/config/plans";
import type { PricingPlan } from "./pricing-plans";

/** Every plan as the pricing cards show it (pricing page and Black Friday page). */
export function pricingPlanData(): PricingPlan[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    headline: plan.headline,
    priceMonthlyUsd: plan.priceMonthlyUsd,
    priceYearlyUsd: plan.priceYearlyUsd,
    highlighted: Boolean(plan.highlighted),
    features: plan.features,
    websitesLabel: formatLimit(plan.limits.websites),
    pagesLabel: formatLimit(plan.limits.pagesPerWebsite),
    scansLabel: plan.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly",
  }));
}
