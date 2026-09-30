import Link from "next/link";
import { ArrowRight, Download, GitCompareArrows } from "lucide-react";
import { prisma, OPEN_STATUSES, type ChangeSeverity } from "@mykavo/database";
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
import { ChangeFilterBar } from "@/components/dashboard/change-filter-bar";
import { ChangeSeverityBadge } from "@/components/dashboard/change-badges";

/** `?website=all` - every site in one list, the opt-in the picker offers. */
const ALL_SITES = "all";

const titleCase = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

function hostOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

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

  const [totalCount, websites] = await Promise.all([
    prisma.changeEvent.count({ where: { website: { workspaceId: workspace.id } } }),
    prisma.website.findMany({
      where: { workspaceId: workspace.id, changeEvents: { some: {} } },
      select: { id: true, name: true, url: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (totalCount === 0) {
    return (
      <EmptyState
        icon={GitCompareArrows}
        title="No changes detected yet"
        description="Once a website is scanned again after its baseline, meaningful changes - visual, SEO, links, scripts, performance - appear here with severity and before-and-after views."
      />
    );
  }

  // One website at a time. With a single site there is nothing to choose;
  // with several and none picked, ask first instead of mixing every site's
  // changes into one long list.
  const requested = sp.website;
  const known = websites.some((w) => w.id === requested);
  const siteId =
    websites.length === 1 ? websites[0].id : requested === ALL_SITES ? ALL_SITES : known ? requested! : null;

  if (!siteId) {
    return <SitePicker workspaceId={workspace.id} websites={websites} />;
  }

  const params: ChangeFilterParams = { ...sp, website: siteId === ALL_SITES ? ALL_SITES : siteId };
  const filters = parseChangeFilters(params);
  const { severity: severityFilter, category: categoryFilter, showResolved } = filters;

  const changes = await prisma.changeEvent.findMany({
    where: changeEventWhere(workspace.id, filters),
    include: {
      website: { select: { name: true, url: true } },
      monitoredPage: { select: { url: true } },
      currentSnapshot: { select: { errorCode: true } },
    },
    orderBy: [{ detectedAt: "desc" }],
    take: 100,
  });

  // Export honors the exact same filters as the list (same query string).
  const exportHref = buildHref(params, {}).replace("/dashboard/changes", "/api/changes/export");
  const selected = websites.find((w) => w.id === siteId);
  const anyFilter = Boolean(severityFilter || categoryFilter || showResolved);

  const rows: ChangeListRow[] = changes.map((c) => ({
    id: c.id,
    title: c.title,
    severity: c.severity,
    category: c.category,
    status: c.status,
    // Inside one site the host is noise - show the page path only.
    location: selected
      ? c.monitoredPage
        ? pathOf(c.monitoredPage.url)
        : "Site-wide"
      : `${hostOf(c.website.url)}${c.monitoredPage ? pathOf(c.monitoredPage.url) : " · Site-wide"}`,
    canUpdateBaseline: !!c.currentSnapshot && !c.currentSnapshot.errorCode,
  }));

  return (
    <Card>
      <CardHeader
        title={selected ? `Changes on ${selected.name}` : "Changes on all websites"}
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
      <div className="mb-5">
        <ChangeFilterBar
          site={siteId}
          sites={[
            ...websites.map((w) => ({ value: w.id, label: w.name })),
            { value: ALL_SITES, label: "All websites" },
          ]}
          showResolved={showResolved}
          severity={severityFilter ?? ""}
          category={categoryFilter ?? ""}
          severityOptions={[
            { value: "", label: "Any severity" },
            ...CHANGE_SEVERITIES.map((v) => ({ value: v, label: titleCase(v) })),
          ]}
          categoryOptions={[
            { value: "", label: "Any category" },
            ...CHANGE_CATEGORIES.map((v) => ({ value: v, label: v === "SEO" ? "SEO" : titleCase(v) })),
          ]}
          hrefs={{
            base: buildHref(params, {}),
            clear: anyFilter ? buildHref({ website: params.website }, {}) : null,
          }}
        />
      </div>
      {changes.length === 0 ? (
        anyFilter ? (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-ink">Nothing matches these filters</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-secondary">
              Changes were detected, just none with this combination of severity, category or
              status.
            </p>
            <Link
              href={buildHref({ website: params.website }, {})}
              className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
            >
              Clear filters
            </Link>
          </div>
        ) : (
          <div className="py-10 text-center">
            <p className="text-sm font-medium text-ink">No open changes</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-ink-secondary">
              You&apos;re all caught up - everything detected has been approved, resolved, or
              ignored.
            </p>
            <Link
              href={buildHref(params, { status: "all" })}
              className="mt-3 inline-block text-[13px] font-medium text-accent hover:underline"
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

const SEVERITY_ORDER: ChangeSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"];

/**
 * Step one when a workspace has several websites: pick the one to review.
 * Each card says how much is waiting there, worst first, so the choice makes
 * itself - the site that needs attention is at the top.
 */
async function SitePicker({
  workspaceId,
  websites,
}: {
  workspaceId: string;
  websites: Array<{ id: string; name: string; url: string }>;
}) {
  const [bySeverity, latest] = await Promise.all([
    prisma.changeEvent.groupBy({
      by: ["websiteId", "severity"],
      where: { website: { workspaceId }, status: { in: OPEN_STATUSES } },
      _count: { _all: true },
    }),
    prisma.changeEvent.groupBy({
      by: ["websiteId"],
      where: { website: { workspaceId } },
      _max: { detectedAt: true },
    }),
  ]);

  const cards = websites
    .map((w) => {
      const counts = new Map<ChangeSeverity, number>();
      for (const row of bySeverity) {
        if (row.websiteId === w.id) counts.set(row.severity, row._count._all);
      }
      const open = [...counts.values()].reduce((a, b) => a + b, 0);
      const worst = SEVERITY_ORDER.find((sev) => (counts.get(sev) ?? 0) > 0) ?? null;
      const last = latest.find((l) => l.websiteId === w.id)?._max.detectedAt ?? null;
      return { ...w, open, worst, counts, last };
    })
    .sort(
      (a, b) =>
        (a.worst ? SEVERITY_ORDER.indexOf(a.worst) : 9) - (b.worst ? SEVERITY_ORDER.indexOf(b.worst) : 9) ||
        b.open - a.open ||
        a.name.localeCompare(b.name),
    );

  const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });

  return (
    <Card>
      <CardHeader title="Changes" />
      <p className="-mt-2 mb-5 text-sm text-ink-secondary">
        Choose a website to review its changes.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((c) => (
          <li key={c.id}>
            <Link
              href={`/dashboard/changes?website=${c.id}`}
              className="group flex h-full flex-col gap-3 rounded-field border border-line p-4 transition-colors hover:border-ink/25 hover:bg-ink/[0.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{c.name}</p>
                  <p className="truncate font-mono text-xs text-ink-faint">{hostOf(c.url)}</p>
                </div>
                <ArrowRight
                  className="mt-1 size-4 shrink-0 text-ink-faint transition-transform group-hover:translate-x-0.5 group-hover:text-ink"
                  aria-hidden
                />
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-2">
                {c.worst ? (
                  <>
                    <ChangeSeverityBadge severity={c.worst} />
                    <span className="text-[13px] text-ink-secondary">
                      {c.open} open {c.open === 1 ? "change" : "changes"}
                    </span>
                  </>
                ) : (
                  <span className="text-[13px] text-ink-secondary">All caught up</span>
                )}
                {c.last && (
                  <span className="ml-auto text-xs text-ink-faint">Last {dateFmt.format(c.last)}</span>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-5 text-center text-[13px] text-ink-faint">
        Prefer one list?{" "}
        <Link href={`/dashboard/changes?website=${ALL_SITES}`} className="font-medium text-accent hover:underline">
          See every website together
        </Link>
      </p>
    </Card>
  );
}
