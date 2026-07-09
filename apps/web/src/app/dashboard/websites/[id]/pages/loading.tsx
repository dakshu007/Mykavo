import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonListRows } from "@/components/dashboard/skeleton";

/** Monitored pages editor skeleton: heading + page list card. */
export default function EditPagesLoading() {
  return (
    <div role="status" aria-label="Loading monitored pages" className="space-y-5">
      <div>
        <Skeleton className="mb-3 h-3.5 w-24" />
        <Skeleton className="h-7 w-52" />
        <Skeleton className="mt-2 h-3.5 w-72 max-w-full" />
      </div>
      <Card>
        <SkeletonListRows rows={6} />
      </Card>
    </div>
  );
}
