import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Workflow } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { getAutomationsOverview, type AutomationsOverview } from "@/lib/automations-admin";
import { AutomationsList } from "@/components/dashboard/automations-list";
import { AutomationPeopleSection } from "@/components/dashboard/engagement-sections";
import { UpdateEmailsPanel } from "@/components/dashboard/update-emails-panel";
import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { loadUpdateEmailsPanel } from "@/lib/admin/product-updates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Automations",
  robots: { index: false },
};

function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint", className)}>{children}</p>
  );
}

function totals(o: AutomationsOverview) {
  const all = o.automations;
  return {
    count: all.length,
    on: all.filter((a) => a.settings.enabled).length,
    sent7d: all.reduce((n, a) => n + a.stats.sent7d, 0),
    sent30d: all.reduce((n, a) => n + a.stats.sent30d, 0),
    failed30d: all.reduce((n, a) => n + a.stats.failed30d, 0),
    edited: all.filter((a) => a.customised).length,
  };
}

/**
 * Admin > Automations: every email MyKavo sends on its own, with what it
 * sent lately, an on/off switch, and a page to edit each one.
 *
 * Operator only. `notFound()` rather than a "not allowed" page, like the
 * other admin pages; every API behind it re-checks the same allowlist.
 */
export default async function AutomationsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user)) notFound();

  const [overview, updates] = await Promise.all([getAutomationsOverview(), loadUpdateEmailsPanel()]);
  const t = totals(overview);
  const off = t.count - t.on;

  const tiles = [
    { label: "Switched on", value: t.on, note: off > 0 ? `${off} switched off` : `All ${t.count} running`, warn: false },
    { label: "Sent, 7 days", value: t.sent7d, note: "Every automated email", warn: false },
    { label: "Sent, 30 days", value: t.sent30d, note: t.edited > 0 ? `${t.edited} with edited wording` : "All on default wording", warn: false },
    {
      label: "Failed, 30 days",
      value: t.failed30d,
      note: t.failed30d > 0 ? "Open the email to see why" : "None failed",
      warn: t.failed30d > 0,
    },
  ];

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <Micro className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="flex items-center gap-1.5 text-accent">
              <span className={cn("size-1.5 rounded-full", t.on > 0 ? "bg-success" : "bg-ink-faint")} aria-hidden />
              Admin
            </span>
            <span aria-hidden>/</span>
            <span>Automations</span>
            <span aria-hidden>/</span>
            <span>{t.count} emails MyKavo sends by itself</span>
          </Micro>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            <span className="mk-highlight">
              {t.on} of {t.count} automations
            </span>{" "}
            {t.on === 1 ? "is" : "are"} on.{" "}
            <span className="text-ink-secondary">
              {t.sent7d} {t.sent7d === 1 ? "email" : "emails"} this week.
            </span>
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
            Reminders only spend what website alerts leave of the daily email budget, so they never use up the quota a
            critical alert needs. Changes apply on the worker&apos;s next run: within the hour for reminders, at the next
            signup for the welcome email.
          </p>
        </div>
        <Link
          href="/dashboard/automations/flows"
          className="inline-flex h-10 items-center gap-2 rounded-full border-[1.5px] border-ink bg-primary px-5 text-[13.5px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-transform hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <Workflow className="size-4" aria-hidden /> Check flow
        </Link>
      </div>

      {!overview.ready && (
        <p className="rounded-2xl bg-critical-soft px-4 py-3 text-[13px] text-critical-strong" role="status">
          Editing is off until the <code className="font-mono">20260928120000_email_automations</code> migration is
          applied in Supabase. Every email below is sending with its default wording meanwhile, and the numbers are
          matched on their original subjects.
        </p>
      )}

      <div>
        <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
          {tiles.map((tile, i) => (
            <div
              key={tile.label}
              className={cn(
                "flex flex-col gap-3 p-4 sm:p-5",
                i % 2 === 1 && "border-l border-line",
                i >= 2 && "border-t border-line lg:border-t-0",
                i === 2 && "lg:border-l",
              )}
            >
              <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
                {tile.label}
              </dt>
              <dd className="order-first">
                <FlapNumber value={tile.value} index={i} />
              </dd>
              <dd className={cn("-mt-1 text-xs", tile.warn ? "font-medium text-critical-strong" : "text-ink-secondary")}>
                {tile.note}
              </dd>
            </div>
          ))}
        </dl>
        {overview.unsubscribes && (
          <Micro className="mt-4 flex flex-wrap gap-x-5 gap-y-1">
            <span>
              Unsubscribed from optional emails{" "}
              <strong className="font-semibold text-ink">{overview.unsubscribes.total}</strong>
            </span>
            <span>
              Last 30 days <strong className="font-semibold text-ink">{overview.unsubscribes.last30d}</strong>
            </span>
          </Micro>
        )}
      </div>

      <AutomationsList overview={overview} />

      <UpdateEmailsPanel panel={updates} />

      <AutomationPeopleSection />
    </div>
  );
}
