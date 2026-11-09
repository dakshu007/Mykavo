import { prisma } from "@mykavo/database";
import {
  Building2,
  CreditCard,
  Palette,
  Plug,
  ShieldCheck,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ButtonLink } from "@/components/ui/button";
import { ProfileForm } from "@/components/dashboard/profile-form";
import { BrandingForm } from "@/components/dashboard/branding-form";
import { TwoFactorCard } from "@/components/dashboard/two-factor-card";
import {
  TeamSettings,
  type PendingInviteView,
  type TeamMemberView,
} from "@/components/dashboard/team-settings";
import { formatLimit, getPlan } from "@/config/plans";
import { getWorkspacePlan } from "@/lib/limits";
import { appBaseUrl } from "@/lib/app-url";
import { canManageMembers } from "@/lib/team";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { loadConnectedSites } from "@/lib/site-connections";
import { ConnectedSites } from "@/components/dashboard/connected-sites";

function roleLabel(role: string): string {
  return role.charAt(0) + role.slice(1).toLowerCase();
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { dateStyle: "medium" });
}

/**
 * One settings section: a micro label, a title and a one-line description in
 * the same header row on every section, then its content. Anchored by id so
 * the index on the left (and any #link) can jump straight to it.
 */
function Section({
  id,
  label,
  title,
  description,
  action,
  children,
}: {
  id: string;
  label: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-line bg-card"
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
        <div className="min-w-0">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{label}</p>
          <h2 id={`${id}-title`} className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            {title}
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">{description}</p>
        </div>
        {action}
      </header>
      <div className="px-5 py-5 sm:px-6">{children}</div>
    </section>
  );
}

interface IndexItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

