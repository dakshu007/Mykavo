import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@mykavo/database";
import { Card, CardHeader } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
import { runEeatAnalysis } from "@/lib/tools/eeat-server";
import type { EeatPillar, EeatReport } from "@/lib/tools/eeat";

export const metadata: Metadata = { title: "MyKavo Analyser - MyKavo" };

type Params = { params: Promise<{ id: string }> };

const PILLAR_LABELS: Record<EeatPillar, string> = {
  EXPERIENCE: "Experience",
  EXPERTISE: "Expertise",
  AUTHORITATIVENESS: "Authoritativeness",
  TRUST: "Trust",
};

const STATUS_CHIP: Record<string, string> = {
  pass: "bg-success-soft text-success-strong",
  warn: "bg-warning-soft text-warning-strong",
  fail: "bg-critical-soft text-critical-strong",
};

function tone(score: number): string {
  return score >= 90 ? "text-success-strong" : score >= 70 ? "text-warning-strong" : "text-critical-strong";
}

function barTone(score: number): string {
  return score >= 90 ? "bg-success" : score >= 70 ? "bg-warning" : "bg-critical";
}

/** Live E-E-A-T report for the website homepage (dashboard edition). */
export default async function WebsiteEeatPage({ params }: Params) {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const { id } = await params;

  const website = await prisma.website.findFirst({
    where: { id, workspaceId: workspace.id },
    select: { id: true, name: true, url: true },
  });
  if (!website) notFound();

  let report: EeatReport | null = null;
  let analysisError = "";
  try {
    report = await runEeatAnalysis(website.url);
  } catch (err) {
    analysisError = err instanceof Error ? err.message : "The analysis failed - try again shortly.";
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {website.name}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-ink">MyKavo Analyser</h1>
            <a
              href={website.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-0.5 inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-secondary hover:text-accent"
            >
              {(() => { try { return new URL(website.url).hostname; } catch { return website.url; } })()}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          </div>
          <p className="max-w-72 text-right text-[11.5px] leading-4 text-ink-faint">
            Live analysis of the homepage against Google&apos;s quality-rater framework.
            Trust weighted double, per the guidelines.
          </p>
        </div>
      </div>

      {!report ? (
        <Card>
          <p className="py-2 text-sm text-critical-strong">{analysisError}</p>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
            <Card className="flex flex-col items-center justify-center px-12">
              <p className="label-micro mb-2">Analyser score</p>
              <p className={`text-6xl font-semibold tabular-nums tracking-tight ${tone(report.overall)}`}>
                {report.overall}
              </p>
              <p className={`mt-1 text-[13px] font-medium ${tone(report.overall)}`}>{report.rating}</p>
            </Card>
            <Card>
              <CardHeader title="Pillars" />
              <div className="space-y-3.5">
                {(Object.keys(PILLAR_LABELS) as EeatPillar[]).map((pillar) => (
                  <div key={pillar} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-sm font-medium text-ink">
                      {PILLAR_LABELS[pillar]}
                      {pillar === "TRUST" && (
                        <span className="ml-1.5 font-mono text-[10px] text-ink-faint">×2</span>
                      )}
                    </span>
                    <span className="h-3 flex-1 overflow-hidden rounded-full bg-surface">
                      <span
                        className={`block h-full rounded-full ${barTone(report.pillars[pillar])}`}
                        style={{ width: `${report.pillars[pillar]}%` }}
                      />
                    </span>
                    <span className={`w-9 shrink-0 text-right text-sm font-semibold tabular-nums ${tone(report.pillars[pillar])}`}>
                      {report.pillars[pillar]}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <CardHeader title="Signals" />
            <ul className="divide-y divide-line">
              {report.checks.map((check) => (
                <li key={check.id} className="py-3">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[check.status]}`}>
                      {check.status === "pass" ? "Pass" : check.status === "warn" ? "Improve" : "Missing"}
                    </span>
                    <span className="text-sm font-medium text-ink">{check.title}</span>
                    <span className="text-[11px] uppercase tracking-wide text-ink-faint">
                      {PILLAR_LABELS[check.pillar]}
                    </span>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-secondary">{check.detail}</p>
                  {check.status !== "pass" && (
                    <p className="mt-0.5 text-[13px] text-ink">→ {check.fix}</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
