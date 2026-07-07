import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card bg-card px-6 py-16 text-center shadow-card">
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary-soft">
        <Icon className="size-6 text-primary" aria-hidden />
      </span>
      <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
      <p className="mt-1.5 max-w-sm text-sm leading-6 text-ink-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
