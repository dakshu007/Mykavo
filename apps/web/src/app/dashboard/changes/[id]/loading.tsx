import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCardHeader } from "@/components/dashboard/skeleton";

/** Change detail skeleton: badges, title, description, before/after, details. */
export default function ChangeDetailLoading() {
  return (
    <div role="status" aria-label="Loading change" className="space-y-6">
      <div>
        <Skeleton className="mb-3 h-3.5 w-20" />
        <div className="flex flex-wrap items-center gap-2.5">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-7 w-3/5 max-w-96" />
        <Skeleton className="mt-2 h-3.5 w-2/5 max-w-72" />
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="max-w-xl flex-1 space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
          <Skeleton className="h-10 w-40 rounded-full" />
        </div>
      </Card>

      <Card>
        <SkeletonCardHeader />
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-12 w-full rounded-tile" />
          </div>
          <div>
            <Skeleton className="mb-2 h-3 w-16" />
            <Skeleton className="h-12 w-full rounded-tile" />
          </div>
        </div>
      </Card>

      <Card>
        <SkeletonCardHeader action />
        <div className="divide-y divide-line">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-2.5">
              <Skeleton className="h-3.5 w-32 shrink-0" />
              <Skeleton className="h-3.5 w-2/5 max-w-56" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
