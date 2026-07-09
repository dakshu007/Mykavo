import { cn } from "@/lib/utils";

const styles = {
  DRAFT: { chip: "bg-info-soft text-info", dot: "bg-info", label: "Draft" },
  PUBLISHED: { chip: "bg-success-soft text-green-700", dot: "bg-success", label: "Published" },
} as const;

export function PostStatusBadge({
  status,
  className,
}: {
  status: keyof typeof styles;
  className?: string;
}) {
  const s = styles[status];
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
