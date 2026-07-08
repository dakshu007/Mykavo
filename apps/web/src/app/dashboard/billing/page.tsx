import Link from "next/link";
import { ArrowRight, Check, CheckCircle2, CreditCard, Sparkles } from "lucide-react";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { getWorkspaceSubscription } from "@/lib/billing/subscription";
import { billingEnabled } from "@/lib/billing/config";
import { dodoApiConfigured } from "@/lib/billing/dodo-api";
import { getPlan } from "@/config/plans";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const [plan, subscription] = await Promise.all([
    getWorkspacePlan(workspace.id),
    getWorkspaceSubscription(workspace.id),
  ]);
  const isPro = plan.id === "pro";
  const pro = getPlan("pro");
  const justCheckedOut = sp.checkout === "success";

  return (
    <div className="max-w-2xl space-y-6">
      {justCheckedOut && !isPro && (
        <div className="flex items-start gap-3 rounded-card bg-primary-soft px-5 py-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-ink">
            Thanks for your payment! Your upgrade is being confirmed — it activates the moment
            Dodo confirms the charge (usually seconds). Refresh this page shortly.
          </p>
        </div>
      )}

      <Card>
        <CardHeader
          title="Current plan"
          action={
            <IconChip className="bg-surface">
              <CreditCard className="size-4.5 text-ink-secondary" aria-hidden />
            </IconChip>
          }
        />
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-3xl font-semibold tracking-tight text-ink">{plan.name}</p>
          <p className="text-sm text-ink-secondary">${plan.priceMonthlyUsd}/month</p>
          {isPro && (
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-green-700">
              Active
            </span>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-amber-700">
              Cancels at period end
            </span>
          )}
        </div>

        <ul className="mt-5 space-y-2.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
              <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
              {f}
            </li>
          ))}
        </ul>

        {isPro ? (
          dodoApiConfigured() ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/api/billing/portal"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-medium text-white transition-colors hover:bg-black"
              >
                Manage billing
              </a>
              {!subscription?.cancelAtPeriodEnd && (
                <CancelSubscriptionButton apiCancel />
              )}
            </div>
          ) : (
            <p className="mt-6 text-[13px] text-ink-faint">
              Manage or cancel your subscription from your Dodo Payments account.
            </p>
          )
        ) : (
          <p className="mt-6 text-sm text-ink-secondary">
            You&apos;re on the Free plan — 1 website and 5 monitored pages.
          </p>
        )}
      </Card>

      {/* Upgrade CTA (only when on Free) */}
      {!isPro && (
        <Card className="ring-2 ring-primary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft">
                <Sparkles className="size-5 text-primary" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                Upgrade to Pro — ${pro.priceMonthlyUsd}/month
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                Unlimited websites and monitored pages, daily scans, and every advanced feature.
              </p>
            </div>
          </div>

          <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
            {pro.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                <Check className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                {f}
              </li>
            ))}
          </ul>

          {billingEnabled ? (
            <a
              href="/api/billing/checkout"
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
            >
              Upgrade to Pro <ArrowRight className="size-4" aria-hidden />
            </a>
          ) : (
            <p className="mt-6 text-sm text-ink-faint">
              Checkout isn&apos;t configured on this deployment yet.
            </p>
          )}
          <p className="mt-3 text-[13px] text-ink-faint">
            Secure checkout by Dodo Payments. Cancel anytime.
          </p>
        </Card>
      )}

      <p className="text-center text-[13px] text-ink-faint">
        Compare plans on the{" "}
        <Link href="/pricing" className="font-medium text-primary hover:underline">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}
