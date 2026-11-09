import { UserPlus, CircleCheck, CircleDashed } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SiteFavicon } from "@/components/dashboard/site-favicon";
import { joinedAgo, type SignupRow, type SignupsReport } from "@/lib/admin/recent-signups";

/**
 * Who has joined, split by the one thing that matters: did they add a
 * website? People who did show the sites they added, by icon, so a glance
 * says what each account is for. People who did not are listed apart, as the
 * ones to follow up with.
 */
export function RecentSignups({ report }: { report: SignupsReport }) {
  const added = report.rows.filter((r) => r.activated);
  const notYet = report.rows.filter((r) => !r.activated);
  const rate = report.rows.length > 0 ? Math.round((added.length / report.rows.length) * 100) : 0;

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg bg-primary-soft text-accent">
            <UserPlus className="size-4.5" aria-hidden />
          </span>
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Users</h2>
            <p className="text-[12.5px] text-ink-secondary">The {report.rows.length} most recent signups</p>
          </div>
        </div>
      </div>

      {/* Three readouts: total, this week, and how many recent signups activated. */}
      <dl className="mt-5 grid grid-cols-3 overflow-hidden rounded-xl border border-line">
        {[
          { label: "Total users", value: String(report.total) },
          { label: "This week", value: `+${report.lastSevenDays}` },
          { label: "Added a site", value: `${rate}%` },
        ].map((t, i) => (
          <div key={t.label} className={i > 0 ? "border-l border-line p-4" : "p-4"}>
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{t.label}</dt>
            <dd className="mt-1 text-[26px] font-semibold tabular-nums tracking-tight text-ink">{t.value}</dd>
          </div>
        ))}
      </dl>

      {report.error ? (
        // Naming the failure rather than rendering an empty list: "no users"
        // and "could not read users" look identical otherwise.
        <p className="mt-4 text-[13px] text-critical">Could not read the user list: {report.error}</p>
      ) : report.rows.length === 0 ? (
        <p className="mt-4 text-[13px] text-ink-secondary">Nobody has signed up yet.</p>
      ) : (
        <div className="mt-6 space-y-6">
          <Section
            title="Added a website"
            count={added.length}
            tone="success"
            rows={added}
            empty="Nobody in this list has added a website yet."
          />
          <Section
            title="Not added a website yet"
            count={notYet.length}
            tone="muted"
            rows={notYet}
            empty="Everyone in this list has added a website."
          />
        </div>
      )}
    </Card>
  );
}

function Section({
  title,
  count,
  tone,
  rows,
  empty,
}: {
  title: string;
  count: number;
  tone: "success" | "muted";
  rows: SignupRow[];
  empty: string;
}) {
  const Icon = tone === "success" ? CircleCheck : CircleDashed;
  return (
    <section aria-label={title}>
      <h3 className="mb-2 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-faint">
        <Icon className={tone === "success" ? "size-3.5 text-success" : "size-3.5 text-ink-faint"} aria-hidden />
        {title}
        <span className="rounded-full bg-ink/[0.06] px-1.5 text-ink-secondary">{count}</span>
        <span className="h-px flex-1 bg-line" aria-hidden />
      </h3>
      {rows.length === 0 ? (
        <p className="py-2 text-[13px] text-ink-faint">{empty}</p>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-3 px-4 py-3">
              <span
                aria-hidden
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-ink/[0.06] text-[13px] font-semibold text-ink-secondary"
              >
                {row.name.charAt(0).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{row.name}</p>
                <p className="truncate font-mono text-[12px] text-ink-faint">{row.email}</p>
              </div>
              {row.sites && row.sites.length > 0 && (
                <div className="hidden min-w-0 items-center gap-1.5 sm:flex">
                  {row.sites.map((site) => (
                    <span
                      key={site.url}
                      title={`${site.name} (${site.url})`}
                      className="flex max-w-[160px] items-center gap-1.5 rounded-full border border-line py-0.5 pl-0.5 pr-2.5"
                    >
                      <SiteFavicon url={site.url} name={site.name} className="size-6 rounded-full border-0 [&_img]:size-4" />
                      <span className="truncate text-[12px] text-ink-secondary">{hostOf(site.url)}</span>
                    </span>
                  ))}
                  {row.websites > row.sites.length && (
                    <span className="text-[12px] text-ink-faint">+{row.websites - row.sites.length}</span>
                  )}
                </div>
              )}
              <div className="w-20 shrink-0 text-right">
                <p className="text-[12px] text-ink-secondary">{joinedAgo(row.joinedAt)}</p>
                <p className="text-[11.5px] text-ink-faint">
                  {row.websites === 0 ? "no websites" : `${row.websites} website${row.websites === 1 ? "" : "s"}`}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
