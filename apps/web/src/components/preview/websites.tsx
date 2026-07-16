import { Globe, MoreHorizontal, Play } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { HealthStatus, SeverityBadge } from "@/components/ui/badge";
import { websites } from "./data";

export function PreviewWebsites() {
  return (
    <Card>
      <CardHeader
        title="Websites"
        action={
          <span className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast">
            <Globe className="size-4" aria-hidden /> Add website
          </span>
        }
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-175 text-left">
          <thead>
            <tr className="label-micro border-b border-line">
              <th className="py-3 pr-4 font-semibold">Website</th>
              <th className="py-3 pr-4 font-semibold">Status</th>
              <th className="py-3 pr-4 font-semibold">Pages</th>
              <th className="py-3 pr-4 font-semibold">Open changes</th>
              <th className="py-3 pr-4 font-semibold">Last scan</th>
              <th className="py-3 pr-4 font-semibold">Next scan</th>
              <th className="py-3 font-semibold">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {websites.map((w) => (
              <tr key={w.domain}>
                <td className="py-4 pr-4">
                  <p className="text-sm font-medium text-ink">{w.name}</p>
                  <p className="font-mono text-xs text-ink-faint">{w.domain}</p>
                </td>
                <td className="py-4 pr-4">
                  <HealthStatus health={w.health} />
                </td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">{w.pages}</td>
                <td className="py-4 pr-4">
                  {w.openChanges > 0 && w.highestSeverity ? (
                    <span className="inline-flex items-center gap-2">
                      <span className="text-sm font-medium text-ink">{w.openChanges}</span>
                      <SeverityBadge severity={w.highestSeverity} />
                    </span>
                  ) : (
                    <span className="text-sm text-ink-faint">-</span>
                  )}
                </td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">{w.lastScan}</td>
                <td className="py-4 pr-4 text-sm text-ink-secondary">{w.nextScan}</td>
                <td className="py-4">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface text-ink-secondary">
                      <Play className="size-3.5" aria-hidden />
                    </span>
                    <span className="inline-flex size-8 items-center justify-center rounded-full bg-surface text-ink-secondary">
                      <MoreHorizontal className="size-3.5" aria-hidden />
                    </span>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
