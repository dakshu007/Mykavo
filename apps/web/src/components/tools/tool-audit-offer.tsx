"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { track } from "@/lib/analytics";
import { displayHost } from "@/lib/attribution/monitor-link";

type State =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "sent"; host: string }
  | { kind: "error"; message: string };

/**
 * The no-account next step under a free tool's results: "email me a full
 * audit of example.com". Tool visitors arrive to check one thing once; most
 * are not ready to create a monitoring account (search data: about 60
 * organic clicks a month on the script and analytics tools, no signups from
 * them). An address is a much smaller ask than an account, the audit is the
 * natural next question after checking one page, and the audit email ends
 * in "see every issue - free account" with their site filled in. Uses the
 * same endpoint, limits and worker queue as the homepage form.
 */
export function ToolAuditOffer({ url, tool }: { url: string; tool: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const site = siteRoot(url);
  const host = displayHost(site);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || state.kind === "sending") return;
    track("cta_clicked", { cta: "tool_audit_email", tool });
    setState({ kind: "sending" });
    try {
      const res = await fetch("/api/audit-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: site, email }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; host?: string; error?: string };
      if (!res.ok || !data.ok) {
        setState({ kind: "error", message: data.error ?? "Something went wrong. Please try again." });
        return;
      }
      track("audit_requested", { placement: `tool:${tool}`.slice(0, 60) });
      setState({ kind: "sent", host: data.host ?? host });
    } catch {
      setState({ kind: "error", message: "Couldn't reach MyKavo. Check your connection and try again." });
    }
  }

  if (state.kind === "sent") {
    return (
      <div role="status" className="mx-auto mt-6 flex max-w-md items-start gap-2.5 rounded-xl bg-[#F5F5F0]/[0.06] p-3.5 text-left">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#4ade80]" aria-hidden />
        <p className="text-[13px] leading-5 text-[#D9DBD0]">
          <b className="text-[#F5F5F0]">Your audit of {state.host} is on its way.</b> We&apos;re crawling the site now; it
          lands in your inbox in a few minutes.
        </p>
      </div>
    );
  }

  const sending = state.kind === "sending";
  return (
    <form onSubmit={submit} noValidate className="mx-auto mt-7 max-w-md border-t border-[#F5F5F0]/10 pt-6 text-left">
      <p className="text-[13.5px] font-semibold text-[#F5F5F0]">Not ready for an account?</p>
      <p className="mt-0.5 text-[12.5px] leading-5 text-[#9C9E93]">
        Get a free audit of all of {host} by email: up to 150 pages, 98 checks, the worst issues explained.
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label className="sr-only" htmlFor={`audit-email-${tool}`}>
          Your email
        </label>
        <div className="flex min-w-0 flex-1 items-center rounded-full border border-[#F5F5F0]/20 bg-[#F5F5F0]/[0.06] focus-within:border-[#FFD400]">
          <Mail className="ml-3.5 size-4 shrink-0 text-[#9C9E93]" aria-hidden />
          <input
            id={`audit-email-${tool}`}
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 min-w-0 flex-1 bg-transparent px-2.5 text-[14px] text-[#F5F5F0] placeholder:text-[#9C9E93] focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-full border border-[#F5F5F0]/30 px-5 text-[13.5px] font-semibold text-[#F5F5F0] transition-colors hover:border-[#FFD400] hover:text-[#FFD400] disabled:opacity-70"
        >
          {sending ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Starting
            </>
          ) : (
            <>
              Email my audit
              <ArrowRight className="size-4" aria-hidden />
            </>
          )}
        </button>
      </div>
      {state.kind === "error" && (
        <p role="alert" className="mt-2 text-[12.5px] font-medium text-[#ff8a80]">
          {state.message}
        </p>
      )}
      <p className="mt-2 text-[11.5px] text-[#9C9E93]">No signup. One email with the report, nothing else.</p>
    </form>
  );
}

/** The site's home page: the audit crawls the whole site from there. */
export function siteRoot(url: string): string {
  try {
    return `${new URL(url).origin}/`;
  } catch {
    return url;
  }
}
