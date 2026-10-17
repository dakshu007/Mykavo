import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { WebsiteStatusBadge } from "@/components/dashboard/website-status";
import type { OverviewWebsite } from "./load-overview";
import { hostOf, plural } from "./format";

/** How many websites the Overview lists before "View all". */
export const OVERVIEW_WEBSITE_LIMIT = 5;

function uptimeLabel(up: boolean | null): string {
  return up === null ? "Uptime not checked yet" : up ? "Up" : "Down";
}

/**
 * The quick jump list the Overview has always had: each website with its
 * uptime dot, page count and monitoring status.
 */
export function WebsitesList({ websites }: { websites: OverviewWebsite[] }) {
  if (websites.length === 0) return null;

  return (
    <section aria-labelledby="overview-websites-heading" className="rounded-card bg-card p-5 shadow-card sm:p-6">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 id="overview-websites-heading" className="text-[15px] font-semibold text-ink">
          Your websites
        </h2>
        <Link
          href="/dashboard/websites"
          className="inline-flex items-center gap-1 rounded-sm text-[13px] font-medium text-accent hover:underline"
        >
          View all <ArrowRight className="size-3.5" aria-hidden />
        </Link>
      </div>
      <ul className="divide-y divide-line">
        {websites.slice(0, OVERVIEW_WEBSITE_LIMIT).map((w) => (
          <li key={w.id}>
            <Link href={`/dashboard/websites/${w.id}`} className="group flex items-center gap-4 rounded-lg py-3">
              <span
                role="img"
                aria-label={uptimeLabel(w.up)}
                title={uptimeLabel(w.up)}
                className={cn(
                  "inline-block size-2.5 shrink-0 rounded-full",
                  w.up === null ? "bg-line" : w.up ? "bg-success" : "bg-critical",
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink group-hover:text-accent">{w.name}</p>
                <p className="truncate font-mono text-xs text-ink-faint">
                  {hostOf(w.url)} · {plural(w.monitoredPages, "page")}
                </p>
              </div>
              <WebsiteStatusBadge status={w.status} className="shrink-0" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
