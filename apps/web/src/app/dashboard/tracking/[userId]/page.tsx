import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, Globe, History, Laptop, LayoutList, Smartphone } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { Card, CardHeader } from "@/components/ui/card";
import { CHANNEL_LABEL } from "@/lib/activity/core";
import { loadUserTracking } from "@/lib/admin/tracking";
import { ago, hostOf } from "@/lib/admin/tracking-core";
import { CHANNEL_DOT, CHANNEL_ICON, ChannelCard } from "@/components/dashboard/tracking";
import { CHANNELS } from "@/lib/activity/core";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Tracking",
  robots: { index: false },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "UTC" }) + " UTC";

/**
 * One person's MyKavo journey: where they use it (web, Android, WordPress,
 * Shopify, AI assistants), their last 30 days, a timeline of what they did,
 * the pages they look at and the devices they use. Operator-only.
 */
export default async function UserTrackingPage({ params }: { params: Promise<{ userId: string }> }) {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  const { userId } = await params;
  const data = await loadUserTracking(userId);
  if (!data) notFound();
  const { row, heat, timeline, pages, devices, websites, workspaces } = data;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/tracking"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Tracking
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex flex-wrap items-center gap-2 text-2xl font-semibold tracking-tight text-ink">
              <span className="truncate">{row.name || row.email}</span>
              {row.paid && (
                <span className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-semibold uppercase text-accent">{row.plan}</span>
              )}
              {row.internal && (
                <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase text-ink-faint">team</span>
              )}
            </h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {row.email} · joined {ago(row.signedUpAt)} · {row.websites} website{row.websites === 1 ? "" : "s"}
            </p>
          </div>
          <div className="text-right text-sm">
            <p className="text-ink-secondary">Last active</p>
            <p className="font-semibold text-ink">
              {row.lastActiveAt ? `${ago(row.lastActiveAt)}${row.lastChannel ? ` · ${CHANNEL_LABEL[row.lastChannel]}` : ""}` : "Never"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {CHANNELS.map((ch) => (
          <ChannelCard key={ch} channel={ch} state={row.channels[ch]} />
        ))}
      </div>

      <Card>
        <CardHeader
          icon={CalendarDays}
          title="Last 30 days"
          action={<span className="text-[12px] text-ink-faint">{row.activeDays30} active days</span>}
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-separate border-spacing-[3px]">
            <tbody>
              {heat.map((h) => {
                const Icon = CHANNEL_ICON[h.channel];
                const max = Math.max(1, ...h.days.map((d) => d.pings));
                return (
                  <tr key={h.channel}>
                    <th scope="row" className="w-40 pr-2 text-left text-[12px] font-medium text-ink-secondary">
                      <span className="inline-flex items-center gap-1.5">
                        <Icon className="size-3.5" />
                        {CHANNEL_LABEL[h.channel]}
                      </span>
                    </th>
                    {h.days.map((d) => (
                      <td
                        key={d.day}
                        title={`${d.day}: ${d.pings ? "active" : "not active"}`}
                        className={cn("h-5 rounded-[3px]", d.pings ? CHANNEL_DOT[h.channel] : "bg-surface")}
                        style={d.pings ? { opacity: 0.45 + 0.55 * (d.pings / max) } : undefined}
                      />
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader icon={History} title="Timeline" action={<span className="text-[12px] text-ink-faint">Newest first</span>} />
          {timeline.length === 0 ? (
            <p className="text-sm text-ink-secondary">Nothing recorded yet.</p>
          ) : (
            <ol className="relative space-y-4 border-l border-line pl-5">
              {timeline.map((t, i) => {
                const Icon = CHANNEL_ICON[t.channel];
                return (
                  <li key={`${t.at}-${i}`} className="relative">
                    <span className="absolute -left-[31px] top-0 inline-flex size-5 items-center justify-center rounded-full bg-card ring-1 ring-line">
                      <Icon className="size-3 text-ink-secondary" />
                    </span>
                    <p className="text-sm font-medium text-ink">{t.title}</p>
                    {t.detail && <p className="text-[12px] text-ink-secondary">{t.detail}</p>}
                    <p className="text-[11px] text-ink-faint">
                      {when(t.at)} · {ago(t.at)}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader icon={LayoutList} title="Pages they use" action={<span className="text-[12px] text-ink-faint">90 days</span>} />
            {pages.length === 0 ? (
              <p className="text-sm text-ink-secondary">No dashboard page views recorded yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {pages.map((p) => (
                  <li key={p.route} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{p.label}</span>
                      <span className="block truncate font-mono text-[11px] text-ink-faint">{p.route}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold tabular-nums text-ink">{p.views}</span>
                      <span className="block text-[11px] text-ink-faint">{ago(p.lastAt)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader icon={Laptop} title="Devices" />
            {devices.length === 0 ? (
              <p className="text-sm text-ink-secondary">No signed-in devices right now.</p>
            ) : (
              <ul className="divide-y divide-line">
                {devices.map((d, i) => (
                  <li key={i} className="flex items-center gap-3 py-2">
                    {d.app ? <Smartphone className="size-4 text-success" /> : <Laptop className="size-4 text-ink-faint" />}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-ink">{d.label}</span>
                      <span className="block text-[11px] text-ink-faint">
                        {d.kind === "push" ? "registered" : "signed in"} {ago(d.firstAt)} · last {ago(d.lastAt)}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-[11px] text-ink-faint">Sessions end when people sign out or expire, so older devices drop off.</p>
          </Card>

          <Card>
            <CardHeader icon={Globe} title="Websites" />
            {websites.length === 0 ? (
              <p className="text-sm text-ink-secondary">No websites added.</p>
            ) : (
              <ul className="divide-y divide-line">
                {websites.map((w) => (
                  <li key={w.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-ink">{w.name}</span>
                      <span className="block truncate text-[11px] text-ink-faint">
                        {hostOf(w.url)} · added {ago(w.createdAt)}
                      </span>
                    </span>
                    <span className={cn("text-[12px]", w.lastScanAt ? "text-ink-secondary" : "text-warning-strong")}>
                      {w.lastScanAt ? `scanned ${ago(w.lastScanAt)}` : "never scanned"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {workspaces.length > 0 && (
              <p className="mt-3 text-[11px] text-ink-faint">
                {workspaces.map((w) => `${w.name} (${w.role.toLowerCase()}, ${w.plan})`).join(" · ")}
              </p>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
