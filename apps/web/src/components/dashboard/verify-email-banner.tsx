"use client";

import { useState } from "react";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/lib/auth-client";

type SendState = "idle" | "sending" | "sent" | "error";

/**
 * Shown on every dashboard page while the signed-in user's email is
 * unverified. Verification is what unlocks the Pro trial, so the banner says
 * that plainly, and lets the user send a fresh link (the signup one expires
 * after an hour). Signed-in only: the resend endpoint refuses anonymous calls.
 */
export function VerifyEmailBanner({ email, trialDays }: { email: string; trialDays: number }) {
  const [state, setState] = useState<SendState>("idle");
  const [error, setError] = useState("");

  async function resend() {
    if (state === "sending") return;
    setState("sending");
    setError("");
    try {
      const res = await authClient.sendVerificationEmail({ email, callbackURL: "/dashboard" });
      if (res.error) {
        setError(
          res.error.status === 429
            ? "Too many requests. Please wait a minute and try again."
            : res.error.message || "Could not send the email. Please try again.",
        );
        setState("error");
        return;
      }
      setState("sent");
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
      setState("error");
    }
  }

  return (
    <div
      role="region"
      aria-label="Verify your email"
      className="mb-5 flex flex-col gap-3 rounded-xl bg-primary-soft p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex min-w-0 items-start gap-2.5">
        <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-accent" />
        <div className="min-w-0">
          <p className="text-[13px] font-semibold text-ink">Confirm your email address</p>
          <p className="mt-0.5 text-[12px] leading-snug text-ink-secondary">
            We sent a link to <span className="font-medium break-all text-ink">{email}</span>. Verifying starts
            your {trialDays}-day Pro trial, no card needed.
          </p>
          <p aria-live="polite" className="mt-1 text-[12px] leading-snug">
            {state === "sent" ? (
              <span className="text-ink-secondary">New link sent. Check your inbox and spam folder.</span>
            ) : state === "error" ? (
              <span role="alert" className="text-critical-strong">
                {error}
              </span>
            ) : null}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={resend}
        disabled={state === "sending"}
        aria-busy={state === "sending"}
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast shadow-[0_1px_2px_rgb(21_21_21/16%)] transition-[background-color,box-shadow,transform] duration-150 ease-out hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:scale-[0.985] active:shadow-none disabled:opacity-70 motion-reduce:transition-none motion-reduce:active:scale-100"
      >
        {state === "sending" ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {state === "sending" ? "Sending" : "Resend verification email"}
      </button>
    </div>
  );
}
