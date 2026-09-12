import { cn } from "@/lib/utils";

export function Card({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-card bg-card p-6 shadow-card", className)}>{children}</div>
  );
}

/**
 * Header row: optional icon, title left, optional action right.
 *
 * The icon is what lets someone scanning a long page find the section they
 * want without reading every heading - which is the whole reason a page of
 * cards needs them and a page of prose does not. It is decorative, so it is
 * hidden from screen readers: the heading text already says what this is.
 */
export function CardHeader({
  icon: Icon,
  title,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h3 className="flex min-w-0 items-center gap-2 text-[15px] font-semibold text-ink">
        {Icon && (
          <span
            aria-hidden
            className="inline-flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-accent"
          >
            <Icon className="size-4" />
          </span>
        )}
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </div>
  );
}

/** Small rounded-square icon chip, as in the reference's card corners. */
export function IconChip({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-10 items-center justify-center rounded-xl bg-card/60 text-ink",
        className,
      )}
    >
      {children}
    </span>
  );
}
