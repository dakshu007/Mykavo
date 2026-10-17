import { Card } from "@/components/ui/card";
import {
  SkeletonCardHeader,
  SkeletonListRows,
  SkeletonStat,
} from "@/components/dashboard/skeleton";

/**
 * Overview skeleton, in page.tsx's order: the "Needs your attention" list
 * first, then the summary row, then the websites list.
 */
export default function DashboardOverviewLoading() {
  return (
    <div role="status" aria-label="Loading overview" className="space-y-6">
      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={3} />
      </Card>
      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <Card>
        <SkeletonCardHeader />
        <SkeletonListRows rows={4} />
      </Card>
    </div>
  );
}
