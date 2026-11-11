"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Loader2, PenLine } from "lucide-react";

/**
 * A small "Write for MyKavo" box at the end of every blog post: an email
 * field and a Send button that file a guest-post lead (the same /api/leads
 * pipeline as the full pitch form on /write-for-us), plus a link to the
 * guidelines. Deliberately short: a reader who just finished a post is the
 * right person to ask, and a long form here would get in their way.
 */
export function WriteForUsBox({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("sending");
    setError(null);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          kind: "guest-post",
          // The API needs a name; the short box only asks for an email.
          name: email.split("@")[0] || "Blog reader",
          email,
          message: `Wants to write a guest post. Sent from the box under /blog/${slug}.`,
          details: { source: `blog:${slug}` },
          company_website_url: honeypot,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
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

  return (
    <section
      aria-labelledby="write-for-us-heading"
      className="not-prose relative mt-8 rounded-2xl border border-black/10 bg-[#F5F5F0] p-5 sm:p-6"
    >
      <div className="flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-[#151515] text-[#FFD400]">
          <PenLine className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 id="write-for-us-heading" className="text-[17px] font-semibold text-[#151515]">
            Write for MyKavo
          </h2>
          <p className="mt-1 text-[14px] leading-6 text-[#5D5D55]">
            Know website monitoring, WordPress or SEO from real work? Pitch us a guide. You keep a byline with one link
            to your site.{" "}
            <Link href="/write-for-us" className="font-medium text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-2 hover:decoration-[#151515]">
              Read the guidelines
            </Link>
          </p>
        </div>
      </div>

      {status === "sent" ? (
        <p role="status" className="mt-4 flex items-center gap-2 text-[14px] font-medium text-[#151515]">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-[#FFD400]">
            <Check className="size-3.5" aria-hidden />
          </span>
          Thanks! We will email you within five business days.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-2 sm:flex-row">
          <label htmlFor="write-for-us-email" className="sr-only">
            Your email
          </label>
          <input
            id="write-for-us-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full min-w-0 rounded-full border border-black/15 bg-white px-4 sm:w-auto sm:flex-1 text-[14.5px] text-[#151515] placeholder:text-[#8A8A80] focus:border-[#151515] focus:outline-none"
          />
          {/* Honeypot, hidden from people; same field name as the full form. */}
          <div aria-hidden className="absolute -left-[9999px] h-px w-px overflow-hidden">
            <label htmlFor="write-for-us-hp">Do not fill this in</label>
            <input
              id="write-for-us-hp"
              name="company_website_url"
              type="text"
              tabIndex={-1}
              autoComplete="off"
              value={honeypot}
              onChange={(e) => setHoneypot(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={status === "sending"}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#151515] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] disabled:opacity-60"
          >
            {status === "sending" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            Send
            {status !== "sending" && <ArrowRight className="size-4" aria-hidden />}
          </button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[13px] text-[#B42318]">
          {error}
        </p>
      )}
    </section>
  );
}
