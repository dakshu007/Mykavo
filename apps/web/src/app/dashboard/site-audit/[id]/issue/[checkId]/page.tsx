import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, Wrench } from "lucide-react";
import { prisma } from "@mykavo/database";
import { AUDIT_CHECKS, type AuditIssueGroup } from "@mykavo/seo-audit";
import { Card, CardHeader } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { SEVERITY_CHIP } from "../../../report-ui";

export const metadata: Metadata = { title: "Audit issue - MyKavo" };

type Params = { params: Promise<{ id: string; checkId: string }> };

/** Compact "found on" source label: path only, sitemap called out. */
function pagePathLabel(source: string): string {
  try {
    const url = new URL(source);
    if (/sitemap.*\.xml$/i.test(url.pathname)) return "the sitemap";
    return url.pathname + url.search || "/";
  } catch {
    return source;
  }
}

/**
 * Single-issue drill-down (the Ahrefs "Issues / External 4XX" view): every
 * affected URL as a table row - URL, the measured detail (status code,
 * length, target…), and the pages it was found on - with the why/how-to-fix
 * guidance up top.
 */
export default async function AuditIssuePage({ params }: Params) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id, checkId } = await params;

  const def = AUDIT_CHECKS[checkId];
  if (!def) notFound();

  const audit = await prisma.siteAudit.findFirst({
    where: { id, website: { workspaceId: workspace.id } },
    include: { website: { select: { id: true, name: true, url: true } } },
  });
  if (!audit) notFound();

  const issues = (Array.isArray(audit.issues) ? audit.issues : []) as unknown as AuditIssueGroup[];
  const group = issues.find((g) => g.checkId === checkId);
  if (!group) notFound();

  const chip = SEVERITY_CHIP[def.severity];
  const hasDetail = group.urls.some((u) => u.detail);
  const hasFoundOn = group.urls.some((u) => u.foundOn && u.foundOn.length > 0);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/site-audit/${audit.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {audit.website.name} audit
        </Link>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-ink">{def.title}</h1>
          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${chip.className}`}>
            {chip.label}
          </span>
          <span className="text-[13px] text-ink-faint">{def.category}</span>
        </div>
        <p className="mt-1 text-sm text-ink-secondary">
          {group.count.toLocaleString("en-US")} affected URL{group.count === 1 ? "" : "s"}
          {group.count > group.urls.length &&
            ` · showing the first ${group.urls.length}`}
          {audit.completedAt &&
            ` · audited ${audit.completedAt.toLocaleDateString("en-US", { dateStyle: "medium" })}`}
        </p>
      </div>

      <Card>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="label-micro mb-1.5">Why it matters</p>
            <p className="text-sm leading-6 text-ink-secondary">{def.explain}</p>
          </div>
          <div className="rounded-tile bg-surface px-4 py-3.5">
            <p className="label-micro mb-1.5 flex items-center gap-1.5">
              <Wrench className="size-3.5" aria-hidden /> How to fix
            </p>
            <p className="text-sm leading-6 text-ink">{def.fix}</p>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Affected URLs" />
        <div className="overflow-x-auto">
          <table className="w-full min-w-160 text-left">
            <thead>
              <tr className="label-micro border-b border-line">
                <th className="w-10 py-3 pr-4 font-semibold">#</th>
                <th className="py-3 pr-4 font-semibold">URL</th>
                {hasDetail && <th className="py-3 pr-4 font-semibold">Detail</th>}
                {hasFoundOn && <th className="py-3 font-semibold">Found on</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {group.urls.map((entry, index) => (
                <tr key={entry.url + (entry.detail ?? "")}>
                  <td className="py-3.5 pr-4 font-mono text-xs text-ink-faint">{index + 1}</td>
                  <td className="max-w-xl py-3.5 pr-4">
                    <a
                      href={entry.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-baseline gap-1.5 break-all font-mono text-[12.5px] text-ink hover:text-primary"
                    >
                      {entry.url}
                      <ExternalLink className="size-3 shrink-0 self-center text-ink-faint" aria-hidden />
                    </a>
                  </td>
                  {hasDetail && (
                    <td className="py-3.5 pr-4 font-mono text-xs text-ink-secondary">
                      {entry.detail ?? "-"}
                    </td>
                  )}
                  {hasFoundOn && (
                    <td className="py-3.5">
                      {entry.foundOn && entry.foundOn.length > 0 ? (
                        <span className="flex flex-wrap gap-x-2.5 gap-y-1">
                          {entry.foundOn.map((source) => (
                            <a
                              key={source}
                              href={source}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="break-all font-mono text-xs text-ink-secondary underline decoration-line underline-offset-2 hover:text-primary"
                            >
                              {pagePathLabel(source)}
                            </a>
                          ))}
                        </span>
                      ) : (
                        <span className="text-xs text-ink-faint">-</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {group.count > group.urls.length && (
          <p className="mt-3 text-[12px] text-ink-faint">
            {group.count - group.urls.length} more affected URL
            {group.count - group.urls.length === 1 ? "" : "s"} beyond the stored sample -
            fix these and re-run the audit to surface the rest.
          </p>
        )}
      </Card>
    </div>
  );
}
