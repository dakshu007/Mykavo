import {
  areaPath,
  formatAxisTime,
  formatBucketLabel,
  formatMs,
  linePath,
  niceTicks,
  responseTimeStats,
  responseTimeSummary,
  splitTimeSegments,
  xAt,
  yAt,
} from "@/lib/health-charts";

/**
 * Average response time over the selected window — hand-rolled SVG area/line
 * chart, responsive via viewBox, server-rendered. X is time-proportional so
 * monitoring gaps show as real holes in the line (splitTimeSegments breaks
 * runs on missing buckets), never bridged. Dots appear only for sparse data;
 * dense series get invisible hover columns with `<title>` labels instead.
 */

export interface ResponseTimePoint {
  /** Bucket start, epoch milliseconds (UTC). */
  t: number;
  /** Average response time of successful checks; null = only failed checks. */
  avgMs: number | null;
}

// Geometry in viewBox units; the SVG scales to the card width.
const W = 640;
const H = 170;
const TOP = 10;
const BOTTOM = H - 26; // room for the x-axis labels
const LEFT = 42; // room for tick labels like "1.5 s"
const RIGHT = W - 6;

/** Render dots (with hover titles) only up to this many valued points. */
const MAX_DOTS = 48;

export function ResponseTimeChart({
  points,
  windowDays,
  bucketMinutes,
  domainStart,
  domainEnd,
}: {
  /** Buckets that contain checks, oldest → newest. Missing buckets = gaps. */
  points: ResponseTimePoint[];
  windowDays: number;
  bucketMinutes: number;
  /** Window start, epoch ms. */
  domainStart: number;
  /** Window end (now), epoch ms. */
  domainEnd: number;
}) {
  const values = points.map((p) => p.avgMs);
  const stats = responseTimeStats(values);

  if (!stats || domainEnd <= domainStart) {
    return (
      <p className="rounded-tile border border-dashed border-line px-4 py-6 text-center text-[13px] text-ink-secondary">
        No response-time data in this window yet. Checks run every 5 minutes while
        monitoring is active.
      </p>
    );
  }

  const ticks = niceTicks(stats.peakMs);
  const yMax = ticks[ticks.length - 1];
  const toX = (t: number) =>
    LEFT + ((t - domainStart) / (domainEnd - domainStart)) * (RIGHT - LEFT);
  const toY = (v: number) => yAt(v, yMax, TOP, BOTTOM);

  const bucketMs = bucketMinutes * 60_000;
  const segments = splitTimeSegments(
    points.map((p) => ({ t: p.t, v: p.avgMs })),
    bucketMs * 1.5,
    toX,
    toY,
  );

  const valued = points.filter(
    (p): p is ResponseTimePoint & { avgMs: number } => p.avgMs !== null,
  );
  const showDots = valued.length <= MAX_DOTS;
  // Hover columns for dense data: one invisible strip per bucket, one bucket wide.
  const hoverWidth = Math.max(
    1,
    ((RIGHT - LEFT) * bucketMs) / (domainEnd - domainStart),
  );

  // Four x-axis time labels across the domain.
  const axisTimes = [0, 1 / 3, 2 / 3, 1].map(
    (f) => domainStart + f * (domainEnd - domainStart),
  );

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="block w-full"
        role="img"
        aria-label={responseTimeSummary(values, windowDays)}
      >
        {/* Gridlines + y tick labels */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={LEFT}
              x2={RIGHT}
              y1={toY(tick).toFixed(1)}
              y2={toY(tick).toFixed(1)}
              className="stroke-line"
              strokeWidth={1}
            />
            <text
              x={LEFT - 6}
              y={toY(tick) + 3}
              textAnchor="end"
              fontSize={9}
              className="fill-ink-faint"
            >
              {tick === 0 ? "0" : formatMs(tick)}
            </text>
          </g>
        ))}

        {/* Area fill + line, one pair per contiguous run */}
        {segments.map((segment, i) => (
          <g key={i}>
            <path d={areaPath(segment, BOTTOM)} className="fill-primary" opacity={0.08} />
            {segment.length >= 2 ? (
              <path
                d={linePath(segment)}
                fill="none"
                className="stroke-primary"
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            ) : (
              // A run of one bucket has no line — mark it so it stays visible.
              <circle
                cx={segment[0].x.toFixed(1)}
                cy={segment[0].y.toFixed(1)}
                r={2.5}
                className="fill-primary"
              />
            )}
          </g>
        ))}

        {/* Sparse data: dots with hover titles */}
        {showDots &&
          valued.map((p) => (
            <circle
              key={p.t}
              cx={toX(p.t).toFixed(1)}
              cy={toY(p.avgMs).toFixed(1)}
              r={2.5}
              className="fill-primary"
            >
              <title>{formatBucketLabel(p.t, p.avgMs)}</title>
            </circle>
          ))}

        {/* Dense data: invisible hover columns instead of dots */}
        {!showDots &&
          points.map((p) => (
            <rect
              key={p.t}
              x={(toX(p.t) - hoverWidth / 2).toFixed(1)}
              y={TOP}
              width={hoverWidth.toFixed(1)}
              height={BOTTOM - TOP}
              fill="transparent"
            >
              <title>{formatBucketLabel(p.t, p.avgMs)}</title>
            </rect>
          ))}

        {/* X-axis time labels */}
        {axisTimes.map((t, i) => (
          <text
            key={t}
            x={xAt(i, axisTimes.length, LEFT, RIGHT)}
            y={H - 8}
            textAnchor={i === 0 ? "start" : i === axisTimes.length - 1 ? "end" : "middle"}
            fontSize={9}
            className="fill-ink-faint"
          >
            {formatAxisTime(t, windowDays)}
          </text>
        ))}
      </svg>

      <p className="mt-2 text-[12px] text-ink-secondary">
        Avg{" "}
        <span className="font-medium text-ink tabular-nums">{formatMs(stats.avgMs)}</span>
        <span className="text-ink-faint"> · </span>
        Peak{" "}
        <span className="font-medium text-ink tabular-nums">{formatMs(stats.peakMs)}</span>
        <span className="text-ink-faint"> · </span>
        Fastest{" "}
        <span className="font-medium text-ink tabular-nums">{formatMs(stats.minMs)}</span>
      </p>
    </div>
  );
}
