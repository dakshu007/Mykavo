import { Card } from "@/components/ui/card";
import { SkeletonCardHeader, SkeletonTable } from "@/components/dashboard/skeleton";

/** Websites skeleton: header with action pill + table, matching page.tsx. */
export default function WebsitesLoading() {
  return (
    <div role="status" aria-label="Loading websites">
      <Card>
        <SkeletonCardHeader action />
        <SkeletonTable rows={6} columns={5} />
      </Card>
    </div>
  );
}
