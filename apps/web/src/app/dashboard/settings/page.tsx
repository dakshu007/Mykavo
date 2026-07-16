import { prisma } from "@mykavo/database";
import { ButtonLink } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { ProfileForm } from "@/components/dashboard/profile-form";
import {
  TeamSettings,
  type PendingInviteView,
  type TeamMemberView,
} from "@/components/dashboard/team-settings";
import { formatLimit } from "@/config/plans";
import { getWorkspacePlan } from "@/lib/limits";
import { appBaseUrl } from "@/lib/app-url";
import { canManageMembers } from "@/lib/team";
import { requireSession, getCurrentMembership } from "@/lib/session";

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

export default async function SettingsPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(
    session.user.id,
    session.user.name,
  );
  const plan = await getWorkspacePlan(workspace.id);

  const [memberRows, inviteRows] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const manager = canManageMembers(role);
  const members: TeamMemberView[] = memberRows.map((m) => ({
    id: m.id,
    userId: m.userId,
    name: m.user.name,
    email: m.user.email,
    role: m.role,
    joined: formatDate(m.createdAt),
  }));
  const invites: PendingInviteView[] = inviteRows.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    expires: formatDate(inv.expiresAt),
    // Invite tokens are only ever surfaced to OWNER/ADMIN.
    ...(manager ? { acceptUrl: `${appBaseUrl()}/invite/${inv.token}` } : {}),
  }));

  // Key limits straight from the plan config — never hardcoded (spec §37).
  const planLimits: Array<[string, string]> = [
    ["Websites", formatLimit(plan.limits.websites)],
    ["Pages per website", formatLimit(plan.limits.pagesPerWebsite)],
    ["Scan frequency", plan.limits.scanFrequency === "DAILY" ? "Daily" : "Weekly"],
    ["History", `${formatLimit(plan.limits.historyDays)} days`],
  ];

  const rows: Array<[string, string]> = [
    ["Workspace name", workspace.name],
    ["Your role", roleLabel(role)],
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
        <CardHeader title="Team" />
        <TeamSettings
          members={members}
          invites={invites}
          currentUserId={session.user.id}
          currentRole={role}
          maxMembers={plan.limits.maxMembers}
          isFreePlan={plan.id === "free"}
        />
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
          Workspace renaming and notification preferences arrive in later releases.
        </p>
      </Card>
    </div>
  );
}
