import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCardHeader } from "@/components/dashboard/skeleton";

/** Settings skeleton: workspace card with definition rows, matching page.tsx. */
export default function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings" className="max-w-2xl space-y-6">
      <Card>
        <SkeletonCardHeader />
        <div className="divide-y divide-line">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4 py-3">
              <Skeleton className="h-4 w-40 shrink-0" />
              <Skeleton className="h-4 w-2/5 max-w-56" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
