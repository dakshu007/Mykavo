import Link from "next/link";
import { Globe, Plus } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { formatLimit } from "@/config/plans";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";

export default async function WebsitesPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const [websites, plan, websiteLimit] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      include: { _count: { select: { monitoredPages: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getWorkspacePlan(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
  ]);

  const atLimit = websites.length >= websiteLimit;

  if (websites.length === 0) {
    return (
      <EmptyState
        icon={Globe}
        title="Add your first website"
        description="Fluxen validates the URL, discovers your pages from sitemaps and homepage links, and lets you choose exactly which pages to monitor."
        action={
          <Link
            href="/dashboard/websites/new"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add website
          </Link>
        }
      />
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Websites (${websites.length} of ${formatLimit(websiteLimit)})`}
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
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
            >
              <Plus className="size-4" aria-hidden /> Add website
            </Link>
          )
        }
      />
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
            {websites.map((w) => (
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
                </td>
                <td className="py-4 pr-4">
                  <WebsiteStatusBadge status={w.status} />
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
    </Card>
  );
}
