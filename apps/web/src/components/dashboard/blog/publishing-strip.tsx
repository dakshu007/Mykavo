import { cn } from "@/lib/utils";
import type { CalendarDay, SlotCell } from "./blog-board";

const dayLabel = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const weekday = new Intl.DateTimeFormat("en-US", { weekday: "narrow", timeZone: "UTC" });

function cellClass(cell: SlotCell, future: boolean) {
  if (cell.state === "live") return "bg-ink";
  if (cell.state === "scheduled") return "border-[1.5px] border-dashed border-ink bg-primary";
  return future ? "border border-dashed border-line" : "bg-ink/[0.07]";
}

function cellTitle(day: number, slot: string, cell: SlotCell) {
  const when = `${dayLabel.format(day)} ${slot}`;
  if (cell.state === "empty") return `${when}: nothing published`;
  return `${when} (${cell.state === "live" ? "live" : "scheduled"}): ${cell.titles.join(", ")}`;
}

/**
 * The publishing calendar: one column per day for the last four weeks and
 * the week ahead, each with a morning (04:30 UTC) and an evening (12:30 UTC)
 * cell. Filled is live, yellow and dashed is scheduled, grey is a missed
 * slot. Read left to right it shows the rhythm, and any gap, at a glance.
 */
export function PublishingStrip({ days, streak }: { days: CalendarDay[]; streak: number }) {
  const filled = days.filter((d) => !d.isFuture).reduce((n, d) => n + (d.morning.state === "live" ? 1 : 0) + (d.evening.state === "live" ? 1 : 0), 0);
  const pastSlots = days.filter((d) => !d.isFuture).length * 2;

  return (
    <section aria-labelledby="blog-calendar" className="rounded-2xl border border-line bg-card p-5 sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">Publishing calendar</p>
          <h2 id="blog-calendar" className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            {streak > 0 ? (
              <>
                <span className="mk-highlight">{streak}-day</span> publishing streak
              </>
            ) : (
              "No streak running"
            )}
          </h2>
        </div>
        <p className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">
          {filled} of {pastSlots} slots filled, last 4 weeks
        </p>
      </div>

      <div className="flex gap-2">
        {/* Slot labels */}
        <div className="flex shrink-0 flex-col gap-[3px] pt-px font-mono text-[9.5px] uppercase leading-none text-ink-faint" aria-hidden>
          <span className="flex h-5 items-center">AM</span>
          <span className="flex h-5 items-center">PM</span>
        </div>
        <ol className="flex min-w-0 flex-1 gap-[3px] pb-5" aria-label="Posts per day, morning and evening">
          {days.map((d) => {
            const monday = new Date(d.day).getUTCDay() === 1;
            return (
              <li key={d.day} className="relative flex min-w-0 flex-1 flex-col items-stretch gap-[3px]">
                {(["morning", "evening"] as const).map((slot) => (
                  <span
                    key={slot}
                    title={cellTitle(d.day, slot, d[slot])}
                    className={cn("block h-5 rounded-[3px]", cellClass(d[slot], d.isFuture), d.isToday && "ring-2 ring-accent ring-offset-1 ring-offset-card")}
                  />
                ))}
                <span
                  className={cn(
                    "absolute left-1/2 top-full mt-1.5 -translate-x-1/2 whitespace-nowrap font-mono text-[9.5px] leading-none",
                    d.isToday ? "font-semibold text-ink" : "text-ink-faint",
                    !d.isToday && !monday && "max-sm:invisible",
                  )}
                  aria-hidden
                >
                  {d.isToday ? "Today" : monday ? dayLabel.format(d.day).split(" ")[1] : weekday.format(d.day)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>

      <ul className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-ink-secondary">
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-ink" aria-hidden /> Live
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] border-[1.5px] border-dashed border-ink bg-primary" aria-hidden /> Scheduled
        </li>
        <li className="flex items-center gap-1.5">
          <span className="size-3 rounded-[3px] bg-ink/[0.07]" aria-hidden /> Nothing published
        </li>
        <li className="ml-auto font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">AM 04:30 UTC / PM 12:30 UTC</li>
      </ul>
    </section>
  );
}
