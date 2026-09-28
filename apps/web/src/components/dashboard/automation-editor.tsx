"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, Send } from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Switch } from "@/components/dashboard/automations-list";
import { cn } from "@/lib/utils";

/**
 * Edit one automated email: wording, timing, offer - with a live preview
 * rendered by the same code the worker sends with, and a test send to the
 * signed-in admin. Empty fields fall back to the default shown as the
 * placeholder, so clearing a field is how to go back to the shipped text.
 */

export interface EditorProps {
  automationKey: string;
  name: string;
  trigger: string;
  ready: boolean;
  unsubscribable: boolean;
  initial: {
    enabled: boolean;
    subject: string;
    heading: string;
    intro: string;
    buttonLabel: string;
    sendOnDay: string;
    offerCode: string;
    offerPercent: string;
  };
  defaults: {
    subject: string;
    heading: string;
    intro: string;
    buttonLabel: string;
    sendOnDay: string;
    offerCode: string;
    offerPercent: string;
  };
  timing: boolean;
  offer: boolean;
  placeholders: { token: string; meaning: string }[];
}

type Form = EditorProps["initial"];
type Errors = Partial<Record<keyof Form, string>>;
type Preview = { subject: string; html: string; text: string };

const inputClass =
  "w-full rounded-field border border-line bg-card px-3.5 py-2.5 text-[14px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none";

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-[12.5px] text-critical-strong">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1 text-[12.5px] text-ink-faint">{hint}</p>
      )}
    </div>
  );
}

