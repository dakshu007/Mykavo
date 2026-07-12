import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { changes } from "./data";

const statusStyles: Record<string, string> = {
  NEW: "bg-primary-soft text-primary",
  REVIEWED: "bg-info-soft text-info",
  APPROVED: "bg-success-soft text-success-strong",
  RESOLVED: "bg-success-soft text-success-strong",
};

export function PreviewChanges() {
  return (
    <Card>
      <CardHeader
        title="Changes"
        action={
          <div className="flex gap-2">
            {["All websites", "All severities", "Last 7 days"].map((f) => (
              <span
                key={f}
                className="hidden rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary sm:inline-block"
              >
                {f}
              </span>
            ))}
          </div>
        }
      />
      <ul className="divide-y divide-line">
        {changes.map((c) => (
          <li key={c.title} className="flex items-center gap-4 py-4">
            <SeverityBadge severity={c.severity} className="w-24 shrink-0 justify-center" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-ink">{c.title}</p>
              <p className="truncate text-xs text-ink-faint">
                <span className="font-mono">
                  {c.website}
                  {c.page}
                </span>
                <span className="mx-1.5">·</span>
                {c.category.toLowerCase()}
              </p>
            </div>
            <span
              className={cn(
                "hidden rounded-full px-2.5 py-1 text-[11px] font-semibold sm:inline-block",
                statusStyles[c.status],
              )}
            >
              {c.status.charAt(0) + c.status.slice(1).toLowerCase()}
            </span>
            <span className="hidden w-20 text-right text-xs text-ink-faint md:block">
              {c.detected}
            </span>
            <ArrowUpRight className="size-4 shrink-0 text-ink-faint" aria-hidden />
          </li>
        ))}
      </ul>
    </Card>
  );
}
