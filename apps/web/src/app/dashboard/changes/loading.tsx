import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
} from "@/components/dashboard/skeleton";

/** Changes skeleton: one filter row + change list, matching page.tsx. */
export default function ChangesLoading() {
  return (
    <div role="status" aria-label="Loading changes">
      <Card>
        <SkeletonCardHeader />
        <div className="mb-5 flex flex-wrap gap-2">
          <Skeleton className="h-9 w-52 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
        <SkeletonListRows rows={6} />
      </Card>
    </div>
  );
}
