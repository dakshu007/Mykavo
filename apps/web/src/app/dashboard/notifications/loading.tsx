import { Card } from "@/components/ui/card";
import {
  Skeleton,
  SkeletonCardHeader,
  SkeletonListRows,
} from "@/components/dashboard/skeleton";

/** Notifications skeleton: settings form card + history list, matching page.tsx. */
export default function NotificationsLoading() {
  return (
    <div role="status" aria-label="Loading notifications" className="max-w-2xl space-y-6">
      <Card>
        <SkeletonCardHeader action />
        <div className="space-y-4">
          <Skeleton className="h-3.5 w-48" />
          <Skeleton className="h-11 w-full rounded-field" />
          <Skeleton className="h-3.5 w-40" />
          <Skeleton className="h-11 w-full rounded-field" />
          <Skeleton className="h-10 w-32 rounded-full" />
        </div>
      </Card>

      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={4} />
      </Card>
    </div>
  );
}
