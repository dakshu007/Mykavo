import type { WebsiteHealthSummary } from "./attention";
import { plural } from "./format";

/**
 * The Overview's figures, shown as a split-flap board: each digit on its own
 * dark tile with a hairline across the middle, like a departures board. One
 * bordered strip with MyKavo's hard yellow shadow, four readouts inside.
 *
 * The tiles are a fixed dark colour in both themes (it is a physical-looking
 * display, not a surface), and the plain number is repeated for screen
 * readers, which would otherwise read the digits one by one.
 */
export function SummaryRow({
  websites,
  monitoredPages,
  health,
  scansLast7Days,
  changesLast30Days,
}: {
  websites: number;
  monitoredPages: number;
  health: WebsiteHealthSummary;
  scansLast7Days: number;
  changesLast30Days: number;
}) {
  const healthNote =
    health.needsAttention > 0
      ? `${health.needsAttention} need${health.needsAttention === 1 ? "s" : ""} attention`
      : health.settingUp > 0
        ? `${health.settingUp} setting up`
        : health.paused > 0
          ? `${health.paused} paused`
          : "None need attention";

  const tiles = [
    { label: "Websites monitored", value: websites, note: `${plural(monitoredPages, "page")} watched` },
    { label: "Healthy", value: health.healthy, note: healthNote, warn: health.needsAttention > 0 },
    { label: "Scans completed", value: scansLast7Days, note: "Last 7 days" },
    { label: "Changes caught", value: changesLast30Days, note: "Last 30 days" },
  ];

  return (
    <section aria-labelledby="summary-heading">
      <h2 id="summary-heading" className="sr-only">
        Summary
      </h2>
      <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] xl:grid-cols-4">
        {tiles.map((t, i) => (
          <div
            key={t.label}
            className={[
              "flex flex-col gap-3 p-4 sm:p-5",
              i % 2 === 1 ? "border-l border-line" : "",
              i >= 2 ? "border-t border-line xl:border-t-0" : "",
              i === 2 ? "xl:border-l" : "",
            ].join(" ")}
          >
            <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">
              {t.label}
            </dt>
            <dd className="order-first">
              <FlapNumber value={t.value} index={i} />
            </dd>
            <dd
              className={
                t.warn
                  ? "-mt-1 flex items-center gap-1.5 text-xs font-medium text-critical-strong"
                  : "-mt-1 text-xs text-ink-secondary"
              }
            >
              {t.warn && <span aria-hidden className="size-1.5 animate-pulse rounded-full bg-critical" />}
              {t.note}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/** At least two digits, so single figures still read as a board: 04, 22. */
function FlapNumber({ value, index }: { value: number; index: number }) {
  const digits = String(Math.max(0, Math.floor(value))).padStart(2, "0").split("");
  return (
    <span className="flex">
      <span className="sr-only">{value}</span>
      <span aria-hidden className="flex gap-[3px]">
        {digits.map((d, j) => (
          <span
            key={j}
            className="flap-digit relative inline-flex h-11 w-8 items-center justify-center overflow-hidden rounded-[5px] bg-[#16181d] font-mono text-[26px] font-semibold leading-none text-[#f3f1e8] shadow-[inset_0_-2px_0_rgb(0_0_0/35%)] ring-1 ring-white/10 sm:h-12 sm:w-9 sm:text-[28px]"
            style={{ animationDelay: `${index * 90 + j * 60}ms` }}
          >
            {d}
            {/* The split across the middle of a flap tile. */}
            <span className="absolute inset-x-0 top-1/2 h-px bg-black/60" />
          </span>
        ))}
      </span>
    </span>
  );
}
