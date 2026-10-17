import Link from "next/link";
import { ArrowRight, Check, ChevronRight } from "lucide-react";
import type { SetupGuide as SetupGuideState, SetupStep } from "./setup-guide-steps";

/**
 * Setup guide card for new accounts. The step to do next is open, with its
 * explanation and one primary button; the others are a single line each, so
 * the card reads as one path rather than a menu. Hidden by the page once
 * every required step is done.
 */
export function SetupGuide({ guide }: { guide: SetupGuideState }) {
  const percent = guide.requiredCount === 0 ? 100 : Math.round((guide.requiredDone / guide.requiredCount) * 100);

  return (
    <section aria-labelledby="setup-guide-heading" className="rounded-card bg-card p-5 shadow-card sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="setup-guide-heading" className="text-[15px] font-semibold text-ink">
            Set up MyKavo
          </h2>
          <p className="mt-0.5 text-[13px] text-ink-secondary">
            Finish these and MyKavo tells you when something important changes.
          </p>
        </div>
        <p className="text-[13px] font-medium text-ink-secondary">
          {guide.requiredDone} of {guide.requiredCount} done
        </p>
      </div>
      <div
        role="progressbar"
        aria-label="Setup progress"
        aria-valuemin={0}
        aria-valuemax={guide.requiredCount}
        aria-valuenow={guide.requiredDone}
        aria-valuetext={`${guide.requiredDone} of ${guide.requiredCount} required steps done`}
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface"
      >
        <div className="h-full rounded-full bg-success" style={{ width: `${percent}%` }} />
      </div>

      <ol className="mt-4 divide-y divide-line">
        {guide.steps.map((step) => (
          <StepItem key={step.id} step={step} current={step.id === guide.currentStepId} />
        ))}
      </ol>
    </section>
  );
}

function OptionalTag() {
  return (
    <span className="ml-2 align-middle text-[11px] font-medium uppercase tracking-wide text-ink-faint">
      Optional
    </span>
  );
}

function StepItem({ step, current }: { step: SetupStep; current: boolean }) {
  if (step.done) {
    return (
      <li className="flex items-center gap-3 py-3">
        <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-success-soft">
          <Check className="size-3.5 text-success-strong" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm text-ink-faint">
          <span className="sr-only">Done: </span>
          {step.title}
        </p>
      </li>
    );
  }

  if (current) {
    return (
      <li className="flex gap-3 py-4" aria-current="step">
        <span
          aria-hidden
          className="mt-0.5 inline-flex size-6 shrink-0 rounded-full border-2 border-dashed border-ink-faint"
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">
            {step.title}
            {step.optional && <OptionalTag />}
          </p>
          <p className="mt-1 max-w-prose text-[13px] leading-5 text-ink-secondary">{step.description}</p>
          <Link
            href={step.href}
            className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {step.actionLabel}
            <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </div>
      </li>
    );
  }

  return (
    <li>
      <Link href={step.href} className="group flex items-center gap-3 rounded-lg py-3">
        <span
          aria-hidden
          className="inline-flex size-6 shrink-0 rounded-full border-2 border-dashed border-ink-faint"
        />
        <p className="min-w-0 flex-1 text-sm text-ink group-hover:text-accent">
          {step.title}
          {step.optional && <OptionalTag />}
        </p>
        <ChevronRight
          className="size-4 shrink-0 text-ink-faint transition-colors group-hover:text-accent"
          aria-hidden
        />
      </Link>
    </li>
  );
}
