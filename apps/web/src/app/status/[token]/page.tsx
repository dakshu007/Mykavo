import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { ExternalLink } from "lucide-react";
import { prisma, getLatestHealthCheck, getUptimeStats } from "@mykavo/database";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import {
  buildDayBuckets,
  dayLevel,
  dayTooltip,
  formatDuration,
  formatUptime,
  type DayLevel,
  type DayRollupRow,
} from "@/lib/status-page";

/**
 * Public status page (no auth). The opaque publicToken is the ONLY
 * identifier - website ids are never exposed - and statusPageEnabled gates
 * access independently of the badge. Health data changes every 5 minutes
 * (worker sweep), so the page is fully dynamic; an open tab self-refreshes
 * via meta refresh.
 */

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ token: string }> };

const WINDOW_DAYS = 90;

/** Token → website, deduped between generateMetadata and the page render. */
const getStatusWebsite = cache(async (token: string) =>
  prisma.website.findFirst({
    where: { publicToken: token, statusPageEnabled: true },
    select: { id: true, name: true, url: true },
  }),
);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params;
  const website = await getStatusWebsite(token);
  // Status pages must never compete with the marketing site in search.
  const robots = { index: false, follow: false } as const;
  if (!website) return { robots };
  return {
    title: { absolute: `${website.name} status - MyKavo` },
    description: `Live availability and uptime history for ${website.name}.`,
    robots,
  };
}

/** Bar fill per day level - always paired with the text legend below. */
const DAY_BAR_CLASS: Record<DayLevel, string> = {
  operational: "bg-success",
  degraded: "bg-warning",
  down: "bg-critical",
  empty: "bg-line",
};

const LEGEND: { level: DayLevel; label: string }[] = [
  { level: "operational", label: "≥ 99.5%" },
  { level: "degraded", label: "95–99.5%" },
  { level: "down", label: "< 95%" },
  { level: "empty", label: "No data" },
];

function utcDayTime(date: Date): string {
  return `${date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  })} UTC`;
}

