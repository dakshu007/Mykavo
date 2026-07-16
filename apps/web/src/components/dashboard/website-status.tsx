import type { WebsiteStatus } from "@mykavo/database";
import { cn } from "@/lib/utils";

const styles: Record<WebsiteStatus, { dot: string; text: string; label: string }> = {
  PENDING: { dot: "bg-primary", text: "text-primary", label: "Ready to baseline" },
  DISCOVERING: { dot: "bg-warning", text: "text-warning-strong", label: "Discovering" },
  BASELINING: { dot: "bg-warning", text: "text-warning-strong", label: "Baselining" },
  ACTIVE: { dot: "bg-success", text: "text-success-strong", label: "Monitoring" },
  PAUSED: { dot: "bg-ink-faint", text: "text-ink-faint", label: "Paused" },
  ERROR: { dot: "bg-critical", text: "text-critical-strong", label: "Error" },
};

export function WebsiteStatusBadge({
  status,
  className,
}: {
  status: WebsiteStatus;
  className?: string;
}) {
  const s = styles[status];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", s.text, className)}
    >
      <span className={cn("size-2 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}
