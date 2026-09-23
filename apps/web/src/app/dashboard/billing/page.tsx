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
import { agencyBillingEnabled, billingEnabled } from "@/lib/billing/config";
import { dodoApiConfigured } from "@/lib/billing/dodo-api";
import { getPlan, formatLimit, type Plan } from "@/config/plans";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { ValueQuoteCard } from "@/components/value-quote";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";
import { ChangePlanButton } from "@/components/dashboard/change-plan-button";

function FeatureList({ features, columns = false }: { features: string[]; columns?: boolean }) {
  return (
    <ul className={columns ? "mt-5 grid gap-2.5 sm:grid-cols-2" : "mt-5 space-y-2.5"}>
      {features.map((f) => (
        <li key={f} className="flex items-start gap-2.5 text-sm text-ink-secondary">
          <Check className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />
          {f}
        </li>
      ))}
    </ul>
  );
}

/** One plan offered to a Free workspace, with its own checkout. */
function PlanOffer({
  plan,
  checkoutHref,
  available,
  highlighted,
}: {
  plan: Plan;
  checkoutHref: string;
  available: boolean;
  highlighted: boolean;
}) {
  return (
    <Card className={highlighted ? "ring-2 ring-accent" : undefined}>
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft">
        <Sparkles className="size-5 text-accent" aria-hidden />
      </span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
        {plan.name} - ${plan.priceMonthlyUsd}/month
      </h2>
      <p className="mt-1 text-sm text-ink-secondary">{plan.headline}</p>
      <FeatureList features={plan.features} />
      {available ? (
        <a
          href={checkoutHref}
          className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
        >
          Upgrade to {plan.name} <ArrowRight className="size-4" aria-hidden />
        </a>
      ) : (
        <p className="mt-6 text-sm text-ink-faint">
          {plan.name} checkout is being set up. Email{" "}
          <a href="mailto:support@mykavo.app" className="font-medium text-accent hover:underline">
            support@mykavo.app
          </a>{" "}
          and we&apos;ll get you started.
        </p>
      )}
    </Card>
  );
}

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
  const isPaid = plan.id !== "free";
  const pro = getPlan("pro");
  const agency = getPlan("agency");
  const canChangePlan = dodoApiConfigured() && !subscription?.cancelAtPeriodEnd;
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
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
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
            ${plan.priceMonthlyUsd}/month
          </p>
          {isPaid && (
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

        {plan.grandfathered && (
          <p className="mt-3 text-[13px] text-ink-secondary">
            You joined Pro before the Agency plan existed, so white-label client reports and 5
            team seats stay included for as long as you keep this subscription.
          </p>
        )}

        {isPaid && renewalLabel && (
          <div className="mt-4 flex items-start gap-2.5 rounded-field bg-surface px-4 py-3">
            <CalendarClock className="mt-0.5 size-4.5 shrink-0 text-ink-secondary" aria-hidden />
            <p className="text-sm text-ink">
              {subscription?.cancelAtPeriodEnd ? (
                <>
                  {plan.name} access ends on <span className="font-semibold">{renewalLabel}</span>
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
                  - ${plan.priceMonthlyUsd} billed monthly via Dodo Payments (charged
                  as ${plan.priceMonthlyUsd} USD).
                </>
              )}
            </p>
          </div>
        )}

        <FeatureList features={plan.features} />

        {isPaid ? (
          dodoApiConfigured() ? (
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="/api/billing/portal"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-5 text-[13px] font-medium text-ink-inverse transition-colors hover:bg-ink-hover"
              >
                Manage billing
              </a>
              {plan.id === "agency" && canChangePlan && (
                <ChangePlanButton
                  target="pro"
                  variant="quiet"
                  label="Switch to Pro"
                  confirmMessage={`Switch to Pro ($${pro.priceMonthlyUsd}/month) at the end of this billing period? You keep Agency until then. Pro monitors up to ${pro.limits.websites} websites and has no white-label reports.`}
                />
              )}
              {!subscription?.cancelAtPeriodEnd && (
                <CancelSubscriptionButton apiCancel planName={plan.name} />
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

      {/* Website capacity (paid plans) */}
      {isPaid && (
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
            {plan.name} includes {formatLimit(plan.limits.websites)} websites with{" "}
            {formatLimit(plan.limits.pagesPerWebsite)} monitored pages each.
          </p>
        </Card>
      )}

      {/* Pro -> Agency: changes the existing subscription, never a second one. */}
      {plan.id === "pro" && (
        <Card className="ring-2 ring-accent">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary-soft">
            <Sparkles className="size-5 text-accent" aria-hidden />
          </span>
          <h2 className="mt-4 text-xl font-semibold tracking-tight text-ink">
            Upgrade to Agency - ${agency.priceMonthlyUsd}/month
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            {formatLimit(agency.limits.websites)} websites with{" "}
            {formatLimit(agency.limits.pagesPerWebsite)} monitored pages each, white-label client
            reports and up to {agency.limits.maxMembers} team members. You pay only the difference
            for the rest of this billing period.
          </p>
          <FeatureList features={agency.features} columns />
          <div className="mt-6">
            {agencyBillingEnabled && canChangePlan ? (
              <ChangePlanButton
                target="agency"
                label="Upgrade to Agency"
                confirmMessage={`Upgrade to Agency ($${agency.priceMonthlyUsd}/month) now? You'll be charged the prorated difference for the rest of this billing period.`}
              />
            ) : subscription?.cancelAtPeriodEnd ? (
              <p className="text-sm text-ink-faint">
                Your subscription is set to cancel. Resume it from Manage billing to upgrade.
              </p>
            ) : (
              <p className="text-sm text-ink-faint">
                Agency upgrades are being set up. Email{" "}
                <a href="mailto:support@mykavo.app" className="font-medium text-accent hover:underline">
                  support@mykavo.app
                </a>{" "}
                and we&apos;ll switch you over.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* Free: both plans, each with its own checkout. */}
      {!isPaid && (
        <>
          <PlanOffer
            plan={pro}
            checkoutHref="/api/billing/checkout"
            available={billingEnabled}
            highlighted
          />
          <PlanOffer
            plan={agency}
            checkoutHref="/api/billing/checkout?plan=agency"
            available={agencyBillingEnabled}
            highlighted={false}
          />
          <p className="-mt-3 text-center text-[13px] text-ink-faint">
            Secure checkout by Dodo Payments. Cancel anytime.
          </p>
        </>
      )}

      <ValueQuoteCard />

      <p className="text-center text-[13px] text-ink-faint">
        Compare plans on the{" "}
        <Link href="/pricing" className="font-medium text-accent hover:underline">
          pricing page
        </Link>
        .
      </p>
    </div>
  );
}
