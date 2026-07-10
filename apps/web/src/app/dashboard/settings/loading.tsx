import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonCardHeader } from "@/components/dashboard/skeleton";

/** Settings skeleton: plan, team, profile, and workspace cards, matching page.tsx. */
export default function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings" className="max-w-2xl space-y-6">
      {/* Current plan: name + price line, then a 2-column grid of limit tiles. */}
      <Card>
        <SkeletonCardHeader action />
        <Skeleton className="h-6 w-36" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-tile" />
          ))}
        </div>
      </Card>

      {/* Team: seat count, member rows, invite form. */}
      <Card>
        <SkeletonCardHeader />
        <Skeleton className="h-4 w-32" />
        <div className="mt-4 divide-y divide-line">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 py-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3 w-56 max-w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-end gap-2">
          <Skeleton className="h-10 flex-1 rounded-field" />
          <Skeleton className="h-10 w-24 rounded-field" />
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      </Card>

      {/* Profile: avatar circle + photo buttons, name field, save button. */}
      <Card>
        <SkeletonCardHeader />
        <div className="flex items-center gap-4">
          <Skeleton className="size-16 shrink-0 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-9 w-32 rounded-full" />
            <Skeleton className="h-3 w-56 max-w-full" />
          </div>
        </div>
        <Skeleton className="mt-6 h-11 w-full max-w-sm rounded-field" />
        <Skeleton className="mt-6 h-11 w-32 rounded-full" />
      </Card>

      {/* Workspace: definition rows. */}
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
