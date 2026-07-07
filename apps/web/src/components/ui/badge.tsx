import { cn } from "@/lib/utils";

export type Severity = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "INFO";

const severityStyles: Record<Severity, { chip: string; dot: string; label: string }> = {
  CRITICAL: { chip: "bg-critical-soft text-red-700", dot: "bg-critical", label: "Critical" },
  HIGH: { chip: "bg-orange-soft text-orange-700", dot: "bg-orange", label: "High" },
  MEDIUM: { chip: "bg-warning-soft text-amber-700", dot: "bg-warning", label: "Medium" },
  LOW: { chip: "bg-primary-soft text-primary", dot: "bg-primary", label: "Low" },
  INFO: { chip: "bg-info-soft text-info", dot: "bg-info", label: "Info" },
};

/** Severity is always color + text label, never color alone. */
export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
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

export type Health = "healthy" | "attention" | "critical" | "paused";

const healthStyles: Record<Health, { dot: string; text: string; label: string }> = {
  healthy: { dot: "bg-success", text: "text-green-700", label: "Healthy" },
  attention: { dot: "bg-warning", text: "text-amber-700", label: "Needs attention" },
  critical: { dot: "bg-critical", text: "text-red-700", label: "Critical" },
  paused: { dot: "bg-ink-faint", text: "text-ink-faint", label: "Paused" },
};

export function HealthStatus({ health, className }: { health: Health; className?: string }) {
  const h = healthStyles[health];
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[13px] font-medium", h.text, className)}>
      <span className={cn("size-2 rounded-full", h.dot)} aria-hidden />
      {h.label}
    </span>
  );
}

/** White pill chip with icon + value — reference's profile stat chips. */
export function Pill({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full bg-card px-3.5 py-2 text-[13px] font-medium text-ink shadow-card",
        className,
      )}
    >
      {children}
    </span>
  );
}
