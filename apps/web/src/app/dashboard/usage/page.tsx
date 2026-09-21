import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Gauge } from "lucide-react";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { collectUsage, logUsageProblems } from "@/lib/usage/collect";
import { Card, CardHeader } from "@/components/ui/card";
import { UsageMeters } from "@/components/dashboard/usage-meters";
import { WorkerStatus } from "@/components/dashboard/worker-status";
import { getWorkerLiveness } from "@/lib/usage/worker-health";
import { RecentSignups } from "@/components/dashboard/recent-signups";
import { getRecentSignups } from "@/lib/admin/recent-signups";

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

/**
 * Its own boundary, like the worker panel: two cheap indexed queries that
 * must not queue behind the R2 bucket walk.
 */
async function SignupsPanel() {
  return <RecentSignups report={await getRecentSignups()} />;
}

function UsageSkeleton() {
  return (
    <p className="py-4 text-sm text-ink-secondary">
      Measuring… storage is counted by walking the bucket, so this takes a few seconds.
    </p>
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
  if (!isPlatformAdmin(session.user.email)) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <Suspense fallback={null}>
        <WorkerPanel />
      </Suspense>

      <Card>
        <CardHeader
          icon={Gauge}
          title="All Usage"
          action={
            <span className="rounded-full bg-primary-soft px-2.5 py-1 text-[11px] font-semibold text-accent">
              Admin only
            </span>
          }
        />
        <p className="mb-5 text-[13px] text-ink-secondary">
          Every service MyKavo depends on, as a share of its limit. Figures marked
          &ldquo;Partial&rdquo; are a floor, not a total; anything that could not be read says
          so instead of showing a number.
        </p>
        <Suspense fallback={<UsageSkeleton />}>
          <UsagePanel />
        </Suspense>
      </Card>

      <Suspense fallback={null}>
        <SignupsPanel />
      </Suspense>
    </div>
  );
}
