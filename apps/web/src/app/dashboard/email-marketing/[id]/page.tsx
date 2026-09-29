import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  AUDIENCE_DESCRIPTIONS,
  AUDIENCE_KEYS,
  AUDIENCES,
  BrevoError,
  MYKAVO_CAMPAIGN_TAG,
  brevoCampaign,
  brevoConfigured,
  findAudiences,
  type AudienceKey,
} from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { campaignFormFromBrevo } from "@/lib/campaign-input";
import { Card } from "@/components/ui/card";
import { CampaignComposer } from "@/components/email-marketing/campaign-composer";

export const metadata: Metadata = {
  title: "Edit campaign - Email marketing",
  robots: { index: false },
};

type Params = { params: Promise<{ id: string }> };

/**
 * Reopen a saved Brevo draft in the composer: edit it, send a test, then send
 * or schedule it. Only MyKavo's own campaigns (tagged, or sent to the MyKavo
 * lists) - never another brand's in the same Brevo account. Operator only.
 */
export default async function EditCampaignPage({ params }: Params) {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  if (!brevoConfigured()) notFound();
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const [found, campaign] = await Promise.all([
    findAudiences().catch(() => null),
    brevoCampaign(id).catch((err: unknown) => {
      if (err instanceof BrevoError && err.status === 404) return null;
      throw err;
    }),
  ]);
  if (!campaign || !found) notFound();
  const ourLists = new Set(AUDIENCE_KEYS.map((k) => found[k].id));
  const ours = campaign.tag === MYKAVO_CAMPAIGN_TAG || campaign.listIds.some((l) => ourLists.has(l));
  if (!ours) notFound();

  const back = (
    <Link href="/dashboard/email-marketing" className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
      <ArrowLeft className="size-3.5" aria-hidden /> Email marketing
    </Link>
  );

  const listIdByAudience = Object.fromEntries(AUDIENCE_KEYS.map((k) => [k, found[k].id])) as Record<AudienceKey, number>;
  const form = campaign.status === "draft" ? campaignFormFromBrevo(campaign, listIdByAudience) : null;
  if (!form) {
    return (
      <div className="max-w-2xl space-y-4">
        {back}
        <Card>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink">{campaign.name}</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            {campaign.status === "draft"
              ? "This draft was not written in MyKavo, so it can only be edited in Brevo."
              : `This campaign is ${campaign.status === "queued" ? "scheduled" : campaign.status}, so it can no longer be edited. Brevo only lets drafts change.`}
          </p>
        </Card>
      </div>
    );
  }

  const audiences = AUDIENCE_KEYS.map((k) => ({
    key: k,
    name: AUDIENCES[k],
    description: AUDIENCE_DESCRIPTIONS[k],
    subscribers: found[k].subscribers,
  }));
  const firstName = displayPersonName(session.user.name, session.user.email).split(/\s+/)[0] ?? "";
  return <CampaignComposer audiences={audiences} adminFirstName={firstName} initial={{ id, form }} />;
}
