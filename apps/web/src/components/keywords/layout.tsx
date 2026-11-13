import { FlapNumber } from "@/components/dashboard/overview/summary-row";
import { cn } from "@/lib/utils";

/**
 * Layout pieces for the AI Keywords pages, in the same dashboard style as
 * Automations, Notifications and All Usage: a mono micro label, a split-flap
 * figure strip, and numbered sections with a header row.
 */

export function Micro({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint", className)}>
      {children}
    </p>
  );
}

export interface Tile {
  label: string;
  /** A number shows as split-flap digits; a string (like "Unlimited") as text. */
  value: number | string;
  note: string;
  warn?: boolean;
}

export function TileStrip({ tiles }: { tiles: Tile[] }) {
  return (
    <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border-[1.5px] border-ink bg-card shadow-[5px_5px_0_var(--color-primary)] lg:grid-cols-4">
      {tiles.map((tile, i) => (
        <div
          key={tile.label}
          className={cn(
            "flex flex-col gap-3 p-4 sm:p-5",
            i % 2 === 1 && "border-l border-line",
            i >= 2 && "border-t border-line lg:border-t-0",
            i === 2 && "lg:border-l",
          )}
        >
          <dt className="font-mono text-[10.5px] font-medium uppercase tracking-[0.14em] text-ink-faint">{tile.label}</dt>
          <dd className="order-first flex h-11 items-center sm:h-12">
            {typeof tile.value === "number" ? (
              <FlapNumber value={tile.value} index={i} />
            ) : (
              <span className="text-[24px] font-semibold tracking-tight text-ink">{tile.value}</span>
            )}
          </dd>
          <dd className={cn("-mt-1 text-xs", tile.warn ? "font-medium text-critical-strong" : "text-ink-secondary")}>
            {tile.note}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** A numbered section: "01 / Setup", a title, a line of help, an optional readout on the right. */
export function Section({
  id,
  number,
  kind,
  title,
  description,
  meta,
  children,
  flush = false,
}: {
  id: string;
  number: number;
  kind: string;
  title: string;
  description: string;
  meta?: React.ReactNode;
  children: React.ReactNode;
  /** Content runs edge to edge (lists with their own dividers). */
  flush?: boolean;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card">
      <header className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 pb-4 pt-5 sm:px-6">
        <div className="min-w-0">
          <Micro>
            {String(number).padStart(2, "0")} / {kind}
          </Micro>
          <h2 id={`${id}-title`} className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-0.5 max-w-2xl text-[13px] text-ink-secondary">{description}</p>
        </div>
        {meta && <div className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{meta}</div>}
      </header>
      <div className={flush ? "" : "px-5 py-5 sm:px-6"}>{children}</div>
    </section>
  );
}

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "green" | "accent" | "neutral" | "warning";
  children: React.ReactNode;
}) {
  const cls = {
    green: "bg-success-soft text-success-strong",
    accent: "bg-primary-soft text-accent",
    neutral: "bg-ink/5 text-ink-secondary",
    warning: "bg-warning-soft text-warning-strong",
  }[tone];
  return <span className={cn("whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", cls)}>{children}</span>;
}

export function Popularity({ value }: { value: number }) {
  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={`Popularity estimate ${value} of 5`}
      title="Estimate from Google's suggestions, not a search volume"
    >
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={cn("size-1.5 rounded-full", i <= value ? "bg-accent" : "bg-ink/15")} />
      ))}
    </span>
  );
}

/** Skeleton used by the loading screens, so a click shows something at once. */
export function SkeletonPage({ sections = 3 }: { sections?: number }) {
  return (
    <div className="max-w-6xl space-y-6" aria-busy aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="space-y-3">
        <div className="h-3 w-56 animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
        <div className="h-9 w-[min(560px,90%)] animate-pulse rounded-lg bg-ink/10 motion-reduce:animate-none" />
        <div className="h-4 w-[min(420px,80%)] animate-pulse rounded bg-ink/10 motion-reduce:animate-none" />
      </div>
      <div className="h-[124px] animate-pulse rounded-2xl border-[1.5px] border-ink/20 bg-card motion-reduce:animate-none" />
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border border-line bg-card motion-reduce:animate-none" />
      ))}
    </div>
  );
}
