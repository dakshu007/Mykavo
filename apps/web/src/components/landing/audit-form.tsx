"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Globe, Loader2, Mail } from "lucide-react";
import { track } from "@/lib/analytics";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; host: string }
  | { kind: "error"; message: string };

/**
 * Landing hero: "Email me a free site audit". A website and an inbox; the
 * worker crawls the site and emails the report (score, counts, the worst
 * issues in full) a few minutes later, with the rest unlocked by a free
 * account. Replaces the instant URL check, which visitors rarely used: a
 * report in their inbox is worth more to them, and their address to us.
 */
export function LandingAuditForm() {
  const [url, setUrl] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim() || !email.trim() || state.kind === "sending") return;
    track("cta_clicked", { cta: "hero_audit_email" });
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/audit-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, email, company }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; host?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      track("audit_requested", { placement: "hero" });
      setState({ kind: "sent", host: data.host ?? url });
    } catch {
      setState({ kind: "error", message: "Couldn't reach MyKavo. Check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div
        role="status"
        className="mx-auto flex w-full max-w-2xl items-start gap-3 rounded-2xl border border-[#151515] bg-white p-5 text-left shadow-[5px_5px_0_#151515]"
      >
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-[#14843f]" aria-hidden />
        <div>
          <p className="text-[15px] font-semibold text-[#151515]">Your audit of {state.host} is on its way</p>
          <p className="mt-1 text-sm text-[#6B6B60]">
            We&apos;re crawling the site now. The report lands in your inbox in a few minutes.{" "}
            <button
              type="button"
              onClick={() => {
                setUrl("");
                setState({ kind: "idle" });
              }}
              className="font-medium text-[#151515] underline underline-offset-2"
            >
              Audit another site
            </button>
          </p>
        </div>
      </div>
    );
  }

  const sending = state.kind === "sending";
  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl" noValidate>
      <div className="flex flex-col gap-2 rounded-2xl border border-[#151515] bg-white p-2 shadow-[5px_5px_0_#151515] sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center">
          <span className="ml-3 text-[#151515]/40">
            <Globe className="size-5" aria-hidden />
          </span>
          <label className="sr-only" htmlFor="audit-url">
            Website URL
          </label>
          <input
            id="audit-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            required
            placeholder="yourwebsite.com"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[#151515] placeholder:text-[#151515]/40 focus:outline-none"
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center border-t border-[#151515]/10 sm:border-t-0 sm:border-l">
          <span className="ml-3 text-[#151515]/40">
            <Mail className="size-5" aria-hidden />
          </span>
          <label className="sr-only" htmlFor="audit-email">
            Your email
          </label>
          <input
            id="audit-email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent px-2 text-[15px] text-[#151515] placeholder:text-[#151515]/40 focus:outline-none"
          />
        </div>
        {/* Honeypot: off-screen and skipped by keyboard and screen readers. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          className="absolute -left-[9999px] h-0 w-0 opacity-0"
        />
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#151515] bg-[#FFD400] px-5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d] disabled:opacity-70"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Starting audit
            </>
          ) : (
            <>
              Email my free audit
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="mt-3 text-center text-[13px] font-medium text-[#d92d32]">
          {state.message}
        </p>
      )}
    </form>
  );
}
