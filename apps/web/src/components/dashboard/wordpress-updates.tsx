import Link from "next/link";
import { CheckCircle2, CircleDashed, RefreshCw } from "lucide-react";
import { CardHeader } from "@/components/ui/card";
import { checkStatus, type UpdateHistoryData } from "@/lib/wp-update-history";

/**
 * WordPress updates on mykavo.app: every plugin, theme and core update the
 * MyKavo plugin reported, on every plan. On Pro and Agency each one links to
 * the check that ran right after it; on Free it is listed as not checked.
 */
export function WordPressUpdatesPanel({
  data,
  checksIncluded,
}: {
  data: UpdateHistoryData;
  checksIncluded: boolean;
}) {
  return (
    <>
      <CardHeader icon={RefreshCw} title="WordPress updates" />
      {data.entries.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          No updates yet. Every plugin, theme and WordPress update on this site is listed here
          the moment it happens.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {data.entries.map((e) => {
            const status = checkStatus(e);
            const when = new Date(e.createdAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
            return (
              <li key={e.id} className="flex flex-wrap items-start gap-x-4 gap-y-1 py-3">
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-ink">{e.note}</span>
                  <span className="text-xs text-ink-faint">
                    {when} · {e.trigger === "auto" ? "Automatic update" : "Updated by hand"}
                  </span>
                </span>
                {status.checked && e.scanId ? (
                  <Link
                    href={`/dashboard/scans/${e.scanId}`}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-success-strong hover:underline"
                  >
                    <CheckCircle2 className="size-3.5" aria-hidden /> {status.label} - see result
                  </Link>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-ink-secondary">
                    <CircleDashed className="size-3.5" aria-hidden /> {status.label}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {!checksIncluded && (
        <p className="mt-4 text-[13px] text-ink-secondary">
          Every update is listed on your plan, and your pages are checked at the next scheduled
          scan.{" "}
          <Link href="/dashboard/billing" className="font-medium text-accent hover:underline">
            Pro checks your pages right after each update
          </Link>
          .
        </p>
      )}
    </>
  );
}
