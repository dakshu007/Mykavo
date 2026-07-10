import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { formatLimit } from "@/config/plans";
import { getWorkspacePlan } from "@/lib/limits";
import { requireSession, getCurrentWorkspace } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);
  const plan = await getWorkspacePlan(workspace.id);

  // Key limits straight from the plan config — never hardcoded (spec §37).
  const planLimits: Array<[string, string]> = [
    ["Websites", formatLimit(plan.limits.websites)],
    ["Pages per website", formatLimit(plan.limits.pagesPerWebsite)],
    ["Scan frequency", plan.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly"],
    ["History", `${formatLimit(plan.limits.historyDays)} days`],
  ];

  const rows: Array<[string, string]> = [
    ["Workspace name", workspace.name],
    ["Your role", "Owner"],
    ["Account name", session.user.name],
    ["Account email", session.user.email],
    ["Member since", workspace.createdAt.toLocaleDateString("en-US", { dateStyle: "long" })],
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader
          title="Current plan"
          action={
            <ButtonLink href="/dashboard/billing" variant="secondary" size="sm">
              Manage billing
            </ButtonLink>
          }
        />
        <div className="flex items-baseline gap-2">
          <p className="text-xl font-semibold tracking-tight text-ink">{plan.name}</p>
          <p className="text-sm text-ink-secondary">${plan.priceMonthlyUsd}/month</p>
        </div>
        <dl className="mt-4 grid gap-2 sm:grid-cols-2">
          {planLimits.map(([k, v]) => (
            <div key={k} className="rounded-tile bg-surface px-4 py-3">
              <dt className="text-[13px] text-ink-secondary">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card>
        <CardHeader title="Profile" />
        <ProfileForm
          initialName={session.user.name}
          initialImage={session.user.image ?? null}
        />
      </Card>

      <Card>
        <CardHeader title="Workspace" />
        <dl className="divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4 py-3">
              <dt className="w-40 shrink-0 text-sm font-medium text-ink-secondary">{k}</dt>
              <dd className="min-w-0 break-words text-sm text-ink">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-ink-secondary">
          Workspace renaming, team members, and notification preferences arrive in later
          releases.
        </p>
      </Card>
    </div>
  );
}
