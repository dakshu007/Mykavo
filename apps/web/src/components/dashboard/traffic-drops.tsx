import Link from "next/link";
import { TrendingDown, HelpCircle } from "lucide-react";
import type { TrafficDrop, DropConfidence } from "@mykavo/shared";
import { Card, CardHeader } from "@/components/ui/card";
import { ChangeSeverityBadge } from "@/components/dashboard/change-badges";

/**
 * "What changed before the drop?" - the one question no rank tracker or
 * analytics suite can answer, because none of them hold a record of how the
 * page changed.
 *
 * The `unexplained` state is deliberately prominent rather than hidden. When
 * traffic falls and nothing changed on the page, saying so is the useful
 * answer: it points at a Google update, seasonality or a competitor instead of
 * sending someone to "fix" an unrelated change that happened to be nearby.
 */

const CONFIDENCE: Record<
  DropConfidence,
  { label: string; chip: string; blurb: string }
> = {
  strong: {
    label: "Likely cause found",
    chip: "bg-critical-soft text-critical-strong",
    blurb: "A significant change landed on this page just before the drop.",
  },
  possible: {
    label: "Possible cause",
    chip: "bg-warning-soft text-warning-strong",
    blurb: "Something changed nearby, but it is a weaker match - check it before acting.",
  },
  unexplained: {
    label: "No change found",
    chip: "bg-surface-muted text-ink-secondary",
    blurb:
      "Nothing changed on this page in the two weeks before the drop. Look at a Google update, seasonality, or a competitor rather than the page itself.",
  },
};

function whenLabel(daysBefore: number): string {
  if (daysBefore <= 0) return "same day";
  if (daysBefore === 1) return "1 day before";
  return `${daysBefore} days before`;
}

function path(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname === "/" ? "/ (homepage)" : u.pathname + u.search;
  } catch {
    return url;
  }
}

export function TrafficDrops({ drops }: { drops: TrafficDrop[] }) {
  if (drops.length === 0) return null;

  return (
    <Card>
      <CardHeader title="What changed before the drop" />
      <p className="-mt-2 mb-4 text-[13px] leading-6 text-ink-secondary">
        Pages whose search clicks fell, matched against what MyKavo detected on them
        beforehand.
      </p>
      <ul className="divide-y divide-line">
        {drops.map((drop) => {
          const meta = CONFIDENCE[drop.confidence];
          return (
            <li key={drop.page} className="py-4">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <TrendingDown className="size-4 shrink-0 text-critical-strong" aria-hidden />
                <p className="font-mono text-[13px] text-ink">{path(drop.page)}</p>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${meta.chip}`}
                >
                  {meta.label}
                </span>
              </div>

              <p className="mt-1.5 text-sm text-ink-secondary">
                <span className="font-semibold text-ink">
                  -{drop.dropPercent}% clicks
                </span>{" "}
                from {drop.onsetDate} · {drop.clicksBefore} → {drop.clicksAfter} over 7 days ·
                average position {drop.positionBefore} → {drop.positionAfter}
              </p>

              {drop.suspects.length > 0 ? (
                <ul className="mt-2.5 space-y-1.5">
                  {drop.suspects.slice(0, 3).map((suspect) => (
                    <li key={suspect.id} className="flex flex-wrap items-center gap-2">
                      <ChangeSeverityBadge
                        severity={suspect.severity}
                        className="w-20 shrink-0 justify-center"
                      />
                      <Link
                        href={`/dashboard/changes/${suspect.id}`}
                        className="text-sm text-ink hover:underline"
                      >
                        {suspect.title}
                      </Link>
                      <span className="text-[13px] text-ink-faint">
                        {whenLabel(suspect.daysBefore)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2.5 flex items-start gap-2 text-[13px] leading-6 text-ink-secondary">
                  <HelpCircle className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
                  {meta.blurb}
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
