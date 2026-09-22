"use client";

import { useEffect, useId, useRef, useState } from "react";
import { BellRing, Check, Loader2, X } from "lucide-react";

/**
 * "Request the Android app" - the button and its dialog.
 *
 * The app is not on a store yet, so access is granted by hand. This collects
 * a name and an address, and says the two things somebody has to know before
 * they can ever use what they are asking for:
 *
 *  1. They will need a MyKavo account to download it.
 *  2. They must ask with the SAME address as that account.
 *
 * Both are stated before the fields rather than in small print after them,
 * because getting (2) wrong is silent: the approval lands on an address they
 * do not sign in with, they see no download, and they conclude MyKavo is
 * broken rather than that they typed the wrong email.
 *
 * Deliberately a plain <dialog>: native focus trapping, Escape, and the
 * backdrop for free, with none of the markup a modal library would add.
 */

type State = "idle" | "sending" | "sent";

/**
 * `hero` is the big gold pill in the Android section. `bar` is the compact
 * trigger inside the announcement strip, where the surrounding card already
 * carries the brand and a second loud gold pill would fight it.
 */
export type TriggerVariant = "hero" | "bar";

const TRIGGER_CLASS: Record<TriggerVariant, string> = {
  hero: "inline-flex items-center gap-2.5 rounded-full border border-black/25 bg-[#FFD400] px-7 py-3.5 text-[15px] font-semibold text-[#151515] shadow-[0_14px_40px_-10px_rgba(255,212,0,0.55)] transition-transform hover:-translate-y-0.5 active:translate-y-0",
  bar: "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FFD400] px-4 py-2 text-[13px] font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]",
};

export function RequestAppButton({
  variant = "hero",
  label = "Request the Android app",
}: {
  variant?: TriggerVariant;
  label?: string;
} = {}) {
  const ref = useRef<HTMLDialogElement>(null);
  const formId = useId();
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  // Close on backdrop click. A native dialog treats the backdrop as part of
  // itself, so the check is "was the click outside the panel's box".
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    function onClick(event: MouseEvent) {
      if (!el) return;
      const box = el.getBoundingClientRect();
      const outside =
        event.clientX < box.left ||
        event.clientX > box.right ||
        event.clientY < box.top ||
        event.clientY > box.bottom;
      if (outside) el.close();
    }
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, []);

  function open() {
    setError("");
    ref.current?.showModal();
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "sending") return;
    const data = new FormData(event.currentTarget);
    setState("sending");
    setError("");
    try {
      const res = await fetch("/api/app-access/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: String(data.get("name") ?? ""),
          email: String(data.get("email") ?? ""),
          source: "landing",
          company_website_url: String(data.get("company_website_url") ?? ""),
        }),
      });
      const body = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setError(body.error ?? "Something went wrong. Please try again.");
        setState("idle");
        return;
      }
      setMessage(body.message ?? "Request received.");
      setState("sent");
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <>
      <button type="button" onClick={open} className={TRIGGER_CLASS[variant]}>
        <BellRing className={variant === "hero" ? "size-4.5" : "size-3.5"} aria-hidden />
        {label}
      </button>

      <dialog
        ref={ref}
        aria-labelledby={`${formId}-title`}
        className="m-auto w-[min(30rem,calc(100vw-2rem))] rounded-2xl border border-[#151515] bg-white p-0 text-[#151515] shadow-[8px_8px_0_#151515] backdrop:bg-[#151515]/55"
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/10 px-6 py-5">
          <div>
            <h2 id={`${formId}-title`} className="text-[17px] font-semibold">
              {state === "sent" ? "Request received" : "Request the Android app"}
            </h2>
            <p className="mt-0.5 text-[13px] text-[#6B6B60]">
              {state === "sent"
                ? "Nothing else to do for now."
                : "We are approving testers in batches while the app is in review."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Close"
            className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-[#6B6B60] transition-colors hover:bg-[#F3F1E6] hover:text-[#151515]"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        {state === "sent" ? (
          <div className="px-6 py-7 text-center">
            <span className="inline-flex size-12 items-center justify-center rounded-full bg-[#FFF3B0]">
              <Check className="size-6 text-[#151515]" aria-hidden />
            </span>
            <p className="mx-auto mt-4 max-w-sm text-[15px] leading-7 text-[#151515]">
              {message}
            </p>
            <p className="mx-auto mt-3 max-w-sm text-[13px] leading-6 text-[#6B6B60]">
              When it is approved you will get an email with a download link, and the app
              will appear in your MyKavo dashboard.
            </p>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="mt-6 rounded-full border border-[#151515] bg-[#151515] px-6 py-2.5 text-sm font-semibold text-[#F5F5F0]"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5">
            {/* Stated BEFORE the fields: getting the address wrong fails
                silently, and silence gets blamed on the product. */}
            <div className="mb-5 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3.5">
              <p className="text-[13px] font-semibold">You will need a MyKavo account</p>
              <p className="mt-1 text-[12.5px] leading-5.5 text-[#6B6B60]">
                The download lives in your dashboard, so you have to be signed in to get
                it. Use the{" "}
                <strong className="font-semibold text-[#151515]">
                  same email address as your MyKavo account
                </strong>{" "}
                below &mdash; approval is tied to the address.
              </p>
            </div>

            <label
              htmlFor={`${formId}-name`}
              className="mb-1.5 block text-[13px] font-medium"
            >
              Your name
            </label>
            <input
              id={`${formId}-name`}
              name="name"
              type="text"
              required
              maxLength={80}
              autoComplete="name"
              placeholder="Alex Morgan"
              className="mb-4 h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-[15px] outline-none placeholder:text-[#9C9E93] focus:border-[#151515]"
            />

            <label
              htmlFor={`${formId}-email`}
              className="mb-1.5 block text-[13px] font-medium"
            >
              Email &mdash; the one on your MyKavo account
            </label>
            <input
              id={`${formId}-email`}
              name="email"
              type="email"
              required
              maxLength={200}
              autoComplete="email"
              inputMode="email"
              placeholder="you@company.com"
              className="h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 font-mono text-[14px] outline-none placeholder:font-sans placeholder:text-[#9C9E93] focus:border-[#151515]"
            />

            {/* Honeypot: off-screen rather than display:none, which some bots
                skip, and hidden from assistive tech either way. */}
            <div className="absolute left-[-9999px] top-auto size-px overflow-hidden" aria-hidden>
              <label htmlFor={`${formId}-cwu`}>Company website</label>
              <input id={`${formId}-cwu`} name="company_website_url" tabIndex={-1} autoComplete="off" />
            </div>

            {error && (
              <p className="mt-3 text-[13px] text-[#B42318]" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={state === "sending"}
              className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] text-[15px] font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d] disabled:opacity-60"
            >
              {state === "sending" && <Loader2 className="size-4 animate-spin" aria-hidden />}
              {state === "sending" ? "Sending…" : "Request access"}
            </button>
            <p className="mt-3 text-center text-[12px] text-[#6B6B60]">
              Free on every plan. We only use your address to send the download link.
            </p>
          </form>
        )}
      </dialog>
    </>
  );
}
