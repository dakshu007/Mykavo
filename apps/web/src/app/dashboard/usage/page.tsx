import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { collectUsage, logUsageProblems } from "@/lib/usage/collect";
import { UsageMeters } from "@/components/dashboard/usage-meters";
import { WorkerStatus } from "@/components/dashboard/worker-status";
import { getWorkerLiveness } from "@/lib/usage/worker-health";

export const metadata: Metadata = {
  title: "All Usage",
  robots: { index: false },
};

/**
 * Measuring is slow enough to be worth streaming - the R2 bucket walk is one
 * list request per 1,000 objects - so the card and its heading paint
 * immediately and the figures arrive into this slot.
 */
async function UsagePanel() {
  const report = await collectUsage();
  logUsageProblems(report);
  return <UsageMeters initial={report} />;
}

/**
 * Two queries, so it paints almost immediately - deliberately NOT inside the
 * usage panel, whose R2 bucket walk takes seconds. The one fact worth knowing
 * urgently must not queue behind the slowest measurement on the page.
 */
async function WorkerPanel() {
  return <WorkerStatus liveness={await getWorkerLiveness()} />;
}

function UsageSkeleton() {
  return (
    <div className="space-y-6" aria-busy>
      <div>
        <h1 className="text-[30px] font-semibold leading-[1.12] tracking-[-0.025em] text-ink sm:text-[38px]">
          Measuring every service…
        </h1>
        <p className="mt-2 text-[15px] text-ink-secondary">
          Storage is counted by walking the bucket, so this takes a few seconds.
        </p>
      </div>
      <div className="h-[132px] animate-pulse rounded-2xl border-[1.5px] border-ink/20 bg-card motion-reduce:animate-none" />
      <div className="grid gap-4 lg:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl border border-line bg-card motion-reduce:animate-none" />
        ))}
      </div>
    </div>
  );
}

/**
 * All Usage - what every external service this installation runs on is
 * costing, as a share of its cap.
 *
 * Operator-only. `notFound()` rather than a "you are not allowed" page: a
 * customer has no reason to learn that an admin view exists. The API behind
 * the Refresh button checks the same allowlist independently, so this gate is
 * UX rather than the security boundary.
 */
export default async function UsagePage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user)) notFound();

  return (
    <div className="max-w-6xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Suspense
          fallback={
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">Checking the scan worker…</p>
          }
        >
          <WorkerPanel />
        </Suspense>
        <span className="rounded-full bg-primary-soft px-2.5 py-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] text-accent">
          Admin / All usage
        </span>
      </div>

      <Suspense fallback={<UsageSkeleton />}>
        <UsagePanel />
      </Suspense>
    </div>
  );
}
