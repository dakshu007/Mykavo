"use client";

import { useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Waitlist capture used in hero, pricing, and final CTA.
 * Pill input + pill button composition per the design system.
 */
export function WaitlistForm({
  source,
  buttonLabel = "Start Monitoring Free",
  className,
  align = "left",
}: {
  source: string;
  buttonLabel?: string;
  className?: string;
  align?: "left" | "center";
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, source }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong. Please try again.");
        return;
      }
      track("waitlist_joined", { source });
      setStatus("done");
    } catch {
      setStatus("error");
      setMessage("Something went wrong. Please try again.");
    }
  }

  if (status === "done") {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 text-[15px] font-medium text-green-700",
          align === "center" && "justify-center",
          className,
        )}
        role="status"
      >
        <CheckCircle2 className="size-5" aria-hidden />
        You&apos;re on the list — we&apos;ll email you when your monitoring seat is ready.
      </div>
    );
  }

  return (
    <form onSubmit={submit} className={cn("w-full max-w-xl", className)}>
      <div
        className={cn(
          "flex flex-col gap-3 sm:flex-row",
          align === "center" && "sm:justify-center",
        )}
      >
        <label className="sr-only" htmlFor={`waitlist-email-${source}`}>
          Work email
        </label>
        <input
          id={`waitlist-email-${source}`}
          type="email"
          required
          autoComplete="email"
          placeholder="you@agency.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-12 flex-1 rounded-full border border-line bg-card px-5 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-7 text-[15px] font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {status === "loading" && <Loader2 className="size-4 animate-spin" aria-hidden />}
          {buttonLabel}
        </button>
      </div>
      {status === "error" && (
        <p className="mt-2 text-sm text-red-700" role="alert">
          {message}
        </p>
      )}
      <p
        className={cn(
          "mt-2.5 text-[13px] text-ink-faint",
          align === "center" && "text-center",
        )}
      >
        Free plan available at launch. No credit card required.
      </p>
    </form>
  );
}