export default async function SettingsPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(
    session.user.id,
    session.user.name,
  );
  const plan = await getWorkspacePlan(workspace.id);

  const [memberRows, inviteRows, account, branding] = await Promise.all([
    prisma.workspaceMember.findMany({
      where: { workspaceId: workspace.id },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.workspaceInvite.findMany({
      where: { workspaceId: workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "asc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        twoFactorEnabled: true,
        // 2FA enable/disable requires a password - Google-only accounts
        // manage 2FA through Google itself.
        accounts: { where: { providerId: "credential" }, select: { id: true } },
      },
    }),
    prisma.workspace.findUnique({
      where: { id: workspace.id },
      select: { brandName: true, brandLogoUrl: true, brandColor: true },
    }),
  ]);

  const manager = canManageMembers(role);
  // Each browser that pressed Connect holds a token for this workspace;
  // listing them is the only way to see and revoke one.
  const chromeConnections = await loadConnectedSites(workspace.id, "chrome");
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

  // Key limits straight from the plan config - never hardcoded (spec §37).
  // A trial's website cap is below the plan it trials, so say so next to
  // the number (e.g. "3 during the trial (Pro has 8)").
  const paidPlan = plan.trial ? getPlan(plan.id) : null;
  const websitesLimit = paidPlan
    ? `${formatLimit(plan.limits.websites)} during the trial (${paidPlan.name} has ${formatLimit(paidPlan.limits.websites)})`
    : formatLimit(plan.limits.websites);
  const planLimits: Array<[string, string]> = [
    ["Websites", websitesLimit],
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

  const index: IndexItem[] = [
    { id: "plan", label: "Plan", icon: CreditCard },
    { id: "workspace", label: "Workspace", icon: Building2 },
    { id: "team", label: "Team", icon: Users },
    { id: "branding", label: "Branding", icon: Palette },
    { id: "profile", label: "Profile", icon: UserRound },
    { id: "security", label: "Security", icon: ShieldCheck },
    ...(chromeConnections.length > 0 ? [{ id: "connections", label: "Connections", icon: Plug }] : []),
  ];

  return (
    <div className="max-w-5xl">
      <header className="mb-6">
        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Settings</p>
        <h1 className="mt-1.5 text-[28px] font-semibold tracking-[-0.02em] text-ink">{workspace.name}</h1>
        <p className="mt-1 text-[14px] text-ink-secondary">Your plan, team, report branding and account, in one place.</p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[190px_minmax(0,1fr)] lg:gap-10">
        {/* Section index: a sticky list on wide screens, a scrolling chip row on phones. */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-24 lg:self-start">
          <ul className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1 lg:mx-0 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:px-0 lg:pb-0">
            {index.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.id} className="shrink-0">
                  <a
                    href={`#${item.id}`}
                    className="flex items-center gap-2.5 whitespace-nowrap rounded-full border border-line px-3 py-1.5 text-[13px] text-ink-secondary transition-colors hover:bg-ink/[0.04] hover:text-ink lg:rounded-lg lg:border-transparent lg:px-2.5"
                  >
                    <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          <Section
            id="plan"
            label="Plan"
            title="Current plan"
            description="What this workspace can monitor, and how often."
            action={
              <ButtonLink href="/dashboard/billing" variant="secondary" size="sm">
                Manage billing
              </ButtonLink>
            }
          >
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <p className="text-[22px] font-semibold tracking-tight text-ink">{plan.name}</p>
              <span className="rounded-md bg-ink/[0.06] px-2 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-ink-secondary">
                {plan.trial ? "Trial" : plan.priceMonthlyUsd > 0 ? "Active" : "Free"}
              </span>
              <p className="text-[13px] text-ink-secondary">
                {plan.trial
                  ? `Trial ends ${plan.trial.endsAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}, no charge`
                  : `$${plan.priceMonthlyUsd}/month`}
              </p>
            </div>
            <dl className="mt-5 grid overflow-hidden rounded-xl border border-line sm:grid-cols-2 xl:grid-cols-4">
              {planLimits.map(([k, v], i) => (
                <div
                  key={k}
                  className={[
                    "px-4 py-3.5",
                    i > 0 ? "border-t border-line" : "",
                    i === 1 ? "sm:border-l sm:border-t-0" : "",
                    i === 2 ? "xl:border-l xl:border-t-0" : "",
                    i === 3 ? "sm:border-l xl:border-t-0" : "",
                  ].join(" ")}
                >
                  <dt className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-ink-faint">{k}</dt>
                  <dd className="mt-1 text-[15px] font-semibold text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section id="workspace" label="Workspace" title="Workspace details" description="Who you are in this workspace.">
            <dl className="divide-y divide-line">
              {rows.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-0.5 py-2.5 first:pt-0 last:pb-0 sm:flex-row sm:gap-4">
                  <dt className="w-40 shrink-0 text-[13px] text-ink-secondary">{k}</dt>
                  <dd className="min-w-0 break-words text-[14px] font-medium text-ink">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-[12.5px] text-ink-faint">
              Workspace renaming and notification preferences arrive in later releases.
            </p>
          </Section>

          <Section id="team" label="Team" title="Team" description="People who can see and manage this workspace.">
            <TeamSettings
              members={members}
              invites={invites}
              currentUserId={session.user.id}
              currentRole={role}
              maxMembers={plan.limits.maxMembers}
              isFreePlan={plan.id === "free"}
            />
          </Section>

          <Section
            id="branding"
            label="Branding"
            title="Agency branding"
            description="Your logo, name and colour on shared client reports."
          >
            <BrandingForm
              initialName={branding?.brandName ?? null}
              initialLogoUrl={branding?.brandLogoUrl ?? null}
              initialColor={branding?.brandColor ?? null}
              isPro={plan.limits.whiteLabelReports}
              canEdit={manager}
            />
          </Section>

          <Section id="profile" label="Account" title="Profile" description="Your name and photo across MyKavo.">
            <ProfileForm initialName={session.user.name} initialImage={session.user.image ?? null} />
          </Section>

          <Section id="security" label="Account" title="Security" description="Two-factor sign-in for your account.">
            <TwoFactorCard
              enabled={account?.twoFactorEnabled ?? false}
              hasPassword={(account?.accounts.length ?? 0) > 0}
            />
          </Section>

          {chromeConnections.length > 0 && (
            <Section
              id="connections"
              label="Connections"
              title="Chrome extension connections"
              description="Browsers that can check pages for this workspace."
            >
              <ConnectedSites sites={chromeConnections} canManage={manager} />
            </Section>
          )}
        </div>
      </div>
    </div>
  );
}
