import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AUDIENCE_DESCRIPTIONS, AUDIENCE_KEYS, AUDIENCES, brevoConfigured, findAudiences } from "@mykavo/email";
import { displayPersonName } from "@mykavo/shared";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { CampaignComposer } from "@/components/email-marketing/campaign-composer";

export const metadata: Metadata = {
  title: "New campaign - Email marketing",
  robots: { index: false },
};

/** Compose a Brevo campaign. Operator only. */
export default async function NewCampaignPage() {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  if (!brevoConfigured()) notFound();

  const found = await findAudiences().catch(() => null);
  const audiences = AUDIENCE_KEYS.map((k) => ({
    key: k,
    name: AUDIENCES[k],
    description: AUDIENCE_DESCRIPTIONS[k],
    subscribers: found?.[k].subscribers ?? 0,
  }));
  const firstName = displayPersonName(session.user.name, session.user.email).split(/\s+/)[0] ?? "";
  return <CampaignComposer audiences={audiences} adminFirstName={firstName} />;
}
