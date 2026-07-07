import {
  ArrowUpRight,
  Bell,
  CalendarClock,
  Globe,
  Mail,
  Radar,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { categoryBreakdown, changes, upcomingScans } from "./data";

/** Overview screen — composition mirrors the approved dashboard reference. */
export function PreviewOverview() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      {/* Main column */}
      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-3">
          {/* Monitoring summary — white card (reference: profile card) */}
          <Card className="md:col-span-1">
            <CardHeader
              title="Monitoring"
              action={
                <IconChip className="bg-surface">
                  <Radar className="size-4.5 text-ink-secondary" aria-hidden />
                </IconChip>
              }
            />
            <p className="text-5xl font-semibold tracking-tight text-ink">11</p>
            <p className="mt-1 text-sm text-ink-secondary">websites monitored</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink">
                <Globe className="size-3.5 text-primary" aria-hidden /> 143 pages
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink">
                <ShieldCheck className="size-3.5 text-success" aria-hidden /> 9 healthy
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-ink">
                <Bell className="size-3.5 text-orange" aria-hidden /> 2 need attention
              </span>
            </div>
          </Card>

          {/* Gradient stat tiles (reference: prioritized / additional tasks) */}
          <div className="gradient-coral rounded-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <p className="text-[15px] font-semibold text-ink">
                Open
                <br />
                changes
              </p>
              <IconChip>
                <Bell className="size-4.5" aria-hidden />
              </IconChip>
            </div>
            <p className="mt-10 text-5xl font-semibold tracking-tight text-ink">14</p>
            <p className="mt-1 text-sm font-medium text-ink-secondary">3 critical · 2 high</p>
          </div>

          <div className="gradient-mint rounded-card p-6 shadow-card">
            <div className="flex items-start justify-between">
              <p className="text-[15px] font-semibold text-ink">
                Scans this
                <br />
                week
              </p>
              <IconChip>
                <CalendarClock className="size-4.5" aria-hidden />
              </IconChip>
            </div>
            <p className="mt-10 text-5xl font-semibold tracking-tight text-ink">68</p>
            <p className="mt-1 text-sm font-medium text-ink-secondary">100% completed on time</p>
          </div>
        </div>

        {/* Alert channels bar (reference: trackers connected) */}
        <div className="flex items-center justify-between rounded-card bg-[#e6e8ef] px-6 py-4">
          <div>
            <p className="text-[15px] font-semibold text-ink">Alert channels</p>
            <p className="text-[13px] text-ink-secondary">Email connected · Slack coming soon</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-card shadow-card">
              <Mail className="size-4.5 text-primary" aria-hidden />
            </span>
            <span className="inline-flex size-10 items-center justify-center rounded-full bg-card/60 text-ink-faint shadow-card">
              <span className="text-[11px] font-semibold">+3</span>
            </span>
          </div>
        </div>

        {/* Recent changes (reference: focusing section) */}
        <Card>
          <CardHeader
            title={
              <span>
                Recent changes
                <span className="ml-2 text-[13px] font-normal text-ink-faint">last 24 hours</span>
              </span>
            }
            action={
              <span className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary">
                All websites
              </span>
            }
          />
          <ul className="divide-y divide-line">
            {changes.slice(0, 5).map((c) => (
              <li key={c.title} className="flex items-center gap-4 py-3.5">
                <SeverityBadge severity={c.severity} className="w-24 justify-center" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                  <p className="truncate font-mono text-xs text-ink-faint">
                    {c.website}
                    {c.page}
                  </p>
                </div>
                <span className="hidden text-xs text-ink-faint sm:block">{c.detected}</span>
                <ArrowUpRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {/* Right rail (reference: my meetings + developed areas) */}
      <div className="space-y-6">
        <Card>
          <CardHeader
            title="Upcoming scans"
            action={
              <IconChip className="bg-surface">
                <CalendarClock className="size-4.5 text-ink-secondary" aria-hidden />
              </IconChip>
            }
          />
          <ul className="divide-y divide-line">
            {upcomingScans.map((s) => (
              <li key={s.website + s.time} className="flex items-center gap-4 py-4">
                <div className="w-20 shrink-0">
                  <p className="text-xs text-ink-faint">{s.day}</p>
                  <p className="text-sm font-semibold text-ink">{s.time}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{s.website}</p>
                  <p className="truncate text-xs text-ink-faint">{s.detail}</p>
                </div>
                <ArrowUpRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </li>
            ))}
          </ul>
          <p className="pt-2 text-[13px] font-medium text-ink-secondary">See all scans →</p>
        </Card>

        <Card>
          <CardHeader title="Change categories" />
          <p className="-mt-3 mb-5 text-[13px] text-ink-faint">Share of changes, last 30 days</p>
          <ul className="space-y-4">
            {categoryBreakdown.map((c) => (
              <li key={c.label} className="flex items-center gap-3">
                <span className="w-28 text-sm font-medium text-ink">{c.label}</span>
                <span className="h-2 flex-1 overflow-hidden rounded-full bg-surface">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${c.pct}%` }}
                  />
                </span>
                <span className="w-10 text-right text-[13px] font-medium text-ink-secondary">
                  {c.pct}%
                </span>
                <span
                  className={cn(
                    "inline-flex size-6 items-center justify-center rounded-full text-white",
                    c.trend === "up" ? "bg-primary" : "bg-orange",
                  )}
                >
                  {c.trend === "up" ? (
                    <TrendingUp className="size-3.5" aria-hidden />
                  ) : (
                    <TrendingDown className="size-3.5" aria-hidden />
                  )}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
