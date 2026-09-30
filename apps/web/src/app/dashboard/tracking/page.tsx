import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Activity, AlertTriangle, ChevronRight, Filter, Users } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { Card, CardHeader } from "@/components/ui/card";
import { CHANNELS, CHANNEL_LABEL, type Channel } from "@/lib/activity/core";
import { loadTrackingOverview } from "@/lib/admin/tracking";
import { ago, type TrackingRow } from "@/lib/admin/tracking-core";
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

type Show = "all" | "active" | "inactive" | "stuck" | Channel;
const SHOWS: Array<{ id: Show; label: string }> = [
  { id: "all", label: "Everyone" },
  { id: "active", label: "Active 7 days" },
  { id: "inactive", label: "Gone quiet" },
  { id: "stuck", label: "Stuck somewhere" },
  { id: "android", label: "Android app" },
  { id: "wordpress", label: "WordPress" },
  { id: "shopify", label: "Shopify" },
  { id: "mcp", label: "AI assistant" },
];

function matches(row: TrackingRow, show: Show, now: number): boolean {
  const recent = (at: string | null, days: number) => !!at && now - new Date(at).getTime() <= days * 86_400_000;
  switch (show) {
    case "all":
      return true;
    case "active":
      return recent(row.lastActiveAt, 7);
    case "inactive":
      return !recent(row.lastActiveAt, 14);
    case "stuck":
      return CHANNELS.some((ch) => ["pending", "started"].includes(row.channels[ch].status));
    default:
      return row.channels[show].status !== "none";
  }
}

/** The filtered rows, most recently active first. */
function visibleRows(rows: TrackingRow[], show: Show): TrackingRow[] {
  const now = Date.now();
  return rows
    .filter((r) => matches(r, show, now))
    .sort((a, b) => (b.lastActiveAt ?? b.signedUpAt).localeCompare(a.lastActiveAt ?? a.signedUpAt));
}

function href(params: { show?: Show; internal?: boolean }) {
  const q = new URLSearchParams();
  if (params.show && params.show !== "all") q.set("show", params.show);
  if (params.internal) q.set("internal", "1");
  const s = q.toString();
  return `/dashboard/tracking${s ? `?${s}` : ""}`;
}

