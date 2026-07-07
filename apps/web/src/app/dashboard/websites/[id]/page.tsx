import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@fluxen/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";
import { WebsiteActions } from "./website-actions";

export default async function WebsiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const website = await prisma.website.findFirst({
    where: { id, workspaceId: workspace.id },
    include: { monitoredPages: { orderBy: { createdAt: "asc" } } },
  });
  if (!website) notFound();

  const hostname = new URL(website.url).hostname;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/websites"
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Websites
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
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
          </div>
          <WebsiteStatusBadge status={website.status} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <p className="label-micro mb-2">Monitored pages</p>
          <p className="text-4xl font-semibold tracking-tight text-ink">
            {website.monitoredPages.length}
          </p>
        </Card>
        <Card>
          <p className="label-micro mb-2">Scan frequency</p>
          <p className="text-4xl font-semibold tracking-tight text-ink">
            {website.scanFrequency === "DAILY" ? "Daily" : "Weekly"}
          </p>
        </Card>
        <Card>
          <p className="label-micro mb-2">Last scan</p>
          <p className="text-4xl font-semibold tracking-tight text-ink">
            {website.lastScanAt
              ? website.lastScanAt.toLocaleDateString("en-US", { dateStyle: "medium" })
              : "—"}
          </p>
          {!website.lastScanAt && (
            <p className="mt-1 text-[13px] text-ink-faint">
              Baseline scanning arrives in the next release.
            </p>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Monitored pages"
          action={
            <Link
              href={`/dashboard/websites/${website.id}/pages`}
              className="rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
            >
              Edit pages
            </Link>
          }
        />
        {website.monitoredPages.length === 0 ? (
          <p className="py-4 text-sm text-ink-secondary">
            No pages selected yet.{" "}
            <Link
              href={`/dashboard/websites/${website.id}/pages`}
              className="font-medium text-primary hover:underline"
            >
              Choose pages to monitor →
            </Link>
          </p>
        ) : (
          <ul className="divide-y divide-line">
            {website.monitoredPages.map((page) => {
              const path = new URL(page.url).pathname + new URL(page.url).search;
              return (
                <li key={page.id} className="flex items-center gap-4 py-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-[13px] text-ink">
                    {path === "/" ? "/ (homepage)" : path}
                  </span>
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ink-faint hover:text-primary"
                    aria-label={`Open ${path}`}
                  >
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card>
        <CardHeader title="Danger zone" />
        <WebsiteActions
          websiteId={website.id}
          websiteName={website.name}
          paused={website.status === "PAUSED"}
        />
      </Card>
    </div>
  );
}
