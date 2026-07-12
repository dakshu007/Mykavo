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

/** Header row: title left, optional action/icon chip right (reference pattern). */
export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between", className)}>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
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
