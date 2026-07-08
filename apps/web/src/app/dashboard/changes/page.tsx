import Link from "next/link";
import { ArrowUpRight, GitCompareArrows } from "lucide-react";
import { prisma, type ChangeSeverity, type ChangeStatus } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ChangeCategoryChip,
  ChangeSeverityBadge,
  ChangeStatusBadge,
} from "@/components/dashboard/change-badges";

const SEVERITIES: ChangeSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const OPEN_STATUSES: ChangeStatus[] = ["NEW", "REVIEWED"];

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<{ severity?: string; status?: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const severityFilter = SEVERITIES.includes(sp.severity as ChangeSeverity)
    ? (sp.severity as ChangeSeverity)
    : undefined;
  const showResolved = sp.status === "all";

  const totalCount = await prisma.changeEvent.count({
    where: { website: { workspaceId: workspace.id } },
  });

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={GitCompareArrows}
        title="No changes detected yet"
        description="Once a website is scanned again after its baseline, meaningful changes — visual, SEO, links, scripts, performance — appear here with severity and before-and-after views."
      />
    );
  }

  const changes = await prisma.changeEvent.findMany({
    where: {
      website: { workspaceId: workspace.id },
      severity: severityFilter,
      status: showResolved ? undefined : { in: OPEN_STATUSES },
    },
    include: {
      website: { select: { name: true, url: true } },
      monitoredPage: { select: { url: true } },
    },
    orderBy: [{ detectedAt: "desc" }],
    take: 100,
  });

  const filters: Array<{ label: string; href: string; active: boolean }> = [
    { label: "Open", href: "/dashboard/changes", active: !showResolved && !severityFilter },
    { label: "All", href: "/dashboard/changes?status=all", active: showResolved && !severityFilter },
    ...SEVERITIES.map((s) => ({
      label: s.charAt(0) + s.slice(1).toLowerCase(),
      href: `/dashboard/changes?severity=${s}${showResolved ? "&status=all" : ""}`,
      active: severityFilter === s,
    })),
  ];

  return (
    <Card>
      <CardHeader
        title="Changes"
        action={
          <div className="flex flex-wrap gap-1.5">
            {filters.map((f) => (
              <Link
                key={f.label}
                href={f.href}
                className={
                  f.active
                    ? "rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-white"
                    : "rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
                }
              >
                {f.label}
              </Link>
            ))}
          </div>
        }
      />
      {changes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-secondary">
          No changes match this filter.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {changes.map((c) => (
            <li key={c.id}>
              <Link href={`/dashboard/changes/${c.id}`} className="flex items-center gap-4 py-4">
                <ChangeSeverityBadge severity={c.severity} className="w-24 shrink-0 justify-center" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.title}</p>
                  <p className="truncate text-xs text-ink-faint">
                    <span className="font-mono">
                      {new URL(c.website.url).hostname}
                      {pathOf(c.monitoredPage.url)}
                    </span>
                  </p>
                </div>
                <ChangeCategoryChip category={c.category} />
                <span className="hidden md:block">
                  <ChangeStatusBadge status={c.status} />
                </span>
                <span className="hidden w-24 text-right text-xs text-ink-faint lg:block">
                  {c.detectedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                </span>
                <ArrowUpRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
