import Link from "next/link";
import {
  ArrowRight,
  Check,
  CheckCircle2,
  CreditCard,
  Globe,
  Plus,
  Sparkles,
} from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import {
  getWorkspaceSubscription,
  getEffectiveWebsiteLimit,
  getWorkspaceAddons,
} from "@/lib/billing/subscription";
import { billingEnabled, websiteAddonEnabled } from "@/lib/billing/config";
import { dodoApiConfigured } from "@/lib/billing/dodo-api";
import { getPlan, formatLimit, WEBSITE_ADDON } from "@/config/plans";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { CancelSubscriptionButton } from "@/components/dashboard/cancel-subscription-button";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; addon?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const [plan, subscription, websiteLimit, addons, websiteCount] = await Promise.all([
    getWorkspacePlan(workspace.id),
    getWorkspaceSubscription(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    getWorkspaceAddons(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
  ]);
  const isPro = plan.id === "pro";
  const pro = getPlan("pro");
  const justCheckedOut = sp.checkout === "success";
  const needsPro = sp.addon === "needs-pro";
  const addonLimitReached = sp.addon === "limit";
  const addonUnits = addons.length;
  const atAddonCap = addonUnits >= WEBSITE_ADDON.maxUnits;

  return (
    <div className="max-w-2xl space-y-6">
      {justCheckedOut && (
        <div className="flex items-start gap-3 rounded-card bg-primary-soft px-5 py-4">
          <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <p className="text-sm text-ink">
            Thanks for your payment! It&apos;s being confirmed — the change activates the moment
            Dodo confirms the charge (usually seconds). Refresh this page shortly.
          </p>
        </div>
      )}

      {needsPro && (
        <div className="flex items-start gap-3 rounded-card bg-warning-soft px-5 py-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-warning-strong" aria-hidden />
          <p className="text-sm text-ink">
            Website add-ons extend the Pro plan. Upgrade to Pro first, then you can add
            {" "}{WEBSITE_ADDON.websitesPerUnit} more website anytime for ${WEBSITE_ADDON.priceMonthlyUsd}/mo
            (up to {WEBSITE_ADDON.maxUnits}).
          </p>
        </div>
      )}

      {addonLimitReached && (
        <div className="flex items-start gap-3 rounded-card bg-warning-soft px-5 py-4">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-warning-strong" aria-hidden />
          <p className="text-sm text-ink">
            You already have the maximum of {WEBSITE_ADDON.maxUnits} website add-ons on this
            workspace.
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
            You&apos;re on the Free plan — 1 website and 5 monitored pages.
          </p>
        )}
      </Card>

      {/* Website capacity + self-serve add-ons (Pro only) */}
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
            {pro.limits.websites} included
            {addonUnits > 0 &&
              ` + ${addonUnits} add-on website${addonUnits === 1 ? "" : "s"} (max ${WEBSITE_ADDON.maxUnits})`}
          </p>

          {addonUnits > 0 && (
            <ul className="mt-4 divide-y divide-line rounded-field border border-line">
              {addons.map((a, i) => (
                <li
                  key={a.dodoSubscriptionId}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-ink">
                    Add-on {i + 1} · +{a.websitesGranted} website{a.websitesGranted === 1 ? "" : "s"}
                  </span>
                  <span className="text-[13px] text-ink-faint">
                    {a.cancelAtPeriodEnd
                      ? "Cancels at period end"
                      : a.currentPeriodEnd
                        ? `Renews ${a.currentPeriodEnd.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                        : "Active"}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {websiteAddonEnabled ? (
            atAddonCap ? (
              <p className="mt-5 text-[13px] text-ink-faint">
                You&apos;ve reached the maximum of {WEBSITE_ADDON.maxUnits} website add-ons.
              </p>
            ) : (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <a
                  href="/api/billing/addon"
                  className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
                >
                  <Plus className="size-4" aria-hidden />
                  Add {WEBSITE_ADDON.websitesPerUnit} more website — ${WEBSITE_ADDON.priceMonthlyUsd}/mo
                </a>
                <p className="text-[13px] text-ink-faint">
                  Billed as a separate subscription. Cancel add-ons anytime
                  {dodoApiConfigured() ? " from Manage billing." : " in your Dodo account."}
                </p>
              </div>
            )
          ) : (
            <p className="mt-5 text-[13px] text-ink-faint">
              Need more than {formatLimit(websiteLimit)} websites? Website add-ons aren&apos;t
              enabled on this deployment yet.
            </p>
          )}
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
                Upgrade to Pro — ${pro.priceMonthlyUsd}/month
              </h2>
              <p className="mt-1 text-sm text-ink-secondary">
                8 websites with 20 monitored pages each, daily scans, and every advanced feature — add more websites anytime.
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
