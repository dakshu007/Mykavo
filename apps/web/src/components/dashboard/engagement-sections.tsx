import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { Skeleton, SkeletonListRows } from "@/components/dashboard/skeleton";
import { EngagementPeople } from "@/components/dashboard/engagement-people";
import { loadAutomationEngagement, loadCampaignEngagement } from "@/lib/email-engagement";

/**
 * The per-person engagement cards, streamed: they wait on Brevo's API, and
 * the rest of the admin page should not wait with them.
 */

function Loading() {
  return (
    <Card>
      <div role="status" aria-label="Loading people">
        <Skeleton className="mb-4 h-5 w-48" />
        <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-tile" />
          ))}
        </div>
        <SkeletonListRows rows={5} />
      </div>
    </Card>
  );
}

async function AutomationPeople() {
  const report = await loadAutomationEngagement();
  return (
    <EngagementPeople
      title="People and their emails"
      description="Every real user (your own admin and test accounts are left out), what the automations sent them, what they opened or clicked, and whether they added a website or paid. Most engaged first - open a row to see each email."
      report={report}
      unknownOpensNote={'"Sent" means delivered through Resend (the welcome email and other must-reach mail), which does not report opens. Opens come from Brevo, for the optional emails of the last 90 days.'}
    />
  );
}

async function CampaignPeople() {
  const report = await loadCampaignEngagement();
  return (
    <EngagementPeople
      title="People and campaigns"
      description="Every real user (your own admin and test accounts are left out), which campaigns reached them, who opened or clicked, and who is paying. Most engaged first - open a row to see each campaign."
      report={report}
    />
  );
}

export function AutomationPeopleSection() {
  return (
    <Suspense fallback={<Loading />}>
      <AutomationPeople />
    </Suspense>
  );
}

export function CampaignPeopleSection() {
  return (
    <Suspense fallback={<Loading />}>
      <CampaignPeople />
    </Suspense>
  );
}
