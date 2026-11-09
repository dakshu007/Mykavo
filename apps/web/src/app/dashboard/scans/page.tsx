import Link from "next/link";
import { Clock, Flag, Hand, History, Rocket, type LucideIcon } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ScanStatusBadge } from "@/components/dashboard/scan-status";
import { SiteFavicon } from "@/components/dashboard/site-favicon";

const TRIGGER: Record<string, { label: string; icon: LucideIcon }> = {
  BASELINE: { label: "Baseline", icon: Flag },
  MANUAL: { label: "Manual", icon: Hand },
  DEPLOY: { label: "Deploy check", icon: Rocket },
  SCHEDULED: { label: "Scheduled", icon: Clock },
};

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

function duration(start: Date | null, end: Date | null): string {
  if (!start || !end) return "-";
  const seconds = Math.round((end.getTime() - start.getTime()) / 1000);
  return seconds < 60 ? `${seconds}s` : `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export default async function ScansPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const scans = await prisma.scan.findMany({
    where: { website: { workspaceId: workspace.id } },
    include: { website: { select: { name: true, url: true } } },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  if (scans.length === 0) {
    return (
      <EmptyState
        icon={History}
        title="No scans yet"
        description="Run a baseline scan from a website's page to capture its first snapshot. Scan history - status, duration, pages, and failures - appears here."
        action={
          <Link
            href="/dashboard/websites"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Run your baseline scan
          </Link>
        }
      />
    );
  }

  // Group by day, newest first, so a long history reads as a log.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const now = new Date();
  const today = dayKey(now);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000));
  const groups: { key: string; label: string; scans: typeof scans }[] = [];
  for (const scan of scans) {
    const key = dayKey(scan.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      const date = scan.createdAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
      group = { key, label: key === today ? `Today · ${date}` : key === yesterday ? `Yesterday · ${date}` : date, scans: [] };
      groups.push(group);
    }
    group.scans.push(scan);
  }

  const totals = {
    completed: scans.filter((s) => s.status === "COMPLETED").length,
    partial: scans.filter((s) => s.status === "PARTIAL").length,
    failed: scans.filter((s) => s.status === "FAILED").length,
    running: scans.filter((s) => s.status === "RUNNING" || s.status === "QUEUED").length,
  };

  return (
    <Card>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Scan history</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">The last {scans.length} scans across your websites.</p>
        </div>
        <p className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.1em]">
          <span className="rounded-full bg-success-soft px-2.5 py-1 text-success-strong">{totals.completed} completed</span>
          {totals.partial > 0 && (
            <span className="rounded-full bg-warning-soft px-2.5 py-1 text-warning-strong">{totals.partial} partial</span>
          )}
          {totals.failed > 0 && (
            <span className="rounded-full bg-critical-soft px-2.5 py-1 text-critical-strong">{totals.failed} failed</span>
          )}
          {totals.running > 0 && (
            <span className="rounded-full bg-ink/[0.06] px-2.5 py-1 text-ink-secondary">{totals.running} running</span>
          )}
        </p>
      </div>

      <div className="space-y-6">
        {groups.map((group) => (
          <section key={group.key} aria-labelledby={`day-${group.key}`}>
            <h3
              id={`day-${group.key}`}
              className="mb-2 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint"
            >
              {group.label}
              <span className="h-px flex-1 bg-line" aria-hidden />
              <span>{group.scans.length} {group.scans.length === 1 ? "scan" : "scans"}</span>
            </h3>
            <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
              {group.scans.map((scan) => {
                const Trigger = TRIGGER[scan.triggerType]?.icon ?? Clock;
                const pct = scan.pagesRequested > 0 ? Math.round((scan.pagesScanned / scan.pagesRequested) * 100) : 0;
                return (
                  <li key={scan.id}>
                    <Link
                      href={`/dashboard/scans/${scan.id}`}
                      className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 transition-colors hover:bg-ink/[0.025] md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.2fr)_110px_120px_70px_76px]"
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <SiteFavicon url={scan.website.url} name={scan.website.name} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-ink group-hover:text-accent">
                            {scan.website.name}
                          </span>
                          <span className="block truncate font-mono text-xs text-ink-faint">
                            {hostOf(scan.website.url)}
                          </span>
                        </span>
                      </span>
                      <span className="hidden min-w-0 items-center gap-2 text-[13px] text-ink-secondary md:flex">
                        <Trigger className="size-3.5 shrink-0 text-ink-faint" aria-hidden />
                        <span className="shrink-0">{TRIGGER[scan.triggerType]?.label ?? "Scheduled"}</span>
                        {scan.note && <span className="truncate font-mono text-[11px] text-ink-faint">{scan.note}</span>}
                      </span>
                      <span className="justify-self-end md:justify-self-start">
                        <ScanStatusBadge status={scan.status} />
                      </span>
                      <span className="hidden md:block">
                        <span className="flex items-baseline gap-1.5 text-[13px] text-ink-secondary">
                          {scan.pagesScanned}/{scan.pagesRequested} pages
                        </span>
                        <span className="mt-1 block h-1 w-full overflow-hidden rounded-full bg-ink/[0.07]" aria-hidden>
                          <span
                            className={`block h-full rounded-full ${scan.pagesFailed > 0 ? "bg-warning" : "bg-success"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                        {scan.pagesFailed > 0 && (
                          <span className="mt-0.5 block text-[11px] text-critical-strong">{scan.pagesFailed} failed</span>
                        )}
                      </span>
                      <span className="hidden font-mono text-[12px] text-ink-secondary md:block">
                        {duration(scan.startedAt, scan.completedAt)}
                      </span>
                      <span className="col-span-2 font-mono text-[12px] text-ink-faint md:col-span-1 md:text-right">
                        {scan.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" })}
                        <span className="md:hidden">
                          {" "}· {TRIGGER[scan.triggerType]?.label ?? "Scheduled"} · {scan.pagesScanned}/{scan.pagesRequested} pages ·{" "}
                          {duration(scan.startedAt, scan.completedAt)}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </Card>
  );
}
