import Link from "next/link";
import { CircleCheck, Clock, PauseCircle } from "lucide-react";
import type { WebsiteHealthSummary } from "./attention";
import { formatRelative, plural } from "./format";

interface ScanMoment {
  at: Date;
  websiteName: string;
}

function When({ at, now }: { at: Date; now: Date }) {
  return (
    <time dateTime={at.toISOString()} className="font-medium text-ink">
      {formatRelative(at, now)}
    </time>
  );
}

/**
 * What the Overview shows in place of the attention list when nothing needs
 * a person. Calm on purpose: silence is the success signal of a monitoring
 * product, so the card says when MyKavo last looked and when it looks next,
 * which is what makes "nothing to do" believable.
 */
export function AllClear({
  health,
  lastScan,
  nextScan,
  lowerPriorityOpen,
  now,
}: {
  health: WebsiteHealthSummary;
  lastScan: ScanMoment | null;
  nextScan: ScanMoment | null;
  lowerPriorityOpen: number;
  now: Date;
}) {
  const monitoring = health.healthy > 0;
  const settingUp = !monitoring && health.settingUp > 0;

  const Icon = monitoring ? CircleCheck : settingUp ? Clock : PauseCircle;
  const title = monitoring
    ? "Nothing needs your attention"
    : settingUp
      ? "Your baseline is on its way"
      : "Monitoring is paused";
  const body = monitoring
    ? `${plural(health.healthy, "website")} monitored and healthy.`
    : settingUp
      ? "MyKavo is capturing the approved state of your pages. Once it is saved, every scan is compared against it and anything important shows up here."
      : "No website is being scanned right now. Resume one to start monitoring again.";

  return (
    <section
      aria-labelledby="all-clear-heading"
      className="flex flex-col gap-4 rounded-card bg-card p-5 shadow-card sm:flex-row sm:items-start sm:p-6"
    >
      <span
        aria-hidden
        className={
          monitoring
            ? "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success-strong"
            : "inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-surface text-ink-secondary"
        }
      >
        <Icon className="size-5.5" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 id="all-clear-heading" className="text-[15px] font-semibold text-ink">
          {title}
        </h2>
        <p className="mt-1 max-w-prose text-[13px] leading-5 text-ink-secondary">{body}</p>

        {(lastScan || (monitoring && nextScan)) && (
          <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1.5 text-[13px] text-ink-secondary">
            {lastScan && (
              <div className="flex gap-1.5">
                <dt>Last scan</dt>
                <dd>
                  <When at={lastScan.at} now={now} /> on {lastScan.websiteName}
                </dd>
              </div>
            )}
            {monitoring && nextScan && (
              <div className="flex gap-1.5">
                <dt>Next scan</dt>
                <dd>
                  {nextScan.at.getTime() <= now.getTime() ? (
                    <span className="font-medium text-ink">due now</span>
                  ) : (
                    <When at={nextScan.at} now={now} />
                  )}{" "}
                  on {nextScan.websiteName}
                </dd>
              </div>
            )}
          </dl>
        )}

        {!monitoring && !settingUp && (
          <Link
            href="/dashboard/websites"
            className="mt-3 inline-flex rounded-sm text-[13px] font-medium text-accent hover:underline"
          >
            Go to websites
          </Link>
        )}

        {lowerPriorityOpen > 0 && (
          <p className="mt-3 text-[13px] text-ink-secondary">
            <Link
              href="/dashboard/changes?website=all"
              className="rounded-sm font-medium text-accent hover:underline"
            >
              {plural(lowerPriorityOpen, "lower-priority change")}
            </Link>{" "}
            {lowerPriorityOpen === 1 ? "is" : "are"} open for review when you have a moment.
          </p>
        )}
      </div>
    </section>
  );
}
