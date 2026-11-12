import { Skeleton, SkeletonListRows } from "@/components/dashboard/skeleton";

/** Notifications skeleton: headline, readout strip, section index and the three sections, matching page.tsx. */
export default function NotificationsLoading() {
  return (
    <div role="status" aria-label="Loading notifications" className="max-w-5xl">
      <div className="mb-6 space-y-2.5">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-8 w-full max-w-xl" />
        <Skeleton className="h-3.5 w-80" />
      </div>
      <Skeleton className="mb-8 h-[92px] w-full rounded-2xl" />
      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
        <div className="hidden space-y-2 lg:block">
          <Skeleton className="h-7 w-32 rounded-lg" />
          <Skeleton className="h-7 w-36 rounded-lg" />
          <Skeleton className="h-7 w-28 rounded-lg" />
        </div>
        <div className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-line bg-card p-6">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-14 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-field" />
            <div className="grid gap-2 sm:grid-cols-3">
              <Skeleton className="h-16 rounded-tile" />
              <Skeleton className="h-16 rounded-tile" />
              <Skeleton className="h-16 rounded-tile" />
            </div>
          </div>
          <div className="rounded-2xl border border-line bg-card p-6">
            <SkeletonListRows rows={3} />
          </div>
        </div>
      </div>
    </div>
  );
}
