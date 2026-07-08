import type { ScanStatus } from "@fluxen/database";
import { cn } from "@/lib/utils";

const styles: Record<ScanStatus, { chip: string; label: string }> = {
  QUEUED: { chip: "bg-info-soft text-info", label: "Queued" },
  RUNNING: { chip: "bg-primary-soft text-primary", label: "Running" },
  COMPLETED: { chip: "bg-success-soft text-green-700", label: "Completed" },
  PARTIAL: { chip: "bg-warning-soft text-amber-700", label: "Partial" },
  FAILED: { chip: "bg-critical-soft text-red-700", label: "Failed" },
};

export function ScanStatusBadge({
  status,
  className,
}: {
  status: ScanStatus;
  className?: string;
}) {
  const s = styles[status];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        s.chip,
        className,
      )}
    >
      {s.label}
    </span>
  );
}
