import { Check, ExternalLink, Eye, X } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { SeverityBadge } from "@/components/ui/badge";
import { changeDetail as d } from "./data";

function BrowserFrame({
  label,
  tone,
  children,
}: {
  label: string;
  tone: "before" | "after";
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-tile border border-line">
      <div className="flex items-center gap-2 border-b border-line bg-surface px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden>
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
          <span className="size-2.5 rounded-full bg-line" />
        </span>
        <span className="ml-1 font-mono text-xs text-ink-faint">aurora-outdoor.com/pricing</span>
        <span
          className={
            tone === "before"
              ? "ml-auto rounded-full bg-success-soft px-2.5 py-0.5 text-[11px] font-semibold text-green-700"
              : "ml-auto rounded-full bg-critical-soft px-2.5 py-0.5 text-[11px] font-semibold text-red-700"
          }
        >
          {label}
        </span>
      </div>
      <div className="bg-card p-5">{children}</div>
    </div>
  );
}

function MockPricingBlock({ withButton }: { withButton: boolean }) {
  return (
    <div className="space-y-3">
      <div className="h-3 w-2/5 rounded-full bg-surface" />
      <div className="h-2.5 w-4/5 rounded-full bg-surface" />
      <div className="h-2.5 w-3/5 rounded-full bg-surface" />
      <div className="pt-2">
        {withButton ? (
          <span className="inline-flex h-9 items-center rounded-full bg-primary px-5 text-[13px] font-medium text-white">
            Start Free Trial
          </span>
        ) : (
          <span className="inline-flex h-9 items-center rounded-full border-2 border-dashed border-critical/50 px-5 text-[13px] font-medium text-red-700">
            Element missing
          </span>
        )}
      </div>
    </div>
  );
}

const rows = [
  { label: "Existence", prev: d.previous.existence, curr: d.current.existence, changed: true },
  { label: "Visibility", prev: d.previous.visibility, curr: d.current.visibility, changed: true },
  { label: "Text", prev: d.previous.text, curr: d.current.text, changed: true },
  { label: "Link (href)", prev: d.previous.href, curr: d.current.href, changed: true },
];

export function PreviewChangeDetail() {
  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2.5">
              <SeverityBadge severity={d.severity} />
              <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-secondary">
                {d.category}
              </span>
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-ink">{d.title}</h2>
            <p className="mt-1 font-mono text-[13px] text-ink-faint">
              {d.website}
              {d.page} · {d.detected} · {d.scan}
            </p>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary">
              <Eye className="size-4" aria-hidden /> Mark reviewed
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary">
              <X className="size-4" aria-hidden /> Ignore
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-white">
              <Check className="size-4" aria-hidden /> Approve change
            </span>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <BrowserFrame label="Baseline · approved 2 Jul" tone="before">
          <MockPricingBlock withButton />
        </BrowserFrame>
        <BrowserFrame label="Current scan · today" tone="after">
          <MockPricingBlock withButton={false} />
        </BrowserFrame>
      </div>

      <Card>
        <CardHeader
          title="What changed"
          action={
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-primary">
              Open affected page <ExternalLink className="size-3.5" aria-hidden />
            </span>
          }
        />
        <p className="-mt-3 mb-4 font-mono text-xs text-ink-faint">
          Monitored element: {d.element}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full min-w-120 text-left">
            <thead>
              <tr className="label-micro border-b border-line">
                <th className="py-3 pr-4 font-semibold">Property</th>
                <th className="py-3 pr-4 font-semibold">Baseline</th>
                <th className="py-3 font-semibold">Current</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rows.map((r) => (
                <tr key={r.label}>
                  <td className="py-3.5 pr-4 text-sm font-medium text-ink">{r.label}</td>
                  <td className="py-3.5 pr-4">
                    <span className="rounded-md bg-success-soft px-2 py-1 font-mono text-[13px] text-green-700">
                      {r.prev}
                    </span>
                  </td>
                  <td className="py-3.5">
                    <span className="rounded-md bg-critical-soft px-2 py-1 font-mono text-[13px] text-red-700">
                      {r.curr}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
