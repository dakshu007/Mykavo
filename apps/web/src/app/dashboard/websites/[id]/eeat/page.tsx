import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleAlert, CircleCheck, CircleX, ExternalLink, Wrench } from "lucide-react";
import { SiteFavicon } from "@/components/dashboard/site-favicon";
import { prisma } from "@mykavo/database";
import { Card } from "@/components/ui/card";
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

  const host = (() => {
    try {
      return new URL(website.url).hostname;
    } catch {
      return website.url;
    }
  })();

  const groups = report
    ? ([
        { key: "fail", title: "Missing", note: "Add these first", items: report.checks.filter((c) => c.status === "fail") },
        { key: "warn", title: "Improve", note: "Worth doing next", items: report.checks.filter((c) => c.status === "warn") },
        { key: "pass", title: "Passing", note: "Already in place", items: report.checks.filter((c) => c.status === "pass") },
      ] as const)
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/dashboard/websites/${website.id}`}
          className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> {website.name}
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <SiteFavicon url={website.url} name={website.name} className="size-12 rounded-xl [&_img]:size-7" />
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">MyKavo Analyser / E-E-A-T</p>
              <h1 className="text-[26px] font-semibold tracking-[-0.02em] text-ink">{website.name}</h1>
              <a
                href={website.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 font-mono text-[13px] text-ink-secondary hover:text-accent"
              >
                {host}
                <ExternalLink className="size-3" aria-hidden />
              </a>
            </div>
          </div>
          <p className="max-w-80 text-[12px] leading-5 text-ink-faint sm:text-right">
            A live read of the homepage against Google&apos;s quality-rater framework. Trust counts double, as in the
            guidelines.
          </p>
        </div>
      </div>

      {!report ? (
        <Card>
          <p className="py-2 text-sm text-critical-strong">{analysisError}</p>
        </Card>
      ) : (
        <>
          {/* The score and the four pillars, in one strip. */}
          <section
            aria-label="Score"
            className="grid overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-[260px_1fr]"
          >
            <div className="flex flex-col items-center justify-center gap-2 border-b border-line p-6 lg:border-b-0 lg:border-r">
              <ScoreRing score={report.overall} />
              <p className={`text-[13px] font-semibold ${tone(report.overall)}`}>{report.rating}</p>
            </div>
            <dl className="grid grid-cols-2 xl:grid-cols-4">
              {(Object.keys(PILLAR_LABELS) as EeatPillar[]).map((pillar, i) => {
                const score = report.pillars[pillar];
                return (
                  <div
                    key={pillar}
                    className={[
                      "flex flex-col gap-3 p-5",
                      i % 2 === 1 ? "border-l border-line" : "",
                      i >= 2 ? "border-t border-line xl:border-t-0" : "",
                      i === 2 ? "xl:border-l" : "",
                    ].join(" ")}
                  >
                    <dt className="flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">
                      {PILLAR_LABELS[pillar]}
                      {pillar === "TRUST" && <span className="rounded bg-primary-soft px-1 text-accent">x2</span>}
                    </dt>
                    <dd className={`order-first text-[34px] font-semibold leading-none tabular-nums tracking-tight ${tone(score)}`}>
                      {score}
                    </dd>
                    <dd aria-hidden className="flex gap-[3px]">
                      {Array.from({ length: 10 }, (_, s) => (
                        <span
                          key={s}
                          className={`h-2.5 flex-1 rounded-[2px] ${s < Math.round(score / 10) ? barTone(score) : "bg-ink/[0.07]"}`}
                        />
                      ))}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>

          {groups.map((group) =>
            group.items.length === 0 ? null : group.key === "pass" ? (
              <details key={group.key} className="group rounded-card bg-card p-5 shadow-card sm:p-6">
                <summary className="flex cursor-pointer list-none items-center gap-3">
                  <CircleCheck className="size-4.5 text-success" aria-hidden />
                  <span className="text-[15px] font-semibold text-ink">Passing</span>
                  <span className="rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-strong">
                    {group.items.length}
                  </span>
                  <span className="ml-auto text-[12px] text-ink-faint group-open:hidden">Show</span>
                  <span className="ml-auto hidden text-[12px] text-ink-faint group-open:inline">Hide</span>
                </summary>
                <ul className="mt-4 grid gap-2 sm:grid-cols-2">
                  {group.items.map((check) => (
                    <li key={check.id} className="flex items-start gap-2.5 rounded-xl border border-line px-3.5 py-2.5">
                      <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-ink">{check.title}</p>
                        <p className="text-[12px] text-ink-faint">{PILLAR_LABELS[check.pillar]}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <Card key={group.key}>
                <div className="mb-4 flex items-center gap-3">
                  {group.key === "fail" ? (
                    <CircleX className="size-4.5 text-critical" aria-hidden />
                  ) : (
                    <CircleAlert className="size-4.5 text-warning" aria-hidden />
                  )}
                  <h2 className="text-[15px] font-semibold text-ink">{group.title}</h2>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_CHIP[group.key]}`}>
                    {group.items.length}
                  </span>
                  <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{group.note}</span>
                </div>
                <ul className="grid gap-3 lg:grid-cols-2">
                  {group.items.map((check) => (
                    <li key={check.id} className="flex flex-col rounded-xl border border-line p-4">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-[14px] font-semibold text-ink">{check.title}</p>
                        <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.1em] text-ink-secondary">
                          {PILLAR_LABELS[check.pillar]}
                        </span>
                      </div>
                      <p className="mt-1 text-[13px] text-ink-secondary">{check.detail}</p>
                      <p className="mt-3 flex gap-2 rounded-lg bg-primary-soft px-3 py-2 text-[13px] leading-5 text-ink">
                        <Wrench className="mt-0.5 size-3.5 shrink-0 text-accent" aria-hidden />
                        <span>{check.fix}</span>
                      </p>
                    </li>
                  ))}
                </ul>
              </Card>
            ),
          )}
        </>
      )}
    </div>
  );
}

/** The overall score as a ring that fills to the score. */
function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const stroke = score >= 90 ? "var(--color-success)" : score >= 70 ? "var(--color-warning)" : "var(--color-critical)";
  return (
    <div className="relative size-36">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-ink/[0.07]" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.max(0, Math.min(100, score)) / 100)}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint">Score</span>
        <span className={`text-[40px] font-semibold leading-none tabular-nums tracking-tight ${tone(score)}`}>{score}</span>
        <span className="text-[11px] text-ink-faint">of 100</span>
      </div>
    </div>
  );
}
