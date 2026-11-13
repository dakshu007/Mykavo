import type { Metadata } from "next";
import {
  prisma,
  getAgentRollout,
  resumeAutoPaused,
  rolloutAllows,
  trialDaysLeft,
} from "@mykavo/database";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageBilling } from "@/lib/team";
import { isBlogAdmin } from "@/lib/blog-admin";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { DashboardSidebar } from "@/components/dashboard/sidebar";
import { DashboardMobileNav } from "@/components/dashboard/mobile-nav";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ActivityBeacon } from "@/components/dashboard/activity-beacon";
import { SignupTracker } from "@/components/analytics/signup-tracker";
import { recordSignupAttribution } from "@/lib/attribution/record";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { UpgradeCard } from "@/components/dashboard/upgrade-card";
import { VerifyEmailBanner } from "@/components/dashboard/verify-email-banner";
import { getLiveCampaign } from "@/lib/billing/campaign-server";
import { PromoBar } from "@/components/promo/promo-bar";
import { getWorkspacePlan, getEffectiveWebsiteLimit } from "@/lib/limits";
import { isMonitoringLive } from "@/lib/monitoring-live";
import { getAppAccessStatus } from "@/lib/app-access";
import { canDownloadApp } from "@mykavo/shared";
import { cookies } from "next/headers";
import { Dismissible } from "@/components/dashboard/dismissible";
import { AiJobWatcher } from "@/components/keywords/ai-job-watcher";
import { findLimitHit, HIDE_LIMIT_COOKIE, HIDE_OFFER_COOKIE, HIDE_PROMO_BAR_COOKIE } from "@/lib/dashboard-cards";

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

  // All memberships power the sidebar workspace switcher (shown when >1).
  // monitoringLive gates the sidebar's "Deeper analysis" group: the audit,
  // Search Console and analyser pages have nothing to show before a baseline
  // exists, so on day one they would be dead ends in the navigation.
  const [memberships, plan, websiteLimit, websitesUsed, monitoringLive, appStatus, newSignup, attentionCount] =
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
      // Open HIGH and CRITICAL changes: the dot on the top bar's bell.
      prisma.changeEvent
        .count({
          where: { website: { workspaceId: workspace.id }, status: "NEW", severity: { in: ["HIGH", "CRITICAL"] } },
        })
        .catch(() => 0),
    ]);
  const appApproved = canDownloadApp(appStatus);
  const emailVerified = session.user.emailVerified === true;
  // Admin rights follow a VERIFIED allowlisted email, so pass the whole user.
  const blogAdmin = isBlogAdmin(session.user);
  const platformAdmin = isPlatformAdmin(session.user);
  // A seasonal offer, confirmed with Dodo, for workspaces that could buy:
  // Free or on a trial that is still running. Paying customers never see it.
  const liveCampaign = plan.id === "free" || plan.trial ? await getLiveCampaign().catch(() => null) : null;

  // AI Keywords in the main nav once the rollout opens it to this user.
  const keywordAgent = rolloutAllows(
    await getAgentRollout(prisma),
    session.user.email,
    session.user.emailVerified === true,
  );

  // A limit already used up (AI posts, keyword reports, websites, AI
  // explanations) turns the sidebar card into "continue with the next plan".
  // Only for people who can buy it, and never during a running trial (its
  // card counts down instead).
  const limitHit =
    !plan.trial && canManageBilling(role)
      ? await findLimitHit({ workspaceId: workspace.id, plan, websitesUsed, websiteLimit, keywordAgent })
      : null;

  // Closed cards and bars stay closed (components/dashboard/dismissible.tsx).
  // Keyed by offer or by limit and period, so a new one still shows.
  const jar = await cookies();
  const offerKey = liveCampaign ? `campaign:${liveCampaign.id}` : "upgrade";
  const showLimit = limitHit !== null && jar.get(HIDE_LIMIT_COOKIE)?.value !== limitHit.key;
  const showOffer = (plan.id === "free" || Boolean(plan.trial)) && (Boolean(plan.trial) || jar.get(HIDE_OFFER_COOKIE)?.value !== offerKey);
  const showPromoBar =
    liveCampaign !== null && canManageBilling(role) && jar.get(HIDE_PROMO_BAR_COOKIE)?.value !== liveCampaign.id;

  const card = (
    <UpgradeCard
      websitesUsed={websitesUsed}
      websiteLimit={websiteLimit}
      trialDaysLeft={plan.trial ? trialDaysLeft(plan.trial.endsAt) : null}
      campaign={liveCampaign}
      limit={showLimit ? limitHit : null}
    />
  );
  const upgradeCard = showLimit ? (
    <Dismissible cookie={HIDE_LIMIT_COOKIE} value={limitHit.key} days={30} label="Close this notice">
      {card}
    </Dismissible>
  ) : showOffer ? (
    // A running trial's countdown can't be closed: it is the only place the end date shows.
    plan.trial ? (
      card
    ) : (
      <Dismissible cookie={HIDE_OFFER_COOKIE} value={offerKey} days={liveCampaign ? 40 : 14} label="Close this offer">
        {card}
      </Dismissible>
    )
  ) : null;
  const navAccess = { monitoringLive, appApproved, isBlogAdmin: blogAdmin, isPlatformAdmin: platformAdmin, keywordAgent };
  // A trial plan is already named "Pro trial" (config/plans.ts trialPlan).
  const planLabel = plan.name;

  return (
    // data-clarity-mask: if Clarity is already running (a visitor came in from a
    // public page without a reload), it masks everything in the signed-in app.
    // data-dashboard: big monitors scale the whole dashboard up (globals.css).
    // #dashboard-shell carries data-sidebar-collapsed when the top bar's
    // toggle hides the sidebar (components/dashboard/topbar.tsx).
    <div
      id="dashboard-shell"
      data-clarity-mask="True"
      data-dashboard=""
      className="group/shell flex min-h-[calc(100vh/var(--dash-zoom,1))] w-full bg-surface"
    >
      <ActivityBeacon />
      {keywordAgent ? <AiJobWatcher /> : null}
      {newSignup ? <SignupTracker userId={session.user.id} {...newSignup} /> : null}
      <CommandPalette
        isBlogAdmin={blogAdmin}
        isPlatformAdmin={platformAdmin}
      />
      <div className="sticky top-0 hidden h-[calc(100vh/var(--dash-zoom,1))] w-64 shrink-0 overflow-hidden px-3 py-4 lg:block group-data-[sidebar-collapsed]/shell:lg:hidden">
        <DashboardSidebar
          workspaceName={workspace.name}
          planLabel={planLabel}
          user={{ name: session.user.name, email: session.user.email, image: session.user.image ?? null }}
          monitoringLive={monitoringLive}
          appApproved={appApproved}
          isBlogAdmin={blogAdmin}
          isPlatformAdmin={platformAdmin}
          keywordAgent={keywordAgent}
          workspaces={memberships.map((m) => m.workspace)}
          currentWorkspaceId={workspace.id}
          upgradeCard={upgradeCard}
        />
      </div>
      <div className="min-w-0 flex-1 p-3 lg:py-3 lg:pl-0 lg:pr-3 group-data-[sidebar-collapsed]/shell:lg:pl-3">
        <DashboardTopbar
          workspaceName={workspace.name}
          access={navAccess}
          attentionCount={attentionCount}
          showUpgrade={(plan.id === "free" || Boolean(plan.trial)) && canManageBilling(role)}
          canAddWebsite={role !== "VIEWER"}
        />
        <div className="mx-auto w-full max-w-[1400px] px-1 pb-10 pt-6 sm:px-3 lg:px-5 lg:pt-8">
          <DashboardMobileNav
            monitoringLive={monitoringLive}
            appApproved={appApproved}
            isBlogAdmin={blogAdmin}
            isPlatformAdmin={platformAdmin}
            keywordAgent={keywordAgent}
          />
          {/* The sidebar (and its card) is hidden below lg. Without this copy a
              phone never sees the countdown of a trial that is still running.
              The plain Free upsell stays in the sidebar: on a phone it would
              sit above every page's content. */}
          {showPromoBar && liveCampaign ? (
            <Dismissible
              cookie={HIDE_PROMO_BAR_COOKIE}
              value={liveCampaign.id}
              days={40}
              label="Close this offer"
              buttonClassName="right-2 top-[20px] -translate-y-1/2 text-[#9C9E93] hover:bg-white/10 hover:text-white"
            >
              <PromoBar campaign={liveCampaign} variant="inline" href="/dashboard/billing" placement="dashboard_bar" closable />
            </Dismissible>
          ) : null}
          {emailVerified ? null : <VerifyEmailBanner email={session.user.email} />}
          {plan.trial || showLimit ? (
            <div className="mb-4 max-w-md lg:hidden">{upgradeCard}</div>
          ) : null}
          {children}
        </div>
      </div>
    </div>
  );
}
