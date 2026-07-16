import type { ChangeSeverity, ChangeStatus, ChangeCategory } from "@mykavo/database";
import { cn } from "@/lib/utils";

const severityStyles: Record<ChangeSeverity, { chip: string; dot: string; label: string }> = {
  CRITICAL: { chip: "bg-critical-soft text-critical-strong", dot: "bg-critical", label: "Critical" },
  HIGH: { chip: "bg-orange-soft text-orange-strong", dot: "bg-orange", label: "High" },
  MEDIUM: { chip: "bg-warning-soft text-warning-strong", dot: "bg-warning", label: "Medium" },
  LOW: { chip: "bg-primary-soft text-primary", dot: "bg-primary", label: "Low" },
  INFO: { chip: "bg-info-soft text-info", dot: "bg-info", label: "Info" },
};

export function ChangeSeverityBadge({
  severity,
  className,
}: {
  severity: ChangeSeverity;
  className?: string;
}) {
  const s = severityStyles[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        s.chip,
        className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", s.dot)} aria-hidden />
      {s.label}
    </span>
  );
}

const statusStyles: Record<ChangeStatus, string> = {
  NEW: "bg-primary-soft text-primary",
  REVIEWED: "bg-info-soft text-info",
  APPROVED: "bg-success-soft text-success-strong",
  RESOLVED: "bg-success-soft text-success-strong",
  IGNORED: "bg-info-soft text-ink-faint",
};

export function ChangeStatusBadge({ status }: { status: ChangeStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
        statusStyles[status],
      )}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

const categoryLabels: Record<ChangeCategory, string> = {
  AVAILABILITY: "Availability",
  VISUAL: "Visual",
  SEO: "SEO",
  CONTENT: "Content",
  LINKS: "Links",
  SCRIPT: "Scripts",
  PERFORMANCE: "Performance",
  CONVERSION: "Conversion",
};

export function ChangeCategoryChip({ category }: { category: ChangeCategory }) {
  return (
    <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
      {categoryLabels[category]}
    </span>
  );
}
