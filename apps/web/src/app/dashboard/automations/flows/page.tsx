import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Lock, Mail, Users, Workflow } from "lucide-react";
import { FLOW_TRIGGERS } from "@mykavo/shared";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { listFlows, type FlowListItem } from "@/lib/flows/server";
import { NewFlowButton } from "@/components/flows/new-flow-button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Automation Tool",
  robots: { index: false },
};

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 60) return `${Math.max(1, mins)} min ago`;
  const h = Math.round(mins / 60);
  return h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
}

const STATUS: Record<FlowListItem["status"], [string, string]> = {
  ACTIVE: ["Active", "bg-success-soft text-success-strong"],
  PAUSED: ["Paused", "bg-warning-soft text-warning-strong"],
  DRAFT: ["Draft", "bg-surface text-ink-secondary"],
};

/**
 * MyKavo Automation Tool - every email flow: the built-in ones (read-only
 * pictures of the built-in rules) and the ones built here. Operator only.
 */
export default async function FlowsPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  const { ready, flows, system } = await listFlows();

  return (
    <div className="max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-card bg-[#0f1115] p-7 text-white shadow-card">
        <div
          className="pointer-events-none absolute inset-0 opacity-40 [background-image:radial-gradient(circle,rgba(255,255,255,0.18)_1px,transparent_1px)] [background-size:20px_20px] [mask-image:linear-gradient(to_left,black,transparent_70%)]"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <Link href="/dashboard/automations" className="text-[12.5px] text-white/60 hover:text-white">
              ← Automations
            </Link>
            <div className="mt-3 flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary text-primary-contrast">
                <Workflow className="size-5" aria-hidden />
              </span>
              <h1 className="text-[24px] font-semibold tracking-tight">MyKavo Automation Tool</h1>
            </div>
            <p className="mt-3 text-[14px] leading-6 text-white/70">
              Build email flows on a canvas: start on a signup or a first website, wait, branch on what an account has done,
              and send built-in or your own emails. Every flow shares the same guard rails as the built-in emails - the
              email budget, one optional email a day, and unsubscribes.
            </p>
          </div>
          <NewFlowButton disabled={!ready} variant="light" />
        </div>
      </section>

      {!ready && (
        <p className="rounded-tile bg-critical-soft px-4 py-3 text-[13px] text-critical-strong" role="status">
          Creating flows is off until the <code className="font-mono">20260928160000_automation_flows</code> migration is
          applied in Supabase. The built-in flows below can already be viewed.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-[15px] font-semibold text-ink">Your flows</h2>
        {flows.length === 0 ? (
          <div className="flex flex-col items-center rounded-card border border-dashed border-line bg-card px-6 py-12 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-accent">
              <Workflow className="size-6" aria-hidden />
            </span>
            <p className="mt-4 text-[15px] font-semibold text-ink">No flows yet</p>
            <p className="mt-1 max-w-sm text-[13px] text-ink-secondary">
              Start from a blank canvas, or copy the built-in journey and make it your own.
            </p>
            <div className="mt-5">
              <NewFlowButton disabled={!ready} />
            </div>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {flows.map((f) => (
              <Link
                key={f.id}
                href={`/dashboard/automations/flows/${f.id}`}
                className="group flex flex-col rounded-card bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="min-w-0 truncate text-[15px] font-semibold text-ink">{f.name}</p>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold", STATUS[f.status][1])}>
                    {STATUS[f.status][0]}
                  </span>
                </div>
                <p className="mt-1 text-[12.5px] text-ink-secondary">
                  {FLOW_TRIGGERS[f.trigger]?.label ?? f.trigger} · {f.steps} step{f.steps === 1 ? "" : "s"}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] text-ink-faint"><Users className="size-3" aria-hidden /> In flow</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-ink">{f.runs.active}</dd>
                  </div>
                  <div>
                    <dt className="text-[11px] text-ink-faint">Finished</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-ink">{f.runs.completed}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-[11px] text-ink-faint"><Mail className="size-3" aria-hidden /> Sent</dt>
                    <dd className="text-[15px] font-semibold tabular-nums text-ink">{f.sent}</dd>
                  </div>
                </dl>
                <p className="mt-3 flex items-center justify-between text-[12px] text-ink-faint">
                  Edited {ago(f.updatedAt)}
                  <ArrowRight className="size-4 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-[15px] font-semibold text-ink">Built-in flows</h2>
        <p className="mb-3 text-[13px] text-ink-secondary">
          The emails MyKavo sends on its own, drawn as flows. Edit their wording and timing in Automations, or copy one to
          build on.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          {system.map((f) => (
            <Link
              key={f.id}
              href={`/dashboard/automations/flows/${f.id}`}
              className="group flex items-start gap-4 rounded-card bg-card p-5 shadow-card transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(0,0,0,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-contrast">
                <Lock className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  {f.name}
                  <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold text-accent">Built-in</span>
                </p>
                <p className="mt-0.5 text-[12.5px] text-ink-secondary">
                  {f.triggerLabel} · {f.description}
                </p>
                <p className="mt-2 text-[12px] text-ink-faint">{f.sent30d} sent in the last 30 days</p>
              </div>
              <ArrowRight className="mt-1 size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
