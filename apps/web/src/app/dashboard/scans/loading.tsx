import { Card } from "@/components/ui/card";
import { SkeletonCardHeader, SkeletonTable } from "@/components/dashboard/skeleton";

/** Scan history skeleton: six-column table, matching page.tsx. */
export default function ScansLoading() {
  return (
    <div role="status" aria-label="Loading scan history">
      <Card>
        <SkeletonCardHeader />
        <SkeletonTable rows={6} columns={6} />
      </Card>
    </div>
  );
}