export default async function PublicStatusPage({ params }: Params) {
  const { token } = await params;
  const website = await getStatusWebsite(token);
  if (!website) notFound();

  const now = new Date();
  const since24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const since7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const since90d = new Date(now.getTime() - WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // The day rollup is ONE grouped aggregate over the (websiteId, checkedAt)
  // index. Parameterized tagged template - no user input reaches the SQL
  // (the token was resolved to a website id above).
  const [latest, uptime24h, uptime7d, uptime90d, rollup, incidents] =
    await Promise.all([
      getLatestHealthCheck(prisma, website.id),
      getUptimeStats(prisma, { websiteId: website.id, since: since24h }),
      getUptimeStats(prisma, { websiteId: website.id, since: since7d }),
      getUptimeStats(prisma, { websiteId: website.id, since: since90d }),
      prisma.$queryRaw<DayRollupRow[]>`
        SELECT to_char(date_trunc('day', "checkedAt"), 'YYYY-MM-DD') AS day,
               count(*)::int AS total,
               count(*) FILTER (WHERE "up")::int AS up
        FROM "health_check"
        WHERE "websiteId" = ${website.id} AND "checkedAt" >= ${since90d}
        GROUP BY 1
        ORDER BY 1 ASC
      `,
      // Public visitors care about downtime, not SSL housekeeping. Ongoing
      // incidents show even if they opened before the window.
      prisma.healthIncident.findMany({
        where: {
          websiteId: website.id,
          kind: "DOWN",
          OR: [{ openedAt: { gte: since90d } }, { resolvedAt: null }],
        },
        orderBy: { openedAt: "desc" },
        take: 50,
        select: { id: true, openedAt: true, resolvedAt: true, detail: true },
      }),
    ]);

  const hostname = new URL(website.url).hostname;
  const buckets = buildDayBuckets(rollup, WINDOW_DAYS, now);

  const banner =
    latest === null
      ? {
          label: "Status unknown",
          sub: "No checks recorded yet.",
          box: "bg-info-soft",
          dot: "bg-ink-faint",
        }
      : latest.up
        ? {
            label: "All systems operational",
            sub: `Last checked ${utcDayTime(latest.checkedAt)}`,
            box: "bg-success-soft",
            dot: "bg-success",
          }
        : {
            label: "Experiencing issues",
            sub: `Last checked ${utcDayTime(latest.checkedAt)}`,
            box: "bg-critical-soft",
            dot: "bg-critical",
          };

  // Group incidents by UTC day for visual scanning.
  const incidentGroups: { day: string; items: typeof incidents }[] = [];
  for (const incident of incidents) {
    const dayLabel = incident.openedAt.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    });
    const group = incidentGroups[incidentGroups.length - 1];
    if (group && group.day === dayLabel) group.items.push(incident);
    else incidentGroups.push({ day: dayLabel, items: [incident] });
  }

  const stats: { label: string; value: string; sub?: string }[] = [
    { label: "Uptime · 24h", value: formatUptime(uptime24h.uptimePercent) },
    { label: "Uptime · 7d", value: formatUptime(uptime7d.uptimePercent) },
    { label: `Uptime · ${WINDOW_DAYS}d`, value: formatUptime(uptime90d.uptimePercent) },
    {
      label: "Avg response · 7d",
      value:
        uptime7d.avgResponseTimeMs === null
          ? "-"
          : `${Math.round(uptime7d.avgResponseTimeMs)} ms`,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 space-y-6 px-4 py-10 sm:px-6 sm:py-14">
      {/* React hoists this into <head>: an open tab stays current without JS. */}
      <meta httpEquiv="refresh" content="120" />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">
          {website.name}
        </h1>
        <a
          href={website.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-secondary hover:text-primary"
        >
          {hostname}
          <ExternalLink className="size-3" aria-hidden />
        </a>
      </header>

      <section
        className={cn("rounded-card px-6 py-5 shadow-card", banner.box)}
        aria-live="polite"
      >
        <p className="flex items-center gap-3 text-lg font-semibold tracking-tight text-ink sm:text-xl">
          <span
            aria-hidden
            className={cn("inline-block size-3 shrink-0 rounded-full", banner.dot)}
          />
          {banner.label}
        </p>
        <p className="mt-1 pl-6 text-[13px] text-ink-secondary">{banner.sub}</p>
      </section>

      <section className="rounded-card bg-card p-6 shadow-card">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold text-ink">
            Uptime - last {WINDOW_DAYS} days
          </h2>
          <p className="text-sm font-semibold text-ink">
            {formatUptime(uptime90d.uptimePercent)}
            <span className="ml-1.5 font-normal text-ink-faint">overall</span>
          </p>
        </div>

        <div
          role="img"
          aria-label={`Daily uptime for the last ${WINDOW_DAYS} days. Overall uptime ${formatUptime(uptime90d.uptimePercent)}.`}
          className="flex items-stretch gap-[2px]"
        >
          {buckets.map((bucket, i) => (
            <div
              key={bucket.date}
              title={dayTooltip(bucket)}
              className={cn(
                "h-8 min-w-0 flex-1 rounded-[3px]",
                DAY_BAR_CLASS[dayLevel(bucket.uptimePercent)],
                // Small screens show the most recent 30 days (CSS only).
                i < buckets.length - 30 && "hidden sm:block",
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-ink-faint">
          <span>
            <span className="sm:hidden">30 days ago</span>
            <span className="hidden sm:inline">{WINDOW_DAYS} days ago</span>
          </span>
          <span>Today</span>
        </div>

        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line pt-3 text-[11px] text-ink-faint">
          {LEGEND.map((item) => (
            <li key={item.level} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden
                className={cn("inline-block size-2 rounded-[2px]", DAY_BAR_CLASS[item.level])}
              />
              {item.label}
            </li>
          ))}
        </ul>
      </section>

      <section className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-card bg-card p-5 shadow-card">
            <p className="label-micro mb-1.5">{stat.label}</p>
            <p className="text-xl font-semibold tracking-tight text-ink">
              {stat.value}
            </p>
          </div>
        ))}
      </section>

      <section className="rounded-card bg-card p-6 shadow-card">
        <h2 className="mb-4 text-[15px] font-semibold text-ink">
          Incidents - last {WINDOW_DAYS} days
        </h2>
        {incidentGroups.length === 0 ? (
          <p className="py-2 text-sm text-ink-secondary">
            No incidents in the last {WINDOW_DAYS} days.
          </p>
        ) : (
          <div className="space-y-5">
            {incidentGroups.map((group) => (
              <div key={group.day}>
                <p className="label-micro mb-2">{group.day}</p>
                <ul className="divide-y divide-line">
                  {group.items.map((incident) => (
                    <li
                      key={incident.id}
                      className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2.5"
                    >
                      <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                        <span
                          aria-hidden
                          className="inline-block size-2 shrink-0 rounded-full bg-critical"
                        />
                        Downtime
                      </span>
                      <span className="text-[13px] text-ink-secondary">
                        {incident.detail ?? "No response"}
                      </span>
                      <span className="ml-auto inline-flex items-center gap-2 text-[13px] text-ink-faint">
                        {utcDayTime(incident.openedAt)}
                        {incident.resolvedAt ? (
                          <span className="font-medium text-ink-secondary">
                            {formatDuration(
                              incident.resolvedAt.getTime() - incident.openedAt.getTime(),
                            )}
                          </span>
                        ) : (
                          <span className="rounded-full bg-critical-soft px-2 py-0.5 text-[11px] font-semibold text-critical">
                            Ongoing
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="flex justify-center pt-2 pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[13px] text-ink-faint transition-colors hover:text-ink"
        >
          Monitored by
          <Logo markSize={18} wordmarkClassName="text-[14px]" />
        </Link>
      </footer>
    </main>
  );
}
