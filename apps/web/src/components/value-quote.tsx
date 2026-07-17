"use client";

import { useSyncExternalStore } from "react";

/**
 * Region-aware value quote (user-directed copy): the US line is the default
 * (primary market) and swaps to the INR line for visitors whose browser
 * timezone is India. SSR always renders the US version so marketing pages
 * stay fully static; the client corrects after hydration - same pattern as
 * the dashboard greeting.
 */

const INDIA_TIMEZONES = new Set(["Asia/Calcutta", "Asia/Kolkata"]);

function subscribe(): () => void {
  return () => {};
}

function isIndiaClient(): boolean {
  try {
    return INDIA_TIMEZONES.has(Intl.DateTimeFormat().resolvedOptions().timeZone);
  } catch {
    return false;
  }
}

export function useIsIndia(): boolean {
  // useSyncExternalStore keeps SSR + first client render consistent (false),
  // then snaps to the real value without a hydration mismatch.
  return useSyncExternalStore(subscribe, isIndiaClient, () => false);
}

export const VALUE_QUOTE = {
  us: {
    lead: "Your most valuable investment isn't $20/month",
    tail: "it's the hours you'll get back.",
    perDay: "Just $0.67/day.",
  },
  in: {
    lead: "Your best investment isn't ₹1,700/month",
    tail: "it's the hours you'll get back.",
    perDay: "Just ~₹57/day.",
  },
} as const;

/** Big, attractive marketing variant (landing + pricing, v4 fixed palette). */
export function ValueQuoteBanner() {
  const quote = VALUE_QUOTE[useIsIndia() ? "in" : "us"];
  return (
    <figure className="mx-auto max-w-3xl px-5 text-center">
      <blockquote className="relative rounded-2xl border border-[#151515] bg-white px-7 py-10 shadow-[7px_7px_0_#FFD400,7px_7px_0_1px_#151515] sm:px-12">
        <span
          aria-hidden
          className="absolute -top-5 left-1/2 inline-flex -translate-x-1/2 items-center rounded-full border border-[#151515] bg-[#FFD400] px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#151515]"
        >
          Do the math
        </span>
        <p className="[font-family:var(--font-poppins),ui-sans-serif,system-ui,sans-serif] text-2xl font-medium leading-snug tracking-[-0.01em] text-[#151515] sm:text-[32px] sm:leading-[1.3]">
          {quote.lead} -{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span
              aria-hidden
              className="absolute inset-x-[-3px] bottom-[8%] top-[12%] -rotate-1 rounded bg-[#FFD400]"
            />
            <span className="relative">{quote.tail}</span>
          </span>
        </p>
        <figcaption className="mt-4 font-mono text-[15px] font-semibold text-[#6B6B60]">
          {quote.perDay}
        </figcaption>
      </blockquote>
    </figure>
  );
}

/** Compact dashboard variant (fx design tokens, light + dark themes). */
export function ValueQuoteCard() {
  const quote = VALUE_QUOTE[useIsIndia() ? "in" : "us"];
  return (
    <div className="rounded-card border border-line bg-card px-5 py-4">
      <p className="text-[15px] font-medium leading-6 text-ink">
        {quote.lead} - <span className="text-primary">{quote.tail}</span>
      </p>
      <p className="mt-1 font-mono text-[13px] font-semibold text-ink-secondary">{quote.perDay}</p>
    </div>
  );
}