export function AutomationEditor(p: EditorProps) {
  const router = useRouter();
  const [form, setForm] = useState<Form>(p.initial);
  const [errors, setErrors] = useState<Errors>({});
  const [preview, setPreview] = useState<Preview | null>(null);
  const [view, setView] = useState<"html" | "text">("html");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "resetting" | "testing">("idle");
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const seq = useRef(0);

  const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  // Live preview, debounced; only the latest response is shown.
  useEffect(() => {
    const id = ++seq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/automations/${p.automationKey}/preview`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(form),
        });
        const body = (await res.json()) as Preview & { errors?: Errors };
        if (id !== seq.current) return;
        if (res.ok) {
          setPreview(body);
          setErrors({});
        } else if (body.errors) {
          setErrors(body.errors);
        }
      } catch {
        // Preview is a convenience; saving reports real errors.
      }
    }, 350);
    return () => clearTimeout(t);
  }, [form, p.automationKey]);

  async function call(method: "PUT" | "DELETE" | "POST", path = "") {
    const res = await fetch(`/api/admin/automations/${p.automationKey}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: method === "DELETE" ? undefined : JSON.stringify(form),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; errors?: Errors; sentTo?: string };
    return { ok: res.ok, body };
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setStatus("saving");
    setMessage(null);
    try {
      const { ok, body } = await call("PUT");
      if (!ok) {
        setErrors(body.errors ?? {});
        setMessage({ tone: "error", text: body.error ?? "Could not save." });
        setStatus("idle");
        return;
      }
      setStatus("saved");
      setMessage({ tone: "ok", text: "Saved. The worker uses it from its next run." });
      router.refresh();
      setTimeout(() => setStatus("idle"), 2000);
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
      setStatus("idle");
    }
  }

  async function reset() {
    if (!window.confirm("Go back to the default wording and timing? The on/off switch stays as it is.")) return;
    setStatus("resetting");
    setMessage(null);
    try {
      const { ok, body } = await call("DELETE");
      if (!ok) {
        setMessage({ tone: "error", text: body.error ?? "Could not reset." });
      } else {
        setForm((f) => ({ ...f, subject: "", heading: "", intro: "", buttonLabel: "", sendOnDay: "", offerCode: "", offerPercent: "" }));
        setErrors({});
        setMessage({ tone: "ok", text: "Back to the default." });
        router.refresh();
      }
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
    }
    setStatus("idle");
  }

  async function sendTest() {
    setStatus("testing");
    setMessage(null);
    try {
      const { ok, body } = await call("POST", "/test");
      if (!ok) {
        if (body.errors) setErrors(body.errors);
        setMessage({ tone: "error", text: body.error ?? "Could not send the test." });
      } else {
        setMessage({ tone: "ok", text: `Test sent to ${body.sentTo ?? "your address"}, as it is in the editor now.` });
      }
    } catch {
      setMessage({ tone: "error", text: "Network error - try again." });
    }
    setStatus("idle");
  }

  const busy = status !== "idle" && status !== "saved";
  const describedBy = (k: keyof Form) => (errors[k] ? `${k}-error` : undefined);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <Card>
        <form onSubmit={save} className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-ink">Sending</p>
              <p className="text-[13px] text-ink-secondary">
                {form.enabled ? p.trigger : "Off. Nobody gets this email until it is switched back on."}
              </p>
            </div>
            <Switch
              checked={form.enabled}
              disabled={!p.ready}
              label="Send this email"
              onChange={(enabled) => setForm((f) => ({ ...f, enabled }))}
            />
          </div>

          <Field id="subject" label="Subject" error={errors.subject}>
            <input
              id="subject"
              value={form.subject}
              onChange={set("subject")}
              placeholder={p.defaults.subject}
              maxLength={150}
              aria-invalid={Boolean(errors.subject)}
              aria-describedby={describedBy("subject")}
              className={inputClass}
            />
          </Field>
          <Field id="heading" label="Heading" error={errors.heading}>
            <input
              id="heading"
              value={form.heading}
              onChange={set("heading")}
              placeholder={p.defaults.heading}
              maxLength={120}
              aria-invalid={Boolean(errors.heading)}
              aria-describedby={describedBy("heading")}
              className={inputClass}
            />
          </Field>
          <Field id="intro" label="Opening text" hint="A blank line starts a new paragraph." error={errors.intro}>
            <textarea
              id="intro"
              rows={5}
              value={form.intro}
              onChange={set("intro")}
              placeholder={p.defaults.intro}
              maxLength={1200}
              aria-invalid={Boolean(errors.intro)}
              aria-describedby={describedBy("intro")}
              className={inputClass}
            />
          </Field>
          <Field id="buttonLabel" label="Button" error={errors.buttonLabel}>
            <input
              id="buttonLabel"
              value={form.buttonLabel}
              onChange={set("buttonLabel")}
              placeholder={p.defaults.buttonLabel}
              maxLength={40}
              aria-invalid={Boolean(errors.buttonLabel)}
              aria-describedby={describedBy("buttonLabel")}
              className={inputClass}
            />
          </Field>

          {(p.timing || p.offer) && (
            <div className="grid gap-4 sm:grid-cols-3">
              {p.timing && (
                <Field id="sendOnDay" label="Send on day" error={errors.sendOnDay}>
                  <input
                    id="sendOnDay"
                    inputMode="numeric"
                    value={form.sendOnDay}
                    onChange={set("sendOnDay")}
                    placeholder={p.defaults.sendOnDay}
                    aria-invalid={Boolean(errors.sendOnDay)}
                    aria-describedby={describedBy("sendOnDay")}
                    className={inputClass}
                  />
                </Field>
              )}
              {p.offer && (
                <>
                  <Field id="offerCode" label="Discount code" error={errors.offerCode}>
                    <input
                      id="offerCode"
                      value={form.offerCode}
                      onChange={set("offerCode")}
                      placeholder={p.defaults.offerCode}
                      maxLength={32}
                      aria-invalid={Boolean(errors.offerCode)}
                      aria-describedby={describedBy("offerCode")}
                      className={cn(inputClass, "font-mono uppercase")}
                    />
                  </Field>
                  <Field id="offerPercent" label="Percent off" error={errors.offerPercent}>
                    <input
                      id="offerPercent"
                      inputMode="numeric"
                      value={form.offerPercent}
                      onChange={set("offerPercent")}
                      placeholder={p.defaults.offerPercent}
                      aria-invalid={Boolean(errors.offerPercent)}
                      aria-describedby={describedBy("offerPercent")}
                      className={inputClass}
                    />
                  </Field>
                </>
              )}
            </div>
          )}
          {p.offer && (
            <p className="-mt-2 text-[12.5px] text-ink-faint">
              The code must exist in Dodo Payments with the same percent off - this email only tells people about it.
            </p>
          )}

          <div className="rounded-tile bg-surface px-4 py-3">
            <p className="mb-1.5 text-[12.5px] font-medium text-ink">Placeholders</p>
            <ul className="space-y-0.5 text-[12.5px] text-ink-secondary">
              {p.placeholders.map((ph) => (
                <li key={ph.token}>
                  <code className="font-mono text-ink">{ph.token}</code> - {ph.meaning}
                </li>
              ))}
            </ul>
          </div>

          {message && (
            <p
              className={cn("text-sm", message.tone === "ok" ? "text-success-strong" : "text-critical-strong")}
              role={message.tone === "error" ? "alert" : "status"}
            >
              {message.text}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={busy || !p.ready}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {status === "saving" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {status === "saved" && <Check className="size-4" aria-hidden />}
              {status === "saved" ? "Saved" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void sendTest()}
              disabled={busy}
              className="inline-flex h-10 items-center gap-2 rounded-full bg-surface px-4 text-sm font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
            >
              {status === "testing" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
              Send me a test
            </button>
            <button
              type="button"
              onClick={() => void reset()}
              disabled={busy || !p.ready}
              className="inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
            >
              {status === "resetting" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RotateCcw className="size-4" aria-hidden />}
              Reset to default
            </button>
          </div>
        </form>
      </Card>

      <Card className="min-w-0">
        <CardHeader
          title="Preview"
          action={
            <div className="flex rounded-full bg-surface p-0.5 text-[12px] font-medium" role="group" aria-label="Preview format">
              {(["html", "text"] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  aria-pressed={view === v}
                  onClick={() => setView(v)}
                  className={cn(
                    "rounded-full px-3 py-1 transition-colors",
                    view === v ? "bg-card text-ink shadow-card" : "text-ink-secondary hover:text-ink",
                  )}
                >
                  {v === "html" ? "Email" : "Plain text"}
                </button>
              ))}
            </div>
          }
        />
        <p className="mb-3 text-[12.5px] text-ink-faint">
          Sample data with your name{p.unsubscribable ? "; the unsubscribe link here goes nowhere" : ""}.
        </p>
        <div className="mb-3 rounded-tile border border-line px-3.5 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-ink-faint">Subject</p>
          <p className="text-[14px] font-medium text-ink">{preview?.subject ?? "…"}</p>
        </div>
        {preview ? (
          view === "html" ? (
            // sandbox="" - no scripts, no same-origin, no navigation out of the frame.
            <iframe
              title="Email preview"
              sandbox=""
              srcDoc={preview.html}
              className="h-[720px] w-full rounded-tile border border-line bg-white"
            />
          ) : (
            <pre className="max-h-[720px] overflow-auto whitespace-pre-wrap rounded-tile border border-line p-4 font-mono text-[12.5px] text-ink">
              {preview.text}
            </pre>
          )
        ) : (
          <p className="py-10 text-center text-sm text-ink-secondary">Rendering…</p>
        )}
      </Card>
    </div>
  );
}
