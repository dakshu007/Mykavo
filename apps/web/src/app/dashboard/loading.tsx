import { Card } from "@/components/ui/card";
import {
  SkeletonCardHeader,
  SkeletonListRows,
  SkeletonStat,
} from "@/components/dashboard/skeleton";

/** Overview skeleton: stat grid + websites list, matching page.tsx. */
export default function DashboardOverviewLoading() {
  return (
    <div role="status" aria-label="Loading overview" className="space-y-6">
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={5} />
      </Card>
    </div>
  );
}
