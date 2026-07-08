import Link from "next/link";
import { Bell, FileSearch, Globe, Plus, Radar, ShieldCheck } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader, IconChip } from "@/components/ui/card";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";

export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  const [websites, pageCount, baselineCount, openChanges] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      include: {
        _count: { select: { monitoredPages: true } },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.monitoredPage.count({ where: { website: { workspaceId: workspace.id } } }),
    prisma.baseline.count({
      where: { status: "ACTIVE", website: { workspaceId: workspace.id } },
    }),
    prisma.changeEvent.count({
      where: { website: { workspaceId: workspace.id }, status: { in: ["NEW", "REVIEWED"] } },
    }),
  ]);

  const stats = [
    { label: "Websites monitored", value: websites.length, icon: Globe },
    { label: "Pages monitored", value: pageCount, icon: FileSearch },
    { label: "Baselined pages", value: baselineCount, icon: ShieldCheck },
    { label: "Open changes", value: openChanges, icon: Bell },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader
              title={s.label}
              action={
                <IconChip className="bg-surface">
                  <s.icon className="size-4.5 text-ink-secondary" aria-hidden />
                </IconChip>
              }
            />
            <p className="text-5xl font-semibold tracking-tight text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      {websites.length === 0 ? (
        <div className="rounded-card bg-card p-8 text-center shadow-card">
          <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary-soft">
            <Radar className="size-6 text-primary" aria-hidden />
          </span>
          <h2 className="text-xl font-semibold tracking-tight text-ink">
            Add your first website
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">
            Point Fluxen at a website, and it discovers your pages from sitemaps and homepage
            links. Pick the pages that matter and you&apos;re ready for baseline monitoring.
          </p>
          <Link
            href="/dashboard/websites/new"
            className="mt-6 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add website
          </Link>
        </div>
      ) : (
        <Card>
          <CardHeader
            title="Your websites"
            action={
              <Link
                href="/dashboard/websites"
                className="text-[13px] font-medium text-primary hover:underline"
              >
                View all →
              </Link>
            }
          />
          <ul className="divide-y divide-line">
            {websites.slice(0, 5).map((w) => (
              <li key={w.id}>
                <Link
                  href={`/dashboard/websites/${w.id}`}
                  className="group flex items-center gap-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                      {w.name}
                    </p>
                    <p className="truncate font-mono text-xs text-ink-faint">
                      {new URL(w.url).hostname} · {w._count.monitoredPages} page
                      {w._count.monitoredPages === 1 ? "" : "s"}
                    </p>
                  </div>
                  <WebsiteStatusBadge status={w.status} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
