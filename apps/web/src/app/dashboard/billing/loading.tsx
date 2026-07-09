import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCardHeader } from "@/components/dashboard/skeleton";

/** Billing skeleton: current-plan card + upgrade card, matching page.tsx. */
export default function BillingLoading() {
  return (
    <div role="status" aria-label="Loading billing" className="max-w-2xl space-y-6">
      <Card>
        <SkeletonCardHeader action />
        <div className="flex flex-wrap items-baseline gap-3">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="mt-5 space-y-2.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-3/5 max-w-72" />
          ))}
        </div>
        <Skeleton className="mt-6 h-10 w-36 rounded-full" />
      </Card>

      <Card>
        <Skeleton className="size-10 rounded-xl" />
        <Skeleton className="mt-4 h-6 w-64 max-w-full" />
        <Skeleton className="mt-2 h-4 w-4/5" />
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-4/5" />
          ))}
        </div>
        <Skeleton className="mt-6 h-11 w-44 rounded-full" />
      </Card>
    </div>
  );
}
