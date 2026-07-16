import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";

/**
 * Loading-state primitives for the dashboard's `loading.tsx` screens.
 * Blocks pulse only when the user allows motion (`motion-safe`), and each
 * shape mirrors the card layout it stands in for so navigation feels instant.
 */

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("rounded-md bg-line motion-safe:animate-pulse", className)}
      aria-hidden
    />
  );
}

/** Mirrors `CardHeader`: title on the left, optional action pill on the right. */
export function SkeletonCardHeader({ action = false }: { action?: boolean }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <Skeleton className="h-4 w-36" />
      {action && <Skeleton className="h-9 w-28 rounded-full" />}
    </div>
  );
}

/** Mirrors the stat cards on the overview and detail pages. */
export function SkeletonStat() {
  return (
    <Card>
      <Skeleton className="mb-4 h-3.5 w-28" />
      <Skeleton className="h-10 w-16" />
    </Card>
  );
}

/** Divided list rows - websites, changes, notifications, snapshots. */
export function SkeletonListRows({ rows = 5 }: { rows?: number }) {
  return (
    <ul className="divide-y divide-line">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-4 py-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5 w-3/5 max-w-56" />
            <Skeleton className="h-3 w-2/5 max-w-40" />
          </div>
          <Skeleton className="h-6 w-20 shrink-0 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

/** Header + body rows matching the websites and scan-history tables. */
export function SkeletonTable({
  rows = 6,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-140 text-left">
        <thead>
          <tr className="border-b border-line">
            {Array.from({ length: columns }).map((_, c) => (
              <th key={c} className="py-3 pr-4">
                <Skeleton className="h-3 w-16" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {Array.from({ length: rows }).map((_, r) => (
            <tr key={r}>
              {Array.from({ length: columns }).map((_, c) => (
                <td key={c} className="py-4 pr-4">
                  {c === 0 ? (
                    <div className="space-y-2">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  ) : (
                    <Skeleton className="h-3.5 w-16" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
