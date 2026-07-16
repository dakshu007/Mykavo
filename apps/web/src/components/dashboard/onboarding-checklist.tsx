"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, X } from "lucide-react";
import type { OnboardingStep } from "@/lib/onboarding";

/**
 * "Get set up" checklist card. Step states arrive fully derived from the
 * server (live database counts) - this component only renders them and
 * handles dismissal: hide immediately, then persist via a cookie so the
 * card stays hidden on future visits.
 */
export function OnboardingChecklist({
  steps,
  doneCount,
}: {
  steps: OnboardingStep[];
  doneCount: number;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function dismiss() {
    setHidden(true);
    void fetch("/api/onboarding/dismiss", { method: "POST" }).catch(() => {
      // Cookie write failed - the card simply reappears on the next visit.
    });
  }

  return (
    <section
      aria-label="Getting started checklist"
      className="rounded-card bg-card p-6 shadow-card"
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Get set up</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            You&apos;re {doneCount} of {steps.length} steps in.
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss getting started checklist"
          className="-mr-1.5 -mt-1.5 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <ol className="divide-y divide-line">
        {steps.map((step, i) =>
          step.done ? (
            <li key={step.id} className="flex items-center gap-3.5 py-3">
              <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft">
                <Check className="size-3.5 text-success-strong" aria-hidden />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm text-ink-faint">
                {step.title}
              </p>
            </li>
          ) : (
            <li key={step.id}>
              <Link
                href={step.href}
                className="group flex items-center gap-3.5 py-3"
              >
                <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ink group-hover:text-primary">
                    {step.title}
                    {step.optional && (
                      <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                        Optional
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-ink-secondary">
                    {step.description}
                  </p>
                </div>
                <ArrowRight
                  className="size-4 shrink-0 text-ink-faint transition-colors group-hover:text-primary"
                  aria-hidden
                />
              </Link>
            </li>
          ),
        )}
      </ol>
    </section>
  );
}
