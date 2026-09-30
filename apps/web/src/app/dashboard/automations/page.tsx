import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Workflow } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAutomationsOverview } from "@/lib/automations-admin";
import { Card, CardHeader } from "@/components/ui/card";
import { AutomationsList } from "@/components/dashboard/automations-list";
import { AutomationPeopleSection } from "@/components/dashboard/engagement-sections";
import { UpdateEmailsPanel } from "@/components/dashboard/update-emails-panel";
import { loadUpdateEmailsPanel } from "@/lib/admin/product-updates";

export const metadata: Metadata = {
  title: "Automations",
  robots: { index: false },
};

/**
 * Admin > Automations: every email MyKavo sends on its own, with what it
 * sent lately, an on/off switch, and a page to edit each one.
 *
 * Operator only. `notFound()` rather than a "not allowed" page, like the
 * other admin pages; every API behind it re-checks the same allowlist.
 */
export default async function AutomationsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();

  const [overview, updates] = await Promise.all([getAutomationsOverview(), loadUpdateEmailsPanel()]);

  return (
    <div className="max-w-5xl space-y-6">
      <Card>
        <CardHeader
          icon={Workflow}
          title="Automations"
          action={
            <div className="flex items-center gap-2">
              <span className="hidden rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-accent sm:inline">
                Admin only
              </span>
              <Link
                href="/dashboard/automations/flows"
                className="inline-flex h-9 items-center gap-2 rounded-full bg-[#0f1115] px-4 text-[13px] font-semibold text-white shadow-card transition-colors hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <span className="inline-flex size-5 items-center justify-center rounded-md bg-primary text-primary-contrast">
                  <Workflow className="size-3" aria-hidden />
                </span>
                Check flow
              </Link>
            </div>
          }
        />
        <p className="text-[13px] text-ink-secondary">
          The emails MyKavo sends by itself. Reminders only spend what website alerts leave of the daily email
          budget, so they can never use up the quota a critical alert needs. The worker picks up changes on its
          next run: within the hour for reminders, at the next signup for the welcome email.
        </p>
        {overview.unsubscribes && (
          <p className="mt-3 text-[13px] text-ink-secondary">
            Unsubscribed from the optional emails:{" "}
            <strong className="font-semibold text-ink">{overview.unsubscribes.total}</strong> in total,{" "}
            {overview.unsubscribes.last30d} in the last 30 days.
          </p>
        )}
        {!overview.ready && (
          <p className="mt-4 rounded-tile bg-critical-soft px-4 py-3 text-[13px] text-critical-strong" role="status">
            Editing is off until the <code className="font-mono">20260928120000_email_automations</code> migration
            is applied in Supabase. Every email below is sending with its default wording meanwhile, and the numbers
            are matched on their original subjects.
          </p>
        )}
      </Card>

      <AutomationsList overview={overview} />

      <UpdateEmailsPanel panel={updates} />

      <AutomationPeopleSection />
    </div>
  );
}
