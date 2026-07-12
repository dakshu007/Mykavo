import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { matchesTagFilter, parseTagFilterParam, parseTags } from "@/lib/tags";
import { formatLimit } from "@/config/plans";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";

/** How many tag chips a table row shows before collapsing into "+N". */
const ROW_TAG_LIMIT = 3;

/** Shareable filter URL: no filter = bare path, else ?tag=a,b (comma list). */
function tagFilterHref(activeTags: string[]): string {
  return activeTags.length === 0
    ? "/dashboard/websites"
    : `/dashboard/websites?tag=${encodeURIComponent(activeTags.join(","))}`;
}

export default async function WebsitesPage({
  searchParams,
}: {
  searchParams: Promise<{ tag?: string | string[] }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [websites, plan, websiteLimit, { tag }] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      include: { _count: { select: { monitoredPages: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getWorkspacePlan(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    searchParams,
  ]);

  const atLimit = websites.length >= websiteLimit;
  // Maintenance window chip — a past muteAlertsUntil simply means not muted.
  const now = new Date();

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="Add your first website"
        description="Fluxen validates the URL, discovers your pages from sitemaps and homepage links, and lets you choose exactly which pages to monitor."
        action={
          <Link
            href="/dashboard/websites/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add website
          </Link>
        }
      />
    );
  }

  // Tag filtering happens on the already-loaded array — workspace site
  // counts are small, and the filter bar needs every site's tags anyway.
  const tagged = websites.map((w) => ({ ...w, tags: parseTags(w.tags) }));
  const tagCounts = new Map<string, number>();
  for (const w of tagged) {
    for (const t of w.tags) tagCounts.set(t, (tagCounts.get(t) ?? 0) + 1);
  }
  const allTags = [...tagCounts.keys()].sort();
  // Only honor tags that actually exist so stale URLs don't dead-end.
  const activeTags = parseTagFilterParam(tag).filter((t) => tagCounts.has(t));
  const filtered = tagged.filter((w) => matchesTagFilter(w.tags, activeTags));

  return (
    <div className="space-y-4">
      {allTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filter by tag">
          <Link
            href={tagFilterHref([])}
            className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
              activeTags.length === 0
                ? "bg-primary text-primary-contrast"
                : "bg-surface text-ink-secondary hover:text-primary"
            }`}
          >
            All
          </Link>
          {allTags.map((t) => {
            const active = activeTags.includes(t);
            const next = active
              ? activeTags.filter((a) => a !== t)
              : [...activeTags, t];
            return (
              <Link
                key={t}
                href={tagFilterHref(next)}
                aria-pressed={active}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-contrast"
                    : "bg-primary-soft text-primary hover:bg-primary hover:text-primary-contrast"
                }`}
              >
                {t}
                <span className={active ? "ml-1.5 text-primary-contrast/70" : "ml-1.5 text-primary/60"}>
                  {tagCounts.get(t)}
                </span>
              </Link>
            );
          })}
        </div>
      )}

      <Card>
        <CardHeader
          title={
            activeTags.length > 0
              ? `Websites (${filtered.length} of ${websites.length})`
              : `Websites (${websites.length} of ${formatLimit(websiteLimit)})`
          }
          action={
            atLimit ? (
              <Link
                href="/dashboard/billing"
                className="rounded-full bg-surface px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-primary"
              >
                {plan.id === "pro" ? "Add capacity" : `${plan.name} limit reached — upgrade`}
              </Link>
            ) : (
              <Link
                href="/dashboard/websites/new"
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                <Plus className="size-4" aria-hidden /> Add website
              </Link>
            )
          }
        />
        {filtered.length === 0 ? (
          <p className="py-6 text-sm text-ink-secondary">
            No websites with this tag.{" "}
            <Link
              href={tagFilterHref([])}
              className="font-medium text-primary hover:underline"
            >
              Clear filters
            </Link>
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-140 text-left">
              <thead>
                <tr className="label-micro border-b border-line">
                  <th className="py-3 pr-4 font-semibold">Website</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Pages</th>
                  <th className="py-3 pr-4 font-semibold">Frequency</th>
                  <th className="py-3 font-semibold">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map((w) => (
                  <tr key={w.id}>
                    <td className="py-4 pr-4">
                      <Link href={`/dashboard/websites/${w.id}`} className="group block">
                        <p className="text-sm font-medium text-ink group-hover:text-primary">
                          {w.name}
                        </p>
                        <p className="font-mono text-xs text-ink-faint">
                          {new URL(w.url).hostname}
                        </p>
                      </Link>
                      {w.tags.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                          {w.tags.slice(0, ROW_TAG_LIMIT).map((t) => (
                            <span
                              key={t}
                              className="rounded-full bg-primary-soft px-2 py-0.5 text-[11px] font-medium text-primary"
                            >
                              {t}
                            </span>
                          ))}
                          {w.tags.length > ROW_TAG_LIMIT && (
                            <span className="text-[11px] font-medium text-ink-faint">
                              +{w.tags.length - ROW_TAG_LIMIT}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-4 pr-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <WebsiteStatusBadge status={w.status} />
                        {w.muteAlertsUntil && w.muteAlertsUntil > now && (
                          <span className="rounded-full bg-warning-soft px-2.5 py-0.5 text-[11px] font-semibold text-warning-strong">
                            Muted
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-sm text-ink-secondary">
                      {w._count.monitoredPages}
                    </td>
                    <td className="py-4 pr-4 text-sm text-ink-secondary">
                      {w.scanFrequency === "DAILY" ? "Daily" : "Weekly"}
                    </td>
                    <td className="py-4 text-sm text-ink-secondary">
                      {w.createdAt.toLocaleDateString("en-US", { dateStyle: "medium" })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
