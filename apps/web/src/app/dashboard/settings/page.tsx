import { Card, CardHeader } from "@/components/ui/card";
import { requireSession, getCurrentWorkspace } from "@/lib/session";

export default async function SettingsPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

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
