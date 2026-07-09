import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
} from "@/components/dashboard/skeleton";

/** Page detail skeleton: heading, baseline card (screenshot + metadata), snapshots. */
export default function MonitoredPageLoading() {
  return (
    <div role="status" aria-label="Loading page" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-3.5 w-28" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-24" />
        </div>
      </div>

      <Card>
        <SkeletonCardHeader />
        <div className="grid gap-6 sm:grid-cols-[220px_1fr]">
          <Skeleton className="h-40 w-full rounded-tile" />
          <div className="divide-y divide-line self-start">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 py-2.5">
                <Skeleton className="h-3.5 w-28 shrink-0" />
                <Skeleton className="h-3.5 w-3/5 max-w-64" />
              </div>
            ))}
          </div>
        </div>
      </Card>

      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={4} />
      </Card>
    </div>
  );
}
