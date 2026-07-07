import Link from "next/link";
import { Bell, CalendarClock, Globe, Radar } from "lucide-react";
import { Card, CardHeader, IconChip } from "@/components/ui/card";

const stats = [
  { label: "Websites monitored", value: "0", icon: Globe },
  { label: "Open changes", value: "0", icon: Bell },
  { label: "Scans this week", value: "0", icon: CalendarClock },
];

export default function DashboardOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader
              title={s.label}
              action={
                <IconChip className="bg-surface">
                  <s.icon className="size-4.5 text-ink-secondary" aria-hidden />
                </IconChip>
              }
            />
            <p className="text-5xl font-semibold tracking-tight text-ink">{s.value}</p>
          </Card>
        ))}
      </div>

      {/* Onboarding — first useful result within minutes (spec §4.1) */}
      <div className="rounded-card bg-card p-8 text-center shadow-card">
        <span className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-primary-soft">
          <Radar className="size-6 text-primary" aria-hidden />
        </span>
        <h2 className="text-xl font-semibold tracking-tight text-ink">
          Add your first website
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-secondary">
          Point Fluxen at a website, pick the pages that matter, and approve your first
          baseline. Website monitoring setup arrives in the next release — your workspace is
          ready for it.
        </p>
        <Link
          href="/dashboard/websites"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Go to Websites
        </Link>
      </div>
    </div>
  );
}
