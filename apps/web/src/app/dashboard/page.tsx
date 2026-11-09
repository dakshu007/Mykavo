import { cookies, headers } from "next/headers";
import { Greeting } from "@/components/dashboard/greeting";
import { greetingForHour, hourInTimeZone, timezoneFromNetlifyGeo } from "@/lib/greeting";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { getWorkspacePlan } from "@/lib/limits";
import { QuickStartWebsite } from "@/components/dashboard/overview/quick-start";
import { ONBOARDING_DISMISSED_COOKIE } from "@/lib/onboarding";
import { loadOverview } from "@/components/dashboard/overview/load-overview";
import { NeedsAttention } from "@/components/dashboard/overview/needs-attention";
import { SetupGuide } from "@/components/dashboard/overview/setup-guide";
import { AllClear } from "@/components/dashboard/overview/all-clear";
import { SummaryRow } from "@/components/dashboard/overview/summary-row";
import { WebsitesList } from "@/components/dashboard/overview/websites-list";
import { FirstWebsite } from "@/components/dashboard/overview/first-website";
import { WeeklySummaryCard } from "@/components/dashboard/overview/weekly-summary";
import { aiConfigured } from "@/lib/ai/client";
import { findWeeklySummary } from "@/lib/ai/weekly-summary";

/**
 * Overview: answers "what needs my attention right now?".
 *
 * Top to bottom: the summary figures, the attention list (open HIGH/CRITICAL/MEDIUM changes and
 * website problems, grouped by website, worst first), the setup guide while
 * a new account is still setting up, the all-clear card when nothing needs
 * anyone, then the websites list. Trial and upgrade
 * prompts live in the dashboard layout and appear here as on every page.
 */
export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);

  // Workspaces that dismissed the earlier checklist card keep it dismissed.
  const cookieStore = await cookies();
  const setupDismissed = cookieStore.get(ONBOARDING_DISMISSED_COOKIE)?.value === workspace.id;

  const data = await loadOverview({
    workspace,
    user: { id: session.user.id, email: session.user.email },
    setupDismissed,
  });
  const hasWebsites = data.websites.length > 0;
  // No website yet and allowed to add one: the add-a-website form IS the
  // page, straight after signing in (quick-start.tsx).
  const quickStart = !hasWebsites && role !== "VIEWER";
  const pageBudget = quickStart ? (await getWorkspacePlan(workspace.id)).limits.pagesPerWebsite : 0;
  const nothingNeedsAttention = data.attention.groups.length === 0;

  // The AI note covers websites that have been scanned at least once; it opens
  // on the website that most needs attention.
  const scanned = data.websites.filter((w) => w.lastScanAt !== null);
  const summaryWebsiteId =
    data.attention.groups.find((g) => scanned.some((w) => w.id === g.websiteId))?.websiteId ?? scanned[0]?.id;
  const stored = aiConfigured() && summaryWebsiteId ? await findWeeklySummary(summaryWebsiteId) : null;

  // Greeting follows the visitor's clock, not the server's (Netlify = UTC).
  // Server guess from the request's geo timezone; the client re-derives from
  // the actual local clock after mount.
  const visitorTz = timezoneFromNetlifyGeo((await headers()).get("x-nf-geo"));
  const visitorHour = (visitorTz ? hourInTimeZone(visitorTz) : null) ?? new Date().getHours();

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-[26px] font-semibold tracking-tight text-ink">
          <Greeting
            name={session.user.name.split(" ")[0]}
            initialGreeting={greetingForHour(visitorHour)}
            className=""
          />
        </h1>
        <p className="mt-1 text-[14px] text-ink-secondary">Here&apos;s what changed across your websites</p>
      </header>

      {hasWebsites && (
        <SummaryRow
          websites={data.websites.length}
          monitoredPages={data.monitoredPages}
          health={data.health}
          scansLast7Days={data.scansLast7Days}
          changesLast30Days={data.changesLast30Days}
        />
      )}

      <NeedsAttention attention={data.attention} now={data.now} />

      {quickStart && <QuickStartWebsite pageBudget={pageBudget} />}

      {!quickStart && data.setupGuide && <SetupGuide guide={data.setupGuide} />}

      {!hasWebsites && !quickStart && !data.setupGuide && <FirstWebsite />}

      {hasWebsites && nothingNeedsAttention && (
        <AllClear
          health={data.health}
          lastScan={data.lastScan}
          nextScan={data.nextScan}
          lowerPriorityOpen={data.lowerPriorityOpen}
          now={data.now}
        />
      )}

      {aiConfigured() && summaryWebsiteId && (
        <WeeklySummaryCard
          websites={scanned.map((w) => ({ id: w.id, name: w.name }))}
          defaultWebsiteId={summaryWebsiteId}
          initial={
            stored
              ? { websiteId: summaryWebsiteId, summary: stored.summary, createdAt: stored.createdAt.toISOString() }
              : null
          }
        />
      )}

      <WebsitesList websites={data.websites} />
    </div>
  );
}
