import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
} from "@/components/dashboard/skeleton";

/** SEO health skeleton: heading, score card, two issue-group cards. */
export default function SeoHealthLoading() {
  return (
    <div role="status" aria-label="Loading SEO health report" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-3.5 w-24" />
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-2 h-3.5 w-80" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center gap-8">
          <div className="space-y-2">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-12 w-28" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
      </Card>

      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={3} />
      </Card>
      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={3} />
      </Card>
    </div>
  );
}
