"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

/**
 * The shared form behind Book a Demo, Write for Us and the two partner
 * tracks. One component because they differ only in their fields and their
 * wording, and four near-identical forms would drift apart within a month.
 */

export interface LeadField {
  name: string;
  label: string;
  type?: "text" | "email" | "url" | "textarea" | "select";
  placeholder?: string;
  required?: boolean;
  options?: string[];
  help?: string;
}

export function LeadForm({
  kind,
  fields,
  submitLabel,
  successTitle,
  successBody,
}: {
  kind: string;
  fields: LeadField[];
  submitLabel: string;
  successTitle: string;
  successBody: string;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  const set = (name: string, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);

    // name/email/company/website/message are first-class columns; everything
    // else rides along in details so one sheet can serve every form.
    const { name, email, company, website, message, ...rest } = values;
    const details = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v && v.trim().length > 0),
    );

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind,
          name: name ?? "",
          email: email ?? "",
          company,
          website,
          message,
          details: Object.keys(details).length > 0 ? details : undefined,
          company_website_url: honeypot,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please email support@mykavo.app.");
        setStatus("idle");
        return;
      }
      setStatus("sent");
    } catch {
      setError("Could not reach MyKavo. Check your connection, or email support@mykavo.app.");
      setStatus("idle");
    }
  }

  if (status === "sent") {
    return (
      <div className="not-prose rounded-2xl border border-black/15 bg-white px-6 py-8 text-center">
        <span className="inline-flex size-11 items-center justify-center rounded-full bg-[#FFD400]">
          <Check className="size-6 text-[#151515]" aria-hidden />
        </span>
        <p className="mt-4 text-[18px] font-semibold text-[#151515]">{successTitle}</p>
        <p className="mx-auto mt-2 max-w-100 text-[14.5px] leading-6 text-[#6B6B60]">
          {successBody}
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="not-prose rounded-2xl border border-black/15 bg-white px-6 py-7"
    >
      <div className="grid gap-5">
        {fields.map((field) => {
          const id = `lead-${field.name}`;
          const shared =
            "w-full rounded-xl border border-black/15 bg-[#FBFAF4] px-4 py-3 text-[15px] text-[#151515] placeholder:text-[#9A9A8E] focus:border-[#151515] focus:outline-none";
          return (
            <div key={field.name}>
              <label htmlFor={id} className="mb-1.5 block text-[14px] font-medium text-[#151515]">
                {field.label}
                {field.required ? (
                  <span className="text-[#6B6B60]"> *</span>
                ) : (
                  <span className="text-[#9A9A8E]"> (optional)</span>
                )}
              </label>
              {field.type === "textarea" ? (
                <textarea
                  id={id}
                  rows={5}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                  className={shared}
                />
              ) : field.type === "select" ? (
                <select
                  id={id}
                  required={field.required}
                  value={values[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                  className={shared}
                >
                  <option value="">Select…</option>
                  {(field.options ?? []).map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={id}
                  type={field.type ?? "text"}
                  required={field.required}
                  placeholder={field.placeholder}
                  value={values[field.name] ?? ""}
                  onChange={(e) => set(field.name, e.target.value)}
                  className={shared}
                />
              )}
              {field.help && (
                <p className="mt-1.5 text-[13px] leading-5 text-[#6B6B60]">{field.help}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Honeypot: off-screen rather than display:none, which some bots detect,
          and excluded from tab order and the accessibility tree so nobody
          using a keyboard or a screen reader ever lands in it. */}
      <div aria-hidden className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0">
        <label htmlFor="company_website_url">Do not fill this in</label>
        <input
          id="company_website_url"
          name="company_website_url"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={honeypot}
          onChange={(e) => setHoneypot(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="mt-5 text-[14px] leading-6 text-[#B42318]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] text-[15px] font-semibold text-[#151515] transition-shadow hover:shadow-[3px_3px_0_#151515] disabled:opacity-70"
      >
        {status === "sending" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            Sending…
          </>
        ) : (
          submitLabel
        )}
      </button>
      <p className="mt-3 text-center text-[12.5px] leading-5 text-[#6B6B60]">
        We use what you send here to reply to you. Nothing else.
      </p>
    </form>
  );
}
