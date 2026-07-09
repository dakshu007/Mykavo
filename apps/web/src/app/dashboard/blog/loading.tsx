export default function DashboardBlogLoading() {
  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <div className="mb-6 flex items-center justify-between">
        <div className="h-5 w-28 animate-pulse rounded-full bg-black/5" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-black/5" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-line pb-3">
            <div className="h-4 flex-1 animate-pulse rounded-full bg-black/5" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-black/5" />
            <div className="hidden h-4 w-24 animate-pulse rounded-full bg-black/5 sm:block" />
            <div className="hidden h-4 w-24 animate-pulse rounded-full bg-black/5 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
