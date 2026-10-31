"use client";

import { useState, type ReactNode } from "react";

type Interval = "month" | "year";

/**
 * Monthly or yearly, for the plan offers on Billing. Both sets of offers are
 * already rendered on the server; the switch only shows one, so changing it
 * is instant (no reload), and the URL keeps ?interval=year for sharing and
 * for the pricing page's signup redirect.
 */
export function BillingIntervalOffers({
  initial,
  monthly,
  yearly,
  monthlyNote,
}: {
  initial: Interval;
  monthly: ReactNode;
  yearly: ReactNode;
  /** Shown under Monthly: a running offer's note, or the yearly saving. */
  monthlyNote: string;
}) {
  const [interval, setInterval_] = useState<Interval>(initial);

  function choose(next: Interval) {
    setInterval_(next);
    const url = new URL(window.location.href);
    if (next === "year") url.searchParams.set("interval", "year");
    else url.searchParams.delete("interval");
    window.history.replaceState(null, "", url);
  }

  const tab = (on: boolean) =>
    `relative z-10 rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
      on ? "text-primary-contrast" : "text-ink-secondary hover:text-ink"
    }`;

  return (
    <>
      <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <div role="radiogroup" aria-label="Billing interval" className="relative inline-grid grid-cols-2 rounded-full border border-line bg-card p-1">
          <span
            aria-hidden
            className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full bg-primary shadow-sm transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none ${
              interval === "year" ? "translate-x-full" : "translate-x-0"
            }`}
          />
          <button type="button" role="radio" aria-checked={interval === "month"} onClick={() => choose("month")} className={tab(interval === "month")}>
            Monthly
          </button>
          <button type="button" role="radio" aria-checked={interval === "year"} onClick={() => choose("year")} className={tab(interval === "year")}>
            Yearly
          </button>
        </div>
        <p className="text-[13px] text-ink-secondary">
          {interval === "year" ? "12 months for the price of 10." : monthlyNote}
        </p>
      </div>
      {interval === "year" ? yearly : monthly}
    </>
  );
}
