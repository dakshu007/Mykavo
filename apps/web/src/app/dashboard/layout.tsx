import type { Metadata } from "next";
import { headers } from "next/headers";
import { prisma, canStartTrial, resumeAutoPaused, trialDaysLeft, TRIAL_DAYS } from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { isBlogAdmin } from "@/lib/blog-admin";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { greetingForHour, hourInTimeZone, timezoneFromNetlifyGeo } from "@/lib/greeting";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ActivityBeacon } from "@/components/dashboard/activity-beacon";
import { SignupTracker } from "@/components/analytics/signup-tracker";
import { recordSignupAttribution } from "@/lib/attribution/record";
import { Greeting } from "@/components/dashboard/greeting";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { getLiveCampaign } from "@/lib/billing/campaign-server";
import { PromoBar } from "@/components/promo/promo-bar";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { isMonitoringLive } from "@/lib/monitoring-live";
import { getAppAccessStatus } from "@/lib/app-access";
import { canDownloadApp } from "@mykavo/shared";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false },
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  // Back after a month away: websites MyKavo paused for inactivity start
  // again (see plan-sweep.ts in the worker). Never blocks the page.
  await resumeAutoPaused(prisma, workspace.id, ["DORMANT"]).catch(() => []);

  // Greeting follows the visitor's clock, not the server's (Netlify = UTC).
  // Server guess from the request's geo timezone; the client re-derives from
  // the actual local clock after mount.
  const visitorTz = timezoneFromNetlifyGeo((await headers()).get("x-nf-geo"));
  const visitorHour = (visitorTz ? hourInTimeZone(visitorTz) : null) ?? new Date().getHours();
  const initialGreeting = greetingForHour(visitorHour);
  // All memberships power the sidebar workspace switcher (shown when >1).
  // monitoringLive gates the sidebar's "Deeper analysis" group: the audit,
  // Search Console and analyser pages have nothing to show before a baseline
  // exists, so on day one they would be dead ends in the navigation.
  const [memberships, plan, websiteLimit, websitesUsed, monitoringLive, appStatus, newSignup] =
    await Promise.all([
    prisma.workspaceMember.findMany({
      where: { userId: session.user.id },
      select: { workspace: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getWorkspacePlan(workspace.id),
    getEffectiveWebsiteLimit(workspace.id),
    prisma.website.count({ where: { workspaceId: workspace.id } }),
      isMonitoringLive(workspace.id),
      // Approved for the Android app? Adds the download entry to the nav. By
      // address, which is why the request form insists on the same one.
      getAppAccessStatus(session.user.email),
      // A brand-new account: remember where it came from, once.
      recordSignupAttribution(session.user),
    ]);
  const appApproved = canDownloadApp(appStatus);
  // Only the owner can start it (POST /api/billing/trial), so only the owner is
  // offered it. An unverified owner is not offered it either: verifying the
  // email starts the trial, and the banner below says so.
  const emailVerified = session.user.emailVerified === true;
  const trialAvailable =
    plan.id === "free" &&
    emailVerified &&
    canManageBilling(role) &&
    (await canStartTrial(prisma, workspace.id).catch(() => false));
  // Admin rights follow a VERIFIED allowlisted email, so pass the whole user.
  const blogAdmin = isBlogAdmin(session.user);
  const platformAdmin = isPlatformAdmin(session.user);
  // A seasonal offer, confirmed with Dodo, for workspaces that could buy:
  // Free or on the trial. Paying customers never see it.
  const liveCampaign = plan.id === "free" || plan.trial ? await getLiveCampaign().catch(() => null) : null;
  const upgradeCard =
    plan.id === "free" || plan.trial ? (
      <UpgradeCard
        websitesUsed={websitesUsed}
        websiteLimit={websiteLimit}
        trialDaysLeft={plan.trial ? trialDaysLeft(plan.trial.endsAt) : null}
        trialAvailable={trialAvailable}
        campaign={liveCampaign}
      />
    ) : null;

  return (
    // data-clarity-mask: if Clarity is already running (a visitor came in from a
    // public page without a reload), it masks everything in the signed-in app.
    // data-dashboard: big monitors scale the whole dashboard up (globals.css).
    <div
      data-clarity-mask="True"
      data-dashboard=""
      className="mx-auto flex min-h-[calc(100vh/var(--dash-zoom,1))] w-full max-w-360 gap-6 p-4 lg:p-6 min-[1800px]:max-w-400"
    >
      <ActivityBeacon />
      {newSignup ? <SignupTracker userId={session.user.id} {...newSignup} /> : null}
      <CommandPalette
        isBlogAdmin={blogAdmin}
        isPlatformAdmin={platformAdmin}
      />
      <div className="sticky top-6 hidden h-[calc(100vh/var(--dash-zoom,1)-3rem)] w-60 shrink-0 overflow-hidden rounded-card bg-card p-3 shadow-card lg:block">
        <DashboardSidebar
          workspaceName={workspace.name}
          monitoringLive={monitoringLive}
          appApproved={appApproved}
          isBlogAdmin={blogAdmin}
          isPlatformAdmin={platformAdmin}
          workspaces={memberships.map((m) => m.workspace)}
          currentWorkspaceId={workspace.id}
          upgradeCard={upgradeCard}
        />
      </div>
      <div className="min-w-0 flex-1 rounded-card bg-surface p-5 sm:p-7">
        <DashboardMobileNav
          monitoringLive={monitoringLive}
          appApproved={appApproved}
          isBlogAdmin={blogAdmin}
          isPlatformAdmin={platformAdmin}
        />
        {/* The sidebar (and its card) is hidden below lg. Without this copy a
            phone never sees the trial countdown or the offer to start one.
            The plain Free upsell stays in the sidebar: on a phone it would
            sit above every page's content. */}
        {liveCampaign && canManageBilling(role) ? (
          <PromoBar campaign={liveCampaign} variant="inline" href="/dashboard/billing" placement="dashboard_bar" />
        ) : null}
        {emailVerified ? null : <VerifyEmailBanner email={session.user.email} trialDays={TRIAL_DAYS} />}
        {plan.trial || trialAvailable ? (
          <div className="mb-4 max-w-md lg:hidden">{upgradeCard}</div>
        ) : null}
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <Greeting
              name={session.user.name.split(" ")[0]}
              initialGreeting={initialGreeting}
            />
            <p className="text-[13px] text-ink-secondary">
              Here&apos;s what changed across your websites
            </p>
          </div>
          {session.user.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- avatar may be an inline data URL, which next/image cannot optimize
            <img
              src={session.user.image}
              alt={`${session.user.name} profile photo`}
              className="size-11 shrink-0 rounded-full bg-card object-cover shadow-card"
            />
          ) : (
            <span
              className="inline-flex size-11 items-center justify-center rounded-full bg-card text-sm font-semibold text-ink shadow-card"
              aria-label="Account"
            >
              {session.user.name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        {children}
      </div>
    </div>
  );
}
