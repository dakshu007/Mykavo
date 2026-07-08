import Link from "next/link";
import { GitCompareArrows } from "lucide-react";
import { prisma, type ChangeSeverity, type ChangeStatus } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ChangeCategoryChip,
  ChangeSeverityBadge,
  ChangeStatusBadge,
} from "@/components/dashboard/change-badges";
import { ChangeActions } from "@/components/dashboard/change-actions";

const SEVERITIES: ChangeSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];
const CATEGORIES = [
  "AVAILABILITY",
  "VISUAL",
  "SEO",
  "CONTENT",
  "LINKS",
  "SCRIPT",
  "PERFORMANCE",
  "CONVERSION",
] as const;
const OPEN_STATUSES: ChangeStatus[] = ["NEW", "REVIEWED"];

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

type SearchParams = {
  severity?: string;
  status?: string;
  category?: string;
  website?: string;
};

/** Build a filter href that keeps the other active filters. */
function buildHref(current: SearchParams, patch: Partial<SearchParams>): string {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v) params.set(k, v);
  }
  const qs = params.toString();
  return qs ? `/dashboard/changes?${qs}` : "/dashboard/changes";
}

export default async function ChangesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const severityFilter = SEVERITIES.includes(sp.severity as ChangeSeverity)
    ? (sp.severity as ChangeSeverity)
    : undefined;
  const categoryFilter = CATEGORIES.includes(sp.category as (typeof CATEGORIES)[number])
    ? (sp.category as (typeof CATEGORIES)[number])
    : undefined;
  const websiteFilter = sp.website;
  const showResolved = sp.status === "all";

  const [totalCount, websites] = await Promise.all([
    prisma.changeEvent.count({ where: { website: { workspaceId: workspace.id } } }),
    prisma.website.findMany({
      where: { workspaceId: workspace.id, changeEvents: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

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
      websiteId: websiteFilter,
      severity: severityFilter,
      category: categoryFilter,
      status: showResolved ? undefined : { in: OPEN_STATUSES },
    },
    include: {
      website: { select: { name: true, url: true } },
      monitoredPage: { select: { url: true } },
      currentSnapshot: { select: { errorCode: true } },
    },
    orderBy: [{ detectedAt: "desc" }],
    take: 100,
  });

  const pill = (active: boolean) =>
    active
      ? "rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-white"
      : "rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink";

  return (
    <Card>
      <CardHeader title="Changes" />
      <div className="mb-5 space-y-2.5">
        {/* Status + severity */}
        <div className="flex flex-wrap gap-1.5">
          <Link href={buildHref(sp, { status: undefined })} className={pill(!showResolved)}>
            Open
          </Link>
          <Link href={buildHref(sp, { status: "all" })} className={pill(showResolved)}>
            All
          </Link>
          <span className="mx-1 self-center text-line">|</span>
          <Link
            href={buildHref(sp, { severity: undefined })}
            className={pill(!severityFilter)}
          >
            Any severity
          </Link>
          {SEVERITIES.map((s) => (
            <Link key={s} href={buildHref(sp, { severity: s })} className={pill(severityFilter === s)}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Link>
          ))}
        </div>
        {/* Category + website */}
        <div className="flex flex-wrap gap-1.5">
          <Link
            href={buildHref(sp, { category: undefined })}
            className={pill(!categoryFilter)}
          >
            All categories
          </Link>
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={buildHref(sp, { category: cat })}
              className={pill(categoryFilter === cat)}
            >
              {cat.charAt(0) + cat.slice(1).toLowerCase()}
            </Link>
          ))}
          {websites.length > 1 && (
            <>
              <span className="mx-1 self-center text-line">|</span>
              <Link
                href={buildHref(sp, { website: undefined })}
                className={pill(!websiteFilter)}
              >
                All sites
              </Link>
              {websites.map((w) => (
                <Link
                  key={w.id}
                  href={buildHref(sp, { website: w.id })}
                  className={pill(websiteFilter === w.id)}
                >
                  {w.name}
                </Link>
              ))}
            </>
          )}
        </div>
      </div>
      {changes.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-secondary">
          No changes match this filter.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {changes.map((c) => {
            const isOpen = c.status === "NEW" || c.status === "REVIEWED";
            return (
              <li key={c.id} className="flex items-center gap-4 py-4">
                <ChangeSeverityBadge severity={c.severity} className="w-24 shrink-0 justify-center" />
                <Link href={`/dashboard/changes/${c.id}`} className="group min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                    {c.title}
                  </p>
                  <p className="truncate text-xs text-ink-faint">
                    <span className="font-mono">
                      {new URL(c.website.url).hostname}
                      {pathOf(c.monitoredPage.url)}
                    </span>
                  </p>
                </Link>
                <span className="hidden sm:block">
                  <ChangeCategoryChip category={c.category} />
                </span>
                {isOpen ? (
                  <ChangeActions
                    changeId={c.id}
                    status={c.status}
                    canUpdateBaseline={!!c.currentSnapshot && !c.currentSnapshot.errorCode}
                    layout="compact"
                  />
                ) : (
                  <ChangeStatusBadge status={c.status} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
