import Link from "next/link";
import { Check, CreditCard } from "lucide-react";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { getPlan } from "@/config/plans";

export default function BillingPage() {
  const plan = getPlan("free");

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title="Current plan"
          action={
            <IconChip className="bg-surface">
              <CreditCard className="size-4.5 text-ink-secondary" aria-hidden />
            </IconChip>
          }
        />
        <div className="flex items-baseline gap-3">
          <p className="text-3xl font-semibold tracking-tight text-ink">{plan.name}</p>
          <p className="text-sm text-ink-secondary">${plan.priceMonthlyUsd}/month</p>
        </div>
        <ul className="mt-5 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-6 text-sm text-ink-secondary">
          Paid plans with Stripe checkout arrive in a later release. See{" "}
          <Link href="/pricing" className="font-medium text-primary hover:underline">
            pricing
          </Link>{" "}
          for what&apos;s coming.
        </p>
      </Card>
    </div>
  );
}
