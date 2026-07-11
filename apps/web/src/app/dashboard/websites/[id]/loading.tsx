import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
  SkeletonStat,
} from "@/components/dashboard/skeleton";

/** Website detail skeleton: heading, stat grid, uptime card, pages + scans lists. */
export default function WebsiteDetailLoading() {
  return (
    <div role="status" aria-label="Loading website" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-3.5 w-20" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-3.5 w-36" />
          </div>
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>

      {/* Uptime & performance: day-bar strip + response-time chart */}
      <Card>
        <SkeletonCardHeader action />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="mt-6 h-36 w-full" />
      </Card>

      <Card>
        <SkeletonCardHeader action />
        <SkeletonListRows rows={4} />
      </Card>

      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={3} />
      </Card>
    </div>
  );
}
