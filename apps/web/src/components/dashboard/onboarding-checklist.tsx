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
 *
 * The loop and the tail are rendered as two groups rather than one flat list.
 * A flat list of five makes every step look equally necessary, which is how a
 * first run turns into a menu; the split says plainly that three of them are
 * the product working and two are things to do afterwards.
 *
 * Progress counts the LOOP only. "2 of 5" when two optional extras are
 * outstanding understates how set up you actually are.
 */
export function OnboardingChecklist({
  steps,
  requiredDoneCount,
  requiredCount,
}: {
  steps: OnboardingStep[];
  requiredDoneCount: number;
  requiredCount: number;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const loop = steps.filter((s) => !s.optional);
  const tail = steps.filter((s) => s.optional);
  const loopDone = requiredDoneCount >= requiredCount;

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
          <h2 className="text-[15px] font-semibold text-ink">Get monitoring</h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            {loopDone
              ? "Monitoring is live. MyKavo scans on schedule and alerts you when something important changes."
              : `${requiredCount} steps to your first alert. You're ${requiredDoneCount} of ${requiredCount} in.`}
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
        {loop.map((step, i) => (
          <StepRow key={step.id} step={step} index={i} />
        ))}
      </ol>

      {tail.length > 0 && (
        <>
          <p className="mt-5 border-t border-line pt-4 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            Then go further
          </p>
          <ol className="divide-y divide-line">
            {tail.map((step, i) => (
              <StepRow key={step.id} step={step} index={loop.length + i} />
            ))}
          </ol>
        </>
      )}
    </section>
  );
}

/** One checklist row - a tick when done, a numbered link when not. */
function StepRow({ step, index }: { step: OnboardingStep; index: number }) {
  if (step.done) {
    return (
      <li className="flex items-center gap-3.5 py-3">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft">
          <Check className="size-3.5 text-success-strong" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 truncate text-sm text-ink-faint">{step.title}</p>
      </li>
    );
  }

  return (
    <li>
      <Link href={step.href} className="group flex items-center gap-3.5 py-3">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-accent">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink group-hover:text-accent">
            {step.title}
            {step.optional && (
              <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-wide text-ink-faint">
                Optional
              </span>
            )}
          </p>
          <p className="truncate text-xs text-ink-secondary">{step.description}</p>
        </div>
        <ArrowRight
          className="size-4 shrink-0 text-ink-faint transition-colors group-hover:text-accent"
          aria-hidden
        />
      </Link>
    </li>
  );
}
