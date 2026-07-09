import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
} from "@/components/dashboard/skeleton";

/** Changes skeleton: filter pill rows + change list, matching page.tsx. */
export default function ChangesLoading() {
  return (
    <div role="status" aria-label="Loading changes">
      <Card>
        <SkeletonCardHeader />
        <div className="mb-5 space-y-2.5">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-20 rounded-full" />
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-24 rounded-full" />
            ))}
          </div>
        </div>
        <SkeletonListRows rows={6} />
      </Card>
    </div>
  );
}
