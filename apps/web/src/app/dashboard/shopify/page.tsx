import type { Metadata } from "next";
import Link from "next/link";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { loadConnectedSites } from "@/lib/site-connections";
import { Card, CardHeader } from "@/components/ui/card";
import { ConnectedSites } from "@/components/dashboard/connected-sites";
import { BRAND_MARKS } from "@/components/brand/brand-marks";

export const metadata: Metadata = {
  title: "Shopify",
  robots: { index: false },
};

/**
 * Shopify: coming soon. Stores already linked (from before) are still listed
 * so they can be disconnected, and any store can be monitored today as an
 * ordinary website - so the page never reads as a dead end.
 */
export default async function ShopifyPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const stores = await loadConnectedSites(workspace.id, "shopify");

  return (
    <div className="max-w-3xl space-y-6">
      <Card>
        <div className="flex items-start gap-4">
          <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-white shadow-[0_1px_2px_rgb(21_21_21/10%)] ring-1 ring-black/8">
            <svg viewBox="0 0 24 24" className="size-7" aria-hidden>
              <path fill={BRAND_MARKS.shopify.hex} d={BRAND_MARKS.shopify.path} />
            </svg>
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-ink">Shopify</h1>
              <span className="rounded-full bg-primary-soft px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-accent">
                Coming soon
              </span>
            </div>
            <p className="mt-1 text-sm leading-6 text-ink-secondary">
              The MyKavo app for Shopify is on its way: a check of your store after every theme
              publish or edit, with the verdict right inside Shopify admin.
            </p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Monitor your store today" />
        <p className="-mt-2 text-sm leading-6 text-ink-secondary">
          You don&apos;t have to wait for the app. Add your store as a website and MyKavo scans it
          like any other site - visual, SEO, links, scripts and checkout buttons - and alerts you
          when something important changes.
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/dashboard/websites/new"
            className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Add your store
          </Link>
          <Link
            href="/shopify-app"
            className="inline-flex h-10 items-center rounded-full border border-line px-5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            About the Shopify app
          </Link>
        </div>
      </Card>

      {stores.length > 0 && (
        <Card>
          <CardHeader title="Connected stores" />
          <ConnectedSites sites={stores} canManage={canManageMembers(role)} />
        </Card>
      )}
    </div>
  );
}