function Kpi({ label, value, hint }: { label: string; value: number | string; hint?: string }) {
  return (
    <div className="rounded-card bg-card p-4 shadow-card">
      <p className="text-[12px] font-medium text-ink-secondary">{label}</p>
      <p className="mt-1 text-[26px] font-semibold tracking-tight text-ink tabular-nums">{value}</p>
      {hint && <p className="text-[11px] text-ink-faint">{hint}</p>}
    </div>
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
  if (!isPlatformAdmin(session.user.email)) notFound();
  const sp = await searchParams;
  const show: Show = (SHOWS.find((s) => s.id === sp.show)?.id ?? "all") as Show;
  const includeInternal = sp.internal === "1";

  const { rows, kpis, daily, recording } = await loadTrackingOverview(includeInternal);
  const visible = visibleRows(rows, show);
  const maxDaily = Math.max(1, ...daily.map((d) => CHANNELS.reduce((n, ch) => n + d[ch], 0)));
  const pct = (n: number) => (kpis.users ? Math.round((n / kpis.users) * 100) : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Tracking</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            Who uses MyKavo, where - web, Android app, WordPress, Shopify, AI assistants - and where people get stuck.
          </p>
        </div>
        <Link
          href={href({ show, internal: !includeInternal })}
          className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          {includeInternal ? "Hide team accounts" : "Include team accounts"}
        </Link>
      </div>

      {!recording && (
        <div className="flex items-start gap-3 rounded-card bg-warning-soft p-4 text-[13px] text-warning-strong">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            Page views, app opens and daily activity start recording once migration{" "}
            <code className="font-mono">20261001120000_user_activity</code> is run in Supabase. Until then this page shows
            what MyKavo already knows: sign-ins, app requests and downloads, push devices, plugin connections and keys.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Users" value={kpis.users} hint={includeInternal ? "Including team accounts" : "Customers only"} />
        <Kpi label="Active today" value={kpis.activeToday} hint="Any channel" />
        <Kpi label="Active 7 days" value={kpis.active7d} hint={`${pct(kpis.active7d)}% of users`} />
        <Kpi label="Active 30 days" value={kpis.active30d} hint={`${pct(kpis.active30d)}% of users`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Activity} title="Where people use MyKavo" />
          <ul className="divide-y divide-line">
            {CHANNELS.map((ch) => {
              const Icon = CHANNEL_ICON[ch];
              const c = kpis.byChannel[ch];
              return (
                <li key={ch} className="flex items-center gap-3 py-2.5">
                  <span className="inline-flex size-8 items-center justify-center rounded-lg bg-surface text-ink-secondary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{CHANNEL_LABEL[ch]}</p>
                    <p className="text-[12px] text-ink-secondary">
                      {c.adopted} using · {c.active} active this week
                      {c.stuck > 0 && (
                        <>
                          {" · "}
                          <Link href={href({ show: ch, internal: includeInternal })} className="font-medium text-warning-strong hover:underline">
                            {c.stuck} stuck
                          </Link>
                        </>
                      )}
                    </p>
                  </div>
                  <span className="text-right text-lg font-semibold tabular-nums text-ink">{pct(c.adopted)}%</span>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader icon={Users} title="How far people get" />
          <ul className="space-y-2.5">
            {kpis.funnel.map((f) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between text-[13px]">
                  <span className="text-ink">{f.label}</span>
                  <span className="tabular-nums text-ink-secondary">
                    <b className="font-semibold text-ink">{f.count}</b> · {pct(f.count)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-surface">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(pct(f.count), f.count ? 2 : 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon={Activity}
          title="Active users per day"
          action={<span className="text-[12px] text-ink-faint">Last 30 days (UTC)</span>}
        />
        <div className="flex h-28 items-end gap-[3px]" role="img" aria-label="Active users per day by channel, last 30 days">
          {daily.map((d) => {
            const total = CHANNELS.reduce((n, ch) => n + d[ch], 0);
            return (
              <span
                key={d.day}
                className="flex min-w-[4px] flex-1 flex-col-reverse overflow-hidden rounded-t-[3px]"
                style={{ height: total ? `${Math.max(6, (total / maxDaily) * 100)}%` : "3px" }}
                title={`${d.day}: ${CHANNELS.filter((ch) => d[ch]).map((ch) => `${CHANNEL_LABEL[ch]} ${d[ch]}`).join(", ") || "nobody"}`}
              >
                {total === 0 ? (
                  <span className="h-full bg-line" />
                ) : (
                  CHANNELS.filter((ch) => d[ch]).map((ch) => (
                    <span key={ch} className={CHANNEL_DOT[ch]} style={{ height: `${(d[ch] / total) * 100}%` }} />
                  ))
                )}
              </span>
            );
          })}
        </div>
        <div className="mt-3">
          <ChannelLegend />
        </div>
      </Card>

      <Card className="p-0 sm:p-0">
        <div className="flex flex-wrap items-center gap-2 border-b border-line p-4 sm:px-6">
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
          <span className="ml-auto text-[12px] text-ink-faint">{visible.length} people</span>
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
                      {r.paid && <span className="block font-semibold uppercase text-accent">{r.plan}</span>}
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
                <tr className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
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
                    <tr key={r.id} className="group hover:bg-surface/60">
                      <td className="px-6 py-3">
                        <Link href={`/dashboard/tracking/${r.id}`} className="block min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium text-ink group-hover:underline">{r.name || r.email}</span>
                            {r.paid && (
                              <span className="rounded-full bg-primary-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                                {r.plan}
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
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-6 py-3 text-[11px] text-ink-faint">
          <span>Chips: green active this week · grey installed · amber stuck part-way · red stopped · outline never used. Hover for details.</span>
          <ChannelLegend />
        </div>
      </Card>
    </div>
  );
}
