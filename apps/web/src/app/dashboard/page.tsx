import { cookies } from "next/headers";
import { requireSession, getCurrentWorkspace } from "@/lib/session";
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
 * Top to bottom: the attention list (open HIGH/CRITICAL/MEDIUM changes and
 * website problems, grouped by website, worst first), the setup guide while
 * a new account is still setting up, the all-clear card when nothing needs
 * anyone, then the summary numbers and the websites list. Trial and upgrade
 * prompts live in the dashboard layout and appear here as on every page.
 */
export default async function DashboardOverviewPage() {
  const session = await requireSession();
  const workspace = await getCurrentWorkspace(session.user.id, session.user.name);

  // Workspaces that dismissed the earlier checklist card keep it dismissed.
  const cookieStore = await cookies();
  const setupDismissed = cookieStore.get(ONBOARDING_DISMISSED_COOKIE)?.value === workspace.id;

  const data = await loadOverview({
    workspace,
    user: { id: session.user.id, email: session.user.email },
    setupDismissed,
  });
  const hasWebsites = data.websites.length > 0;
  const nothingNeedsAttention = data.attention.groups.length === 0;

  // The AI note covers websites that have been scanned at least once; it opens
  // on the website that most needs attention.
  const scanned = data.websites.filter((w) => w.lastScanAt !== null);
  const summaryWebsiteId =
    data.attention.groups.find((g) => scanned.some((w) => w.id === g.websiteId))?.websiteId ?? scanned[0]?.id;
  const stored = aiConfigured() && summaryWebsiteId ? await findWeeklySummary(summaryWebsiteId) : null;

  return (
    <div className="space-y-6">
      <h1 className="sr-only">Overview</h1>

      <NeedsAttention attention={data.attention} now={data.now} />

      {data.setupGuide && <SetupGuide guide={data.setupGuide} />}

      {!hasWebsites && !data.setupGuide && <FirstWebsite />}

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

      {hasWebsites && (
        <SummaryRow
          websites={data.websites.length}
          monitoredPages={data.monitoredPages}
          health={data.health}
          scansLast7Days={data.scansLast7Days}
          changesLast30Days={data.changesLast30Days}
        />
      )}

      <WebsitesList websites={data.websites} />
    </div>
  );
}
