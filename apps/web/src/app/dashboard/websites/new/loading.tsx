import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/dashboard/skeleton";

/** Add-website skeleton: heading + wizard card, matching page.tsx. */
export default function NewWebsiteLoading() {
  return (
    <div role="status" aria-label="Loading" className="space-y-5">
      <div>
        <Skeleton className="mb-3 h-3.5 w-20" />
        <Skeleton className="h-7 w-44" />
        <Skeleton className="mt-2 h-3.5 w-64 max-w-full" />
      </div>
      <Card>
        <Skeleton className="mb-4 h-4 w-32" />
        <Skeleton className="h-11 w-full rounded-field" />
        <Skeleton className="mt-4 h-11 w-36 rounded-full" />
      </Card>
    </div>
  );
}
