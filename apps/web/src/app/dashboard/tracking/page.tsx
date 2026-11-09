import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ChevronRight, Filter } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { CHANNELS, CHANNEL_LABEL } from "@/lib/activity/core";
import { loadTrackingOverview } from "@/lib/admin/tracking";
import { ago, planDisplay } from "@/lib/admin/tracking-core";
import { TRACKING_SHOWS, visibleRows, type TrackingShow } from "@/lib/admin/tracking-filter";
import {
  ActivitySpark,
  CHANNEL_DOT,
  CHANNEL_ICON,
  ChannelChip,
  ChannelLegend,
} from "@/components/dashboard/tracking";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tracking",
  robots: { index: false },
};

type Show = TrackingShow;
const SHOWS = TRACKING_SHOWS;

function href(params: { show?: Show; internal?: boolean }) {
  const q = new URLSearchParams();
  if (params.show && params.show !== "all") q.set("show", params.show);
  if (params.internal) q.set("internal", "1");
  const s = q.toString();
  return `/dashboard/tracking${s ? `?${s}` : ""}`;
}

/** Mono micro label used across the page. */
function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint", className)}>
      {children}
    </p>
  );
}

/** A section card: mono eyebrow, title, optional note on the right. */
function Panel({
  eyebrow,
  title,
  note,
  children,
  className,
}: {
  eyebrow: string;
  title: string;
  note?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-line bg-card p-5 sm:p-6", className)}>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <Micro>{eyebrow}</Micro>
          <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">{title}</h2>
        </div>
        {note && <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{note}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * A funnel as numbered steps: label, count, share of the first step, a bar,
 * and the drop from the step before, so the leak is the thing you read.
 */
function Funnel({
  steps,
  base,
  columns = false,
}: {
  steps: { label: string; count: number }[];
  base: number;
  columns?: boolean;
}) {
  const share = (n: number) => (base ? Math.round((n / base) * 100) : 0);
  return (
    <ol className={cn("grid gap-x-8", columns ? "sm:grid-cols-2" : "")}>
      {steps.map((f, i) => {
        const prev = i > 0 ? steps[i - 1].count : null;
        const lost = prev !== null && prev > 0 ? Math.round(((prev - f.count) / prev) * 100) : null;
        const pct = share(f.count);
        return (
          <li key={f.label} className="border-b border-line py-3 last:border-b-0">
            <div className="flex items-baseline gap-3">
              <span className="w-6 shrink-0 font-mono text-[11px] text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
              <span className="min-w-0 flex-1 truncate text-[13.5px] text-ink">{f.label}</span>
              {lost !== null && lost > 0 && (
                <span className="hidden font-mono text-[10.5px] text-critical-strong sm:inline" title="Lost since the step before">
                  -{lost}%
                </span>
              )}
              <span className="shrink-0 font-mono text-[13px] tabular-nums text-ink">
                <b className="font-semibold">{f.count}</b>
                <span className="ml-1.5 text-ink-faint">{pct}%</span>
              </span>
            </div>
            <div className="mt-2 ml-9 h-1.5 overflow-hidden rounded-full bg-ink/[0.07]">
              <div
                className={cn("h-full rounded-full", i === 0 ? "bg-ink" : "bg-primary")}
                style={{ width: `${Math.max(pct, f.count ? 2 : 0)}%` }}
              />
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Tracking - who is using MyKavo, where, and how far each person got:
 * web dashboard, Android app, WordPress plugin, Shopify app and AI
 * assistants. Operator-only (notFound for everyone else, like Users).
 */
export default async function TrackingPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; internal?: string }>;
}) {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user)) notFound();
  const sp = await searchParams;
  const show: Show = (SHOWS.find((s) => s.id === sp.show)?.id ?? "all") as Show;
  const includeInternal = sp.internal === "1";

  const { rows, kpis, daily, recording, extension, auditLeads } = await loadTrackingOverview(includeInternal);
  const visible = visibleRows(rows, show);
  const maxDaily = Math.max(1, ...daily.map((d) => CHANNELS.reduce((n, ch) => n + d[ch], 0)));
  const pct = (n: number) => (kpis.users ? Math.round((n / kpis.users) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Micro className="flex items-center gap-2">
            <span className="relative flex size-2">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
              <span className="relative inline-flex size-2 rounded-full bg-success" />
            </span>
            Admin / Tracking
          </Micro>
          <h1 className="mt-2 text-[30px] font-semibold leading-tight tracking-[-0.02em] text-ink">
            {kpis.activeToday} {kpis.activeToday === 1 ? "person" : "people"} used MyKavo today.
          </h1>
          <p className="mt-1.5 max-w-2xl text-[14px] text-ink-secondary">
            Who uses MyKavo, where (web, Android, WordPress, Shopify, Chrome, AI assistants) and where people get stuck.
          </p>
        </div>
        <Link
          href={href({ show, internal: !includeInternal })}
          className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:border-ink hover:text-ink"
        >
          {includeInternal ? "Hide team accounts" : "Include team accounts"}
        </Link>
      </div>

      {!recording && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning-soft p-4 text-[13px] text-warning-strong">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Page views, app opens and daily activity start recording once migration{" "}
            <code className="font-mono">20261001120000_user_activity</code> is run in Supabase. Until then this page shows
            what MyKavo already knows: sign-ins, app requests and downloads, push devices, plugin connections and keys.
          </p>
        </div>
      )}

      {/* The signature strip: four headline numbers on a split-flap board. */}
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
        {[
          { label: "Users", value: kpis.users, note: includeInternal ? "Including team accounts" : "Customers only" },
          { label: "Active today", value: kpis.activeToday, note: "Any channel" },
          { label: "Active 7 days", value: kpis.active7d, note: `${pct(kpis.active7d)}% of users` },
          { label: "Active 30 days", value: kpis.active30d, note: `${pct(kpis.active30d)}% of users` },
        ].map((t, i) => (
          <div
            key={t.label}
            className={cn(
              "flex flex-col gap-3 p-4 sm:p-5",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">{t.label}</dt>
            <dd className="order-first">
              <FlapNumber value={t.value} index={i} />
            </dd>
            <dd className="-mt-1 text-xs text-ink-secondary">{t.note}</dd>
          </div>
        ))}
      </dl>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel eyebrow="Channels" title="Where people use MyKavo" note="Share of users">
          <ul className="space-y-1">
            {CHANNELS.map((ch) => {
              const Icon = CHANNEL_ICON[ch];
              const c = kpis.byChannel[ch];
              const share = pct(c.adopted);
              return (
                <li key={ch} className="rounded-xl px-2 py-2.5 transition-colors hover:bg-ink/[0.03]">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-ink-secondary">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-[14px] font-medium text-ink">
                        <span className={cn("size-2 rounded-[2px]", CHANNEL_DOT[ch])} aria-hidden />
                        {CHANNEL_LABEL[ch]}
                      </p>
                      <p className="mt-0.5 text-[12px] text-ink-secondary">
                        {c.adopted} using · {c.active} active this week
                        {c.stuck > 0 && (
                          <>
                            {" · "}
                            <Link
                              href={href({ show: ch, internal: includeInternal })}
                              className="rounded-full bg-warning-soft px-1.5 py-px font-medium text-warning-strong hover:underline"
                            >
                              {c.stuck} stuck
                            </Link>
                          </>
                        )}
                      </p>
                    </div>
                    <span className="w-14 shrink-0 text-right font-mono text-[18px] font-semibold tabular-nums text-ink">
                      {share}%
                    </span>
                  </div>
                  <div className="mt-2 ml-12 h-1 overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden>
                    <div className="h-full rounded-full bg-ink/70" style={{ width: `${Math.max(share, c.adopted ? 2 : 0)}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Panel>

        <Panel eyebrow="Funnel" title="How far people get" note="Share of users · drop between steps">
          <Funnel steps={kpis.funnel} base={kpis.users} />
        </Panel>
      </div>

      {extension && (
        <Panel eyebrow="Chrome extension" title="Extension funnel" note="Anonymous counts · all time">
          {extension.installs === 0 ? (
            <p className="text-[13px] text-ink-secondary">No installs recorded yet.</p>
          ) : (
            <Funnel steps={extension.steps} base={extension.installs} columns />
          )}
        </Panel>
      )}

      {auditLeads && (
        <Panel
          eyebrow="Homepage form"
          title="Free site audit"
          note={<>All time · {includeInternal ? "including team" : "customers only"}</>}
        >
          <dl className="grid grid-cols-2 overflow-hidden rounded-xl border border-line sm:grid-cols-5">
            {[
              ["Requested", auditLeads.total],
              ["Last 7 days", auditLeads.last7d],
              ["Emailed", auditLeads.emailed],
              ["Failed", auditLeads.failed],
              ["Signed up after", auditLeads.signedUpAfter],
            ].map(([label, value], i) => (
              <div
                key={label}
                className={cn(
                  "px-4 py-3",
                  i > 0 && "border-l border-line",
                  i === 2 && "max-sm:border-l-0 max-sm:border-t",
                  i > 2 && "max-sm:border-t",
                  i === 4 && "max-sm:border-l-0",
                )}
              >
                <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{label}</dt>
                <dd
                  className={cn(
                    "mt-1 font-mono text-[22px] font-semibold tabular-nums",
                    label === "Failed" && Number(value) > 0 ? "text-critical-strong" : "text-ink",
                  )}
                >
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          {auditLeads.recent.length === 0 ? (
            <p className="mt-4 text-[13px] text-ink-secondary">Nobody has asked for an audit yet.</p>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {auditLeads.recent.map((l) => (
                <li key={l.id} className="grid gap-x-4 gap-y-1 py-3 text-[13px] sm:grid-cols-[minmax(0,1.3fr)_minmax(0,1.6fr)_auto]">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{l.host}</span>
                    <span className="block truncate font-mono text-[11.5px] text-ink-faint">
                      {l.email}
                      {l.internal && " · team"}
                    </span>
                  </span>
                  <span className="min-w-0 self-center text-ink-secondary">
                    {l.status === "COMPLETED" ? (
                      <span className="font-mono text-[12px]">
                        {l.pagesCrawled} pages · score {l.healthScore ?? "-"}
                        {l.emailed ? " · emailed" : ""}
                      </span>
                    ) : l.status === "FAILED" ? (
                      <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[11.5px] font-medium text-critical-strong" title={l.errorMessage ?? undefined}>
                        Failed
                      </span>
                    ) : (
                      <span className="font-mono text-[12px]">{l.status.toLowerCase()}</span>
                    )}
                  </span>
                  <span className="flex items-center gap-3 self-center sm:justify-end">
                    {l.userId ? (
                      <Link href={`/dashboard/tracking/${l.userId}`} className="font-medium text-ink underline decoration-primary decoration-2 underline-offset-4 hover:decoration-ink">
                        {l.signedUpAfter ? "Signed up" : "Existing user"}
                      </Link>
                    ) : (
                      <span className="text-ink-faint">No account</span>
                    )}
                    <span className="whitespace-nowrap font-mono text-[11.5px] text-ink-faint">{ago(l.createdAt)}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      <Panel eyebrow="Activity" title="Active users per day" note="Last 30 days (UTC)">
        <div className="flex h-32 items-end gap-[3px]" role="img" aria-label="Active users per day by channel, last 30 days">
          {daily.map((d) => {
            const total = CHANNELS.reduce((n, ch) => n + d[ch], 0);
            return (
              <span
                key={d.day}
                className="flex min-w-[4px] flex-1 flex-col-reverse overflow-hidden rounded-[3px]"
                style={{ height: total ? `${Math.max(6, (total / maxDaily) * 100)}%` : "3px" }}
                title={`${d.day}: ${CHANNELS.filter((ch) => d[ch]).map((ch) => `${CHANNEL_LABEL[ch]} ${d[ch]}`).join(", ") || "nobody"}`}
              >
                {total === 0 ? (
                  <span className="h-full bg-ink/[0.07]" />
                ) : (
                  CHANNELS.filter((ch) => d[ch]).map((ch) => (
                    <span key={ch} className={CHANNEL_DOT[ch]} style={{ height: `${(d[ch] / total) * 100}%` }} />
                  ))
                )}
              </span>
            );
          })}
        </div>
        <div className="mt-2 flex justify-between font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
          <span>{daily[0]?.day}</span>
          <span>Today</span>
        </div>
        <div className="mt-3 border-t border-line pt-3">
          <ChannelLegend />
        </div>
      </Panel>

      <section className="overflow-hidden rounded-2xl border border-line bg-card">
        <div className="flex flex-wrap items-end justify-between gap-2 px-4 pt-5 sm:px-6">
          <div>
            <Micro>People</Micro>
            <h2 className="mt-1 text-[16px] font-semibold tracking-tight text-ink">Everyone, by last activity</h2>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-4 sm:px-6">
          <Filter className="size-4 text-ink-faint" aria-hidden />
          {SHOWS.map((s) => (
            <Link
              key={s.id}
              href={href({ show: s.id, internal: includeInternal })}
              aria-current={show === s.id ? "page" : undefined}
              className={cn(
                "rounded-full px-3 py-1 text-[12px] font-medium transition-colors",
                show === s.id ? "bg-ink text-ink-inverse" : "border border-line text-ink-secondary hover:text-ink",
              )}
            >
              {s.label}
            </Link>
          ))}
          <span className="ml-auto font-mono text-[11px] uppercase tracking-[0.12em] text-ink-faint">{visible.length} people</span>
        </div>
        {visible.length === 0 ? (
          <p className="p-6 text-sm text-ink-secondary">Nobody matches this filter.</p>
        ) : (
          <>
          {/* Phones: one stacked row per person. */}
          <ul className="divide-y divide-line sm:hidden">
            {visible.map((r) => (
              <li key={r.id}>
                <Link href={`/dashboard/tracking/${r.id}`} className="block space-y-2 px-4 py-3">
                  <span className="flex items-center justify-between gap-2">
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-ink">{r.name || r.email}</span>
                      <span className="block truncate text-[12px] text-ink-secondary">{r.email}</span>
                    </span>
                    <span className="shrink-0 text-right text-[12px] text-ink-secondary">
                      {r.lastActiveAt ? ago(r.lastActiveAt) : "Never"}
                      {(r.paid || r.plan === "pro_trial") && <span className="block font-semibold uppercase text-accent">{planDisplay(r.plan)}</span>}
                    </span>
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span className="flex gap-1">
                      {CHANNELS.map((ch) => (
                        <ChannelChip key={ch} channel={ch} state={r.channels[ch]} />
                      ))}
                    </span>
                    <ActivitySpark spark={r.spark} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line font-mono text-[10.5px] font-medium uppercase tracking-[0.12em] text-ink-faint">
                  <th className="px-6 py-3">Person</th>
                  <th className="px-3 py-3">Last active</th>
                  <th className="px-3 py-3">Channels</th>
                  <th className="px-3 py-3">Last 14 days</th>
                  <th className="px-3 py-3 text-right">Sites</th>
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {visible.map((r) => {
                  const LastIcon = r.lastChannel ? CHANNEL_ICON[r.lastChannel] : null;
                  return (
                    <tr key={r.id} className="group transition-colors hover:bg-ink/[0.03]">
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/tracking/${r.id}`} className="block min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-ink group-hover:underline">{r.name || r.email}</span>
                            {(r.paid || r.plan === "pro_trial") && (
                              <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                                {planDisplay(r.plan)}
                              </span>
                            )}
                            {r.internal && (
                              <span className="rounded-full bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase text-ink-faint">
                                team
                              </span>
                            )}
                          </span>
                          <span className="block truncate text-[12px] text-ink-secondary">
                            {r.email} · joined {ago(r.signedUpAt)}
                          </span>
                        </Link>
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        {r.lastActiveAt ? (
                          <span className="inline-flex items-center gap-1.5 text-ink">
                            {LastIcon && <LastIcon className="size-3.5 text-ink-secondary" />}
                            {ago(r.lastActiveAt)}
                          </span>
                        ) : (
                          <span className="text-ink-faint">Never</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <span className="flex gap-1">
                          {CHANNELS.map((ch) => (
                            <ChannelChip key={ch} channel={ch} state={r.channels[ch]} />
                          ))}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <ActivitySpark spark={r.spark} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-ink">
                        {r.websites}
                        {r.websites > 0 && !r.monitoring && <span className="block text-[11px] text-warning-strong">no baseline</span>}
                      </td>
                      <td className="pr-4">
                        <Link href={`/dashboard/tracking/${r.id}`} aria-label={`Open ${r.email}`}>
                          <ChevronRight className="size-4 text-ink-faint" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface/50 px-4 py-3 text-[11px] text-ink-faint sm:px-6">
          <span>Chips: green active this week · grey installed · amber stuck part-way · red stopped · outline never used. Hover for details.</span>
          <ChannelLegend />
        </div>
      </section>
    </div>
  );
}
