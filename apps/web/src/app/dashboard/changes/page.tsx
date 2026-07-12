import Link from "next/link";
import { Download, GitCompareArrows } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import {
  CHANGE_CATEGORIES,
  CHANGE_SEVERITIES,
  changeEventWhere,
  parseChangeFilters,
  type ChangeFilterParams,
} from "@/lib/change-filters";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ChangesBulkList,
  type ChangeListRow,
} from "@/components/dashboard/changes-bulk-list";

function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname + u.search;
  } catch {
    return url;
  }
}

/** Build a filter href that keeps the other active filters. */
function buildHref(current: ChangeFilterParams, patch: Partial<ChangeFilterParams>): string {
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
  searchParams: Promise<ChangeFilterParams>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const sp = await searchParams;

  const filters = parseChangeFilters(sp);
  const { severity: severityFilter, category: categoryFilter, websiteId: websiteFilter, showResolved } = filters;

  // The list query is independent of the count/filter queries, so all three
  // run in parallel rather than waiting on the empty-state check.
  const [totalCount, websites, changes] = await Promise.all([
    prisma.changeEvent.count({ where: { website: { workspaceId: workspace.id } } }),
    prisma.website.findMany({
      where: { workspaceId: workspace.id, changeEvents: { some: {} } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.changeEvent.findMany({
      where: changeEventWhere(workspace.id, filters),
      include: {
        website: { select: { name: true, url: true } },
        monitoredPage: { select: { url: true } },
        currentSnapshot: { select: { errorCode: true } },
      },
      orderBy: [{ detectedAt: "desc" }],
      take: 100,
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

  const pill = (active: boolean) =>
    active
      ? "rounded-full bg-ink px-3.5 py-1.5 text-[13px] font-medium text-ink-inverse"
      : "rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink";

  // Export honors the exact same filters as the list (same query string).
  const exportHref = buildHref(sp, {}).replace("/dashboard/changes", "/api/changes/export");

  const rows: ChangeListRow[] = changes.map((c) => ({
    id: c.id,
    title: c.title,
    severity: c.severity,
    category: c.category,
    status: c.status,
    location: `${new URL(c.website.url).hostname}${
      c.monitoredPage ? pathOf(c.monitoredPage.url) : " · Site-wide"
    }`,
    canUpdateBaseline: !!c.currentSnapshot && !c.currentSnapshot.errorCode,
  }));

  return (
    <Card>
      <CardHeader
        title="Changes"
        action={
          <a
            href={exportHref}
            download
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
          >
            <Download className="size-3.5" aria-hidden />
            Export CSV
          </a>
        }
      />
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
          {CHANGE_SEVERITIES.map((s) => (
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
          {CHANGE_CATEGORIES.map((cat) => (
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
        severityFilter || categoryFilter || websiteFilter || showResolved ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-ink">Nothing matches these filters</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-secondary">
              Changes were detected, just none with this combination of severity, category,
              status, or site.
            </p>
            <Link
              href="/dashboard/changes"
              className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-ink">No open changes</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-secondary">
              You&apos;re all caught up — everything detected has been approved, resolved, or
              ignored.
            </p>
            <Link
              href={buildHref(sp, { status: "all" })}
              className="mt-3 inline-block text-[13px] font-medium text-primary hover:underline"
            >
              View all changes
            </Link>
          </div>
        )
      ) : (
        <ChangesBulkList changes={rows} />
      )}
    </Card>
  );
}
