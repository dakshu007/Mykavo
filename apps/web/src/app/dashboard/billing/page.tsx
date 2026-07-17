import Link from "next/link";
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckCircle2,
  CreditCard,
  Globe,
  Sparkles,
} from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import {
  getWorkspaceSubscription,
  getEffectiveWebsiteLimit,
} from "@/lib/billing/subscription";
import { billingEnabled } from "@/lib/billing/config";
import { dodoApiConfigured } from "@/lib/billing/dodo-api";
import { getPlan, formatLimit } from "@/config/plans";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { ValueQuoteCard } from "@/components/value-quote";
import { Price, BilledInUsdNote } from "@/components/region";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const [plan, subscription, websiteLimit, websiteCount] = await Promise.all([
    getWorkspacePlan(workspace.id),
    getWorkspaceSubscription(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
  ]);
  const isPro = plan.id === "pro";
  const pro = getPlan("pro");
  const justCheckedOut = sp.checkout === "success";
  // Server component: one clock read per request (also keeps the React
  // Compiler purity lint happy - Date.now() inline in render is flagged).
  const requestedAt = new Date();
  const periodEnd = subscription?.currentPeriodEnd ?? null;
  const renewalLabel = periodEnd
    ? periodEnd.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;
  const daysToRenewal = periodEnd
    ? Math.max(0, Math.ceil((periodEnd.getTime() - requestedAt.getTime()) / 86_400_000))
    : null;

  return (
    <div className="max-w-2xl space-y-6">
      {justCheckedOut && (
        <div className="flex items-start gap-3 rounded-card bg-primary-soft px-5 py-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-ink">
            Thanks for your payment! It&apos;s being confirmed - the change activates the moment
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
          <p className="text-sm text-ink-secondary">
            <Price usd={plan.priceMonthlyUsd} />/month
          </p>
          {isPro && (
            <span className="rounded-full bg-success-soft px-2.5 py-1 text-[11px] font-semibold text-success-strong">
              Active
            </span>
          )}
          {subscription?.cancelAtPeriodEnd && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-[11px] font-semibold text-warning-strong">
              Cancels at period end
            </span>
          )}
        </div>

        {isPro && renewalLabel && (
          <div className="mt-4 flex items-start gap-2.5 rounded-field bg-surface px-4 py-3">
            <CalendarClock className="mt-0.5 size-4.5 shrink-0 text-ink-secondary" aria-hidden />
            <p className="text-sm text-ink">
              {subscription?.cancelAtPeriodEnd ? (
                <>
                  Pro access ends on <span className="font-semibold">{renewalLabel}</span>
                  {daysToRenewal !== null && (
                    <span className="text-ink-secondary"> ({daysToRenewal} day{daysToRenewal === 1 ? "" : "s"} left)</span>
                  )}
                  . You keep every feature until then.
                </>
              ) : (
                <>
                  Next renewal on <span className="font-semibold">{renewalLabel}</span>
                  {daysToRenewal !== null && (
                    <span className="text-ink-secondary"> (in {daysToRenewal} day{daysToRenewal === 1 ? "" : "s"})</span>
                  )}{" "}
                  - <Price usd={plan.priceMonthlyUsd} /> billed monthly via Dodo Payments (charged
                  as ${plan.priceMonthlyUsd} USD).
                </>
              )}
            </p>
          </div>
        )}

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
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-medium text-ink-inverse transition-colors hover:bg-ink-hover"
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
            You&apos;re on the Free plan - 1 website and 5 monitored pages.
          </p>
        )}
      </Card>

      {/* Website capacity (Pro only) */}
      {isPro && (
        <Card>
          <CardHeader
            title="Website capacity"
            action={
              <IconChip className="bg-surface">
                <Globe className="size-4.5 text-ink-secondary" aria-hidden />
              </IconChip>
            }
          />
          <div className="flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-semibold tracking-tight text-ink">
              {websiteCount}
              <span className="text-ink-faint"> / {formatLimit(websiteLimit)}</span>
            </p>
            <p className="text-sm text-ink-secondary">websites in use</p>
          </div>
          <p className="mt-1 text-[13px] text-ink-faint">
            Pro includes {pro.limits.websites} websites with {pro.limits.pagesPerWebsite} monitored
            pages each.
          </p>
        </Card>
      )}

      {/* Upgrade CTA (only when on Free) */}
      {!isPro && (
        <Card className="ring-2 ring-primary">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft">
                <Sparkles className="size-5 text-primary" aria-hidden />
              </span>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
                Upgrade to Pro - <Price usd={pro.priceMonthlyUsd} />/month
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                8 websites with {pro.limits.pagesPerWebsite} monitored pages each, daily scans,
                and every advanced feature.{" "}
                <BilledInUsdNote usd={pro.priceMonthlyUsd} className="text-ink-faint" />
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
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
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

      <ValueQuoteCard />

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
