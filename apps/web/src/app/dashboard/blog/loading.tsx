/** Same shape as the blog page: headline, readout strip, calendar, list. */
export default function DashboardBlogLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading the blog">
      <div className="space-y-3">
        <div className="h-3 w-48 animate-pulse rounded-full bg-ink/5" />
        <div className="h-9 w-full max-w-xl animate-pulse rounded-full bg-ink/5" />
      </div>
      <div className="grid h-[118px] grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink/20 bg-card lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="space-y-3 p-5">
            <div className="h-11 w-20 animate-pulse rounded-md bg-ink/5" />
            <div className="h-3 w-24 animate-pulse rounded-full bg-ink/5" />
          </div>
        ))}
      </div>
      <div className="h-44 animate-pulse rounded-2xl border border-line bg-card" />
      <div className="space-y-3 rounded-2xl border border-line bg-card p-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <div className="size-12 animate-pulse rounded-xl bg-ink/5" />
            <div className="h-4 flex-1 animate-pulse rounded-full bg-ink/5" />
            <div className="hidden h-6 w-20 animate-pulse rounded-full bg-ink/5 sm:block" />
          </div>
        ))}
      </div>
    </div>
  );
}
