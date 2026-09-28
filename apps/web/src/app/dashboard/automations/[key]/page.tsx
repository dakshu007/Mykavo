import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { AUTOMATIONS, DEFAULT_COPY, DEFAULT_OFFER, PLACEHOLDERS, isAutomationKey } from "@mykavo/email";
import { requireSession } from "@/lib/session";
import { isPlatformAdmin } from "@/lib/platform-admin";
import { loadSettings, resolvedDay } from "@/lib/automations-admin";
import { AutomationEditor } from "@/components/dashboard/automation-editor";

export const metadata: Metadata = {
  title: "Edit automation",
  robots: { index: false },
};

/** Edit one automated email. Operator only, like the list. */
export default async function AutomationPage({ params }: { params: Promise<{ key: string }> }) {
  const session = await requireSession();
  if (!isPlatformAdmin(session.user.email)) notFound();
  const { key } = await params;
  if (!isAutomationKey(key)) notFound();

  const { ready, settings } = await loadSettings();
  const s = settings[key];
  const meta = AUTOMATIONS[key];
  const d = DEFAULT_COPY[key];
  const day = resolvedDay(key, settings);

  return (
    <div className="max-w-7xl space-y-4">
      <div>
        <Link
          href="/dashboard/automations"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary transition-colors hover:text-ink"
        >
          <ArrowLeft className="size-3.5" aria-hidden /> Automations
        </Link>
        <h1 className="mt-2 text-[22px] font-semibold tracking-tight text-ink">{meta.name}</h1>
        <p className="text-[13px] text-ink-secondary">
          {meta.group}
          {day !== null ? `, day ${day}` : ""} - {meta.unsubscribable ? "optional, with an unsubscribe link" : "transactional"}
        </p>
      </div>
      {!ready && (
        <p className="rounded-tile bg-critical-soft px-4 py-3 text-[13px] text-critical-strong" role="status">
          Saving is off until the <code className="font-mono">20260928120000_email_automations</code> migration is
          applied in Supabase. Preview and test sends work.
        </p>
      )}
      <AutomationEditor
        automationKey={key}
        name={meta.name}
        trigger={day !== null ? `Day ${day} after signup. ${meta.trigger}` : meta.trigger}
        ready={ready}
        unsubscribable={meta.unsubscribable}
        timing={Boolean(meta.timing)}
        offer={meta.offer}
        placeholders={PLACEHOLDERS[key]}
        initial={{
          enabled: s.enabled,
          subject: s.copy.subject ?? "",
          heading: s.copy.heading ?? "",
          intro: s.copy.intro ?? "",
          buttonLabel: s.copy.buttonLabel ?? "",
          sendOnDay: s.sendOnDay !== null ? String(s.sendOnDay) : "",
          offerCode: s.offerCode ?? "",
          offerPercent: s.offerPercent !== null ? String(s.offerPercent) : "",
        }}
        defaults={{
          subject: d.subject,
          heading: d.heading,
          intro: d.intro,
          buttonLabel: d.buttonLabel ?? "Automatic: Review changes, or Open your dashboard",
          sendOnDay: meta.timing ? String(meta.timing.defaultDay) : "",
          offerCode: DEFAULT_OFFER.code,
          offerPercent: String(DEFAULT_OFFER.percent),
        }}
      />
    </div>
  );
}
