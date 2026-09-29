"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Loader2, Save, Send, TestTube2, Users, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ComposerAudience {
  key: string;
  name: string;
  description: string;
  subscribers: number;
}

export type Form = {
  name: string;
  subject: string;
  previewText: string;
  heading: string;
  body: string;
  buttonLabel: string;
  buttonUrl: string;
  audience: string;
};
type Errors = Partial<Record<keyof Form, string>>;

const input =
  "w-full rounded-field border border-line bg-card px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? <p className="mt-1 text-[12.5px] text-critical-strong">{error}</p> : hint && <p className="mt-1 text-[12.5px] text-ink-faint">{hint}</p>}
    </div>
  );
}

/**
 * Write a campaign, see it exactly as it will look, send a test to the
 * team's test inbox, then send or schedule it through Brevo. Sending asks first, with the
 * number of people it will reach.
 */
export function CampaignComposer({
  audiences,
  adminFirstName,
  initial,
}: {
  audiences: ComposerAudience[];
  adminFirstName: string;
  /** A saved Brevo draft to reopen; omitted for a new campaign. */
  initial?: { id: number; form: Form };
}) {
  const named = (s: string) => s.replace(/\{firstName\}/g, adminFirstName || "there");
  const router = useRouter();
  const [form, setForm] = useState<Form>(initial?.form ?? {
    name: "",
    subject: "",
    previewText: "",
    heading: "",
    body: "Hi {firstName},\n\n",
    buttonLabel: "Open MyKavo",
    buttonUrl: "/dashboard",
    audience: audiences[0]?.key ?? "all",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [html, setHtml] = useState("");
  const [campaignId, setCampaignId] = useState<number | null>(initial?.id ?? null);
  const [savedJson, setSavedJson] = useState(initial ? JSON.stringify(initial.form) : "");
  const [busy, setBusy] = useState<null | "save" | "test" | "send" | "schedule">(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [scheduleAt, setScheduleAt] = useState("");
  const seq = useRef(0);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));
  const audience = audiences.find((a) => a.key === form.audience);
  const dirty = JSON.stringify(form) !== savedJson;

  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch("/api/admin/email-marketing/preview", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ heading: form.heading || " ", body: form.body || " ", buttonLabel: form.buttonLabel, buttonUrl: form.buttonUrl }),
        });
        const data = (await res.json()) as { html?: string };
        if (id === seq.current && data.html) setHtml(data.html);
      } catch {
        // Preview only.
      }
    }, 300);
    return () => clearTimeout(t);
  }, [form.heading, form.body, form.buttonLabel, form.buttonUrl]);

  /** Create or update the Brevo draft; returns its id. */
  async function save(): Promise<number | null> {
    if (campaignId && !dirty) return campaignId;
    setBusy("save");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-marketing/campaigns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...form, ...(campaignId ? { id: campaignId } : {}) }),
      });
      const body = (await res.json().catch(() => ({}))) as { id?: number; error?: string; errors?: Errors };
      if (!res.ok || !body.id) {
        setErrors(body.errors ?? {});
        setMessage({ tone: "error", text: body.error ?? "Could not save the draft." });
        return null;
      }
      setErrors({});
      setCampaignId(body.id);
      setSavedJson(JSON.stringify(form));
      return body.id;
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  /** Send the email as it stands to the team's test inbox - no draft needed. */
  async function sendTest() {
    setBusy("test");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/email-marketing/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form),
      });
      const body = (await res.json().catch(() => ({}))) as { sentTo?: string; error?: string; errors?: Errors };
      if (!res.ok) {
        setErrors(body.errors ?? {});
        setMessage({ tone: "error", text: body.error ?? "Could not send the test." });
      } else {
        setErrors({});
        setMessage({ tone: "ok", text: `Test sent to ${body.sentTo ?? "the test inbox"}.` });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
    }
    setBusy(null);
  }

  async function act(action: "send" | "schedule") {
    const id = await save();
    if (!id) return;
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/email-marketing/campaigns/${id}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(
          action === "send" ? { action, confirm: true } : { action, scheduledAt: new Date(scheduleAt).toISOString() },
        ),
      });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ tone: "error", text: body.error ?? "Brevo did not accept that." });
      } else {
        router.push("/dashboard/email-marketing");
        router.refresh();
        return;
      }
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
    }
    setBusy(null);
    setConfirm(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/dashboard/email-marketing" className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink">
            <ArrowLeft className="size-3.5" aria-hidden /> Email marketing
          </Link>
          <h1 className="mt-1 text-[22px] font-semibold tracking-tight text-ink">{initial ? "Edit campaign" : "New campaign"}</h1>
        </div>
        {campaignId && <span className="text-[12px] text-ink-faint">Draft #{campaignId} in Brevo{dirty ? " · unsaved changes" : ""}</span>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <Card>
          <div className="space-y-4">
            <Field id="c-name" label="Internal name" hint="Only you see this, in the campaign list." error={errors.name}>
              <input id="c-name" className={input} value={form.name} onChange={set("name")} maxLength={100} placeholder="e.g. October product update" />
            </Field>
            <Field id="c-subject" label="Subject" error={errors.subject}>
              <input id="c-subject" className={input} value={form.subject} onChange={set("subject")} maxLength={150} placeholder="What changed in MyKavo this month" />
            </Field>
            <Field id="c-preview" label="Preview text" hint="The grey line inboxes show after the subject." error={errors.previewText}>
              <input id="c-preview" className={input} value={form.previewText} onChange={set("previewText")} maxLength={150} />
            </Field>
            <Field id="c-heading" label="Heading" error={errors.heading}>
              <input id="c-heading" className={input} value={form.heading} onChange={set("heading")} maxLength={120} placeholder="Headline inside the email" />
            </Field>
            <Field id="c-body" label="Message" hint="Plain text. A blank line starts a paragraph. {firstName} becomes each person's first name." error={errors.body}>
              <textarea id="c-body" rows={9} className={input} value={form.body} onChange={set("body")} maxLength={5000} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field id="c-btn" label="Button" error={errors.buttonLabel}>
                <input id="c-btn" className={input} value={form.buttonLabel} onChange={set("buttonLabel")} maxLength={40} placeholder="None" />
              </Field>
              <Field id="c-url" label="Link" error={errors.buttonUrl}>
                <input id="c-url" className={cn(input, "font-mono text-[13px]")} value={form.buttonUrl} onChange={set("buttonUrl")} maxLength={500} />
              </Field>
            </div>
            <fieldset>
              <legend className="mb-1.5 text-sm font-medium text-ink">Send to</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {audiences.map((a) => (
                  <button
                    key={a.key}
                    type="button"
                    aria-pressed={form.audience === a.key}
                    onClick={() => setForm((f) => ({ ...f, audience: a.key }))}
                    className={cn("rounded-tile border p-3 text-left transition-colors", form.audience === a.key ? "border-accent bg-primary-soft" : "border-line hover:bg-surface")}
                  >
                    <span className="flex items-center justify-between gap-2">
                      <span className="text-[13.5px] font-medium text-ink">{a.name.replace("MyKavo · ", "")}</span>
                      <span className="inline-flex items-center gap-1 text-[12px] tabular-nums text-ink-secondary">
                        <Users className="size-3" aria-hidden /> {a.subscribers}
                      </span>
                    </span>
                    <span className="block text-[12px] text-ink-secondary">{a.description}</span>
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[12px] text-ink-faint">Unsubscribed people are blocklisted in Brevo and never receive it.</p>
            </fieldset>

            {message && (
              <p className={cn("text-sm", message.tone === "ok" ? "text-success-strong" : "text-critical-strong")} role={message.tone === "error" ? "alert" : "status"}>
                {message.text}
              </p>
            )}

            <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
              <button
                onClick={() => void save().then((id) => id && setMessage({ tone: "ok", text: "Draft saved in Brevo." }))}
                disabled={busy !== null}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink hover:bg-line/60 disabled:opacity-60"
              >
                {busy === "save" ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save draft
              </button>
              <button
                onClick={() => void sendTest()}
                disabled={busy !== null}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink hover:bg-line/60 disabled:opacity-60"
              >
                {busy === "test" ? <Loader2 className="size-4 animate-spin" /> : <TestTube2 className="size-4" />} Send a test
              </button>
              <button
                onClick={() => setConfirm(true)}
                disabled={busy !== null}
                className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
              >
                <Send className="size-4" /> Send or schedule
              </button>
            </div>
          </div>
        </Card>

        <Card className="min-w-0">
          <div className="mb-3 rounded-tile border border-line px-3.5 py-2.5">
            <p className="text-[11px] uppercase tracking-wide text-ink-faint">From</p>
            <p className="text-[13px] text-ink">MyKavo</p>
            <p className="mt-1.5 text-[11px] uppercase tracking-wide text-ink-faint">Subject</p>
            <p className="text-[14px] font-medium text-ink">{named(form.subject) || "Your subject"}</p>
            {form.previewText && <p className="text-[12.5px] text-ink-secondary">{named(form.previewText)}</p>}
          </div>
          {/* sandbox="" - no scripts, no same-origin, no navigation out of the frame. */}
          <iframe title="Campaign preview" sandbox="" srcDoc={html} className="h-[640px] w-full rounded-tile border border-line bg-white" />
        </Card>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => busy === null && setConfirm(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="send-title" className="w-full max-w-md space-y-4 rounded-card bg-card p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between">
              <h2 id="send-title" className="text-[17px] font-semibold text-ink">Send &quot;{form.subject || "this campaign"}&quot;?</h2>
              <button onClick={() => setConfirm(false)} className="rounded-md p-1 text-ink-faint hover:bg-surface hover:text-ink" aria-label="Close">
                <X className="size-4" />
              </button>
            </div>
            <p className="text-[14px] text-ink-secondary">
              It goes to <strong className="text-ink">{audience?.subscribers ?? 0} people</strong> in {audience?.name.replace("MyKavo · ", "") ?? "this list"},
              minus anyone unsubscribed. Once sent it cannot be taken back. Brevo&apos;s free plan sends up to 300 emails a day.
            </p>
            <div>
              <label htmlFor="sched" className="mb-1.5 block text-sm font-medium text-ink">Or schedule it for</label>
              <input id="sched" type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} className={input} />
            </div>
            {message?.tone === "error" && <p className="text-sm text-critical-strong" role="alert">{message.text}</p>}
            <div className="flex flex-wrap justify-end gap-2">
              <button
                onClick={() => void act("schedule")}
                disabled={busy !== null || !scheduleAt}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink hover:bg-line/60 disabled:opacity-50"
              >
                {busy === "schedule" ? <Loader2 className="size-4 animate-spin" /> : <CalendarClock className="size-4" />} Schedule
              </button>
              <button
                onClick={() => void act("send")}
                disabled={busy !== null}
                className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-semibold text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
              >
                {busy === "send" ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Send now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
