import Link from "next/link";
import { History } from "lucide-react";
import { prisma } from "@mykavo/database";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ScanStatusBadge } from "@/components/dashboard/scan-status";

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

  return (
    <Card>
      <CardHeader title="Scan history" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-160 text-left">
          <thead>
            <tr className="label-micro border-b border-line">
              <th className="py-3 pr-4 font-semibold">Website</th>
              <th className="py-3 pr-4 font-semibold">Trigger</th>
              <th className="py-3 pr-4 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Pages</th>
              <th className="py-3 pr-4 font-semibold">Duration</th>
              <th className="py-3 font-semibold">Started</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {scans.map((scan) => (
              <tr key={scan.id}>
                <td className="py-4 pr-4">
                  <Link
                    href={`/dashboard/scans/${scan.id}`}
                    className="group block"
                  >
                    <p className="text-sm font-medium text-ink group-hover:text-primary">
                      {scan.website.name}
                    </p>
                    <p className="font-mono text-xs text-ink-faint">
                      {new URL(scan.website.url).hostname}
                    </p>
                  </Link>
                </td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">
                  {scan.triggerType === "BASELINE"
                    ? "Baseline"
                    : scan.triggerType === "MANUAL"
                      ? "Manual"
                      : "Scheduled"}
                </td>
                <td className="py-4 pr-4">
                  <ScanStatusBadge status={scan.status} />
                </td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">
                  {scan.pagesScanned}/{scan.pagesRequested}
                  {scan.pagesFailed > 0 && (
                    <span className="ml-1.5 text-critical-strong">({scan.pagesFailed} failed)</span>
                  )}
                </td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">
                  {duration(scan.startedAt, scan.completedAt)}
                </td>
                <td className="py-4 text-sm text-ink-secondary">
                  {scan.createdAt.toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
