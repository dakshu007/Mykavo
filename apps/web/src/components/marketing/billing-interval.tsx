"use client";

import { useId } from "react";

export type BillingInterval = "month" | "year";

/** Whole dollars stay whole: $200, $16.67. */
export function usd(amount: number): string {
  return Number.isInteger(amount) ? `$${amount}` : `$${amount.toFixed(2)}`;
}

/** What a year costs per month: $200 a year is $16.67 a month. */
export function perMonth(yearlyUsd: number): number {
  return Math.round((yearlyUsd / 12) * 100) / 100;
}

/** What yearly billing saves against twelve monthly payments. */
export function yearlySaving(monthlyUsd: number, yearlyUsd: number): number {
  return Math.max(0, monthlyUsd * 12 - yearlyUsd);
}

/**
 * The Monthly / Yearly switch: a pill with a thumb that slides between the
 * two, and a "2 months free" tag that lights up when yearly is on. A real
 * radio group underneath, so it works with the keyboard and screen readers.
 */
export function BillingIntervalSwitch({
  value,
  onChange,
  tone = "light",
  savingLabel = "2 months free",
}: {
  value: BillingInterval;
  onChange: (next: BillingInterval) => void;
  tone?: "light" | "dark";
  savingLabel?: string;
}) {
  const name = useId();
  const dark = tone === "dark";
  const options: { id: BillingInterval; label: string }[] = [
    { id: "month", label: "Monthly" },
    { id: "year", label: "Yearly" },
  ];
  return (
    <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:gap-4">
      <div
        role="radiogroup"
        aria-label="Billing"
        className={`relative grid grid-cols-2 rounded-full border p-1 ${
          dark ? "border-white/15 bg-white/[0.06]" : "border-[#151515] bg-white shadow-[3px_3px_0_#151515]"
        }`}
      >
        {/* The thumb slides under the chosen option. */}
        <span
          aria-hidden
          className={`absolute inset-y-1 left-1 w-[calc(50%-4px)] rounded-full transition-transform duration-300 ease-[cubic-bezier(.3,1.4,.5,1)] motion-reduce:transition-none ${
            dark ? "bg-[#FFCF00]" : "bg-[#151515]"
          } ${value === "year" ? "translate-x-full" : "translate-x-0"}`}
        />
        {options.map((o) => {
          const on = value === o.id;
          return (
            <label
              key={o.id}
              className={`relative z-10 cursor-pointer rounded-full px-6 py-2 text-center text-[14px] font-semibold transition-colors focus-within:ring-2 focus-within:ring-[#FFCF00] focus-within:ring-offset-2 ${
                on ? (dark ? "text-[#0B0B0B]" : "text-white") : dark ? "text-white/70 hover:text-white" : "text-[#151515]/70 hover:text-[#151515]"
              }`}
            >
              <input
                type="radio"
                name={name}
                value={o.id}
                checked={on}
                onChange={() => onChange(o.id)}
                className="sr-only"
              />
              {o.label}
            </label>
          );
        })}
      </div>
      <span
        className={`rounded-full px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-all duration-300 motion-reduce:transition-none ${
          value === "year"
            ? "scale-100 bg-[#FFCF00] text-[#0B0B0B] shadow-[0_0_18px_rgb(255_207_0/0.6)]"
            : dark
              ? "scale-95 bg-white/[0.08] text-white/60"
              : "scale-95 bg-[#151515]/[0.06] text-[#151515]/60"
        }`}
      >
        {savingLabel}
      </span>
    </div>
  );
}
