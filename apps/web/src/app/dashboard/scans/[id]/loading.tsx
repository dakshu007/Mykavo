import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonStat,
} from "@/components/dashboard/skeleton";

/** Scan detail skeleton: heading, summary stats, page results with thumbnails. */
export default function ScanDetailLoading() {
  return (
    <div role="status" aria-label="Loading scan" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-3.5 w-28" />
        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-2 h-3.5 w-48" />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      <Card>
        <SkeletonCardHeader />
        <ul className="divide-y divide-line">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex items-start gap-4 py-4">
              <Skeleton className="h-20 w-32 shrink-0 rounded-lg" />
              <div className="min-w-0 flex-1 space-y-2 pt-1">
                <Skeleton className="h-3.5 w-2/5 max-w-48" />
                <Skeleton className="h-3 w-3/5 max-w-64" />
                <Skeleton className="h-3 w-1/2 max-w-56" />
              </div>
              <Skeleton className="h-6 w-24 shrink-0 rounded-full" />
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
