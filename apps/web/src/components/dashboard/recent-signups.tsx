import { UserPlus, CircleCheck, CircleDashed } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { joinedAgo, type SignupsReport } from "@/lib/admin/recent-signups";

/**
 * Who has joined, on the admin usage page.
 *
 * Shows activation beside each name rather than a bare count, because the two
 * numbers answer different questions. "12 signups" is a vanity figure; "12
 * signups, 3 of whom added a website" is the one that tells you whether the
 * product is landing.
 */
export function RecentSignups({ report }: { report: SignupsReport }) {
  const activated = report.rows.filter((r) => r.activated).length;

  return (
    <Card>
      <CardHeader
        icon={UserPlus}
        title="Users"
        action={
          <span className="text-[12px] text-ink-secondary">
            {report.total} total
            {report.lastSevenDays > 0 && (
              <span className="ml-2 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-strong">
                +{report.lastSevenDays} this week
              </span>
            )}
          </span>
        }
      />

      {report.error ? (
        // Naming the failure rather than rendering an empty list: "no users"
        // and "could not read users" look identical otherwise, and only one
        // of them is worth doing something about.
        <p className="py-3 text-[13px] text-critical">
          Could not read the user list: {report.error}
        </p>
      ) : report.rows.length === 0 ? (
        <p className="py-3 text-[13px] text-ink-secondary">Nobody has signed up yet.</p>
      ) : (
        <>
          <p className="mb-3 text-[13px] text-ink-secondary">
            {activated} of the {report.rows.length} most recent have added a website.
          </p>
          <ul className="divide-y divide-border">
            {report.rows.map((row) => (
              <li key={row.id} className="flex items-center gap-3 py-2.5">
                {row.activated ? (
                  <CircleCheck className="size-4 shrink-0 text-success" aria-hidden />
                ) : (
                  <CircleDashed className="size-4 shrink-0 text-ink-faint" aria-hidden />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{row.name}</p>
                  <p className="truncate font-mono text-[12px] text-ink-secondary">
                    {row.email}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[12px] text-ink-secondary">{joinedAgo(row.joinedAt)}</p>
                  <p className="text-[11.5px] text-ink-faint">
                    {row.websites === 0
                      ? "no websites"
                      : `${row.websites} website${row.websites === 1 ? "" : "s"}`}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </Card>
  );
}
