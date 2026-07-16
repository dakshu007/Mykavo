import type { ScanStatus } from "@mykavo/database";
import { cn } from "@/lib/utils";

const styles: Record<ScanStatus, { chip: string; label: string }> = {
  QUEUED: { chip: "bg-info-soft text-info", label: "Queued" },
  RUNNING: { chip: "bg-primary-soft text-primary", label: "Running" },
  COMPLETED: { chip: "bg-success-soft text-success-strong", label: "Completed" },
  PARTIAL: { chip: "bg-warning-soft text-warning-strong", label: "Partial" },
  FAILED: { chip: "bg-critical-soft text-critical-strong", label: "Failed" },
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
