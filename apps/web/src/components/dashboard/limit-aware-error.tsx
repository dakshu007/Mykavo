import Link from "next/link";
import { ArrowRight } from "lucide-react";

/** Messages that are about the plan (limits and paid features), not a failure. */
export function isPlanLimitMessage(message: string): boolean {
  return /\bupgrade\b|\bpaid plan\b|\bPro\b|\bAgency\b/i.test(message);
}

/**
 * An error line that turns into an upgrade prompt when the message is about
 * the plan: hitting a limit is the moment someone feels what Pro adds, so
 * the way there is one tap away instead of buried in Billing.
 */
export function LimitAwareError({
  message,
  placement,
  className = "text-sm",
}: {
  message: string;
  /** Recorded with the upgrade click, e.g. "limit:add-website". */
  placement: string;
  className?: string;
}) {
  if (!isPlanLimitMessage(message)) {
    return (
      <p className={`${className} text-critical-strong`} role="alert">
        {message}
      </p>
    );
  }
  return (
    <div className={`${className} flex flex-wrap items-center gap-x-3 gap-y-2 rounded-field bg-primary-soft px-3.5 py-2.5 text-ink`} role="alert">
      <span className="min-w-0 flex-1">{message}</span>
      <Link
        href={`/dashboard/billing?from=${encodeURIComponent(placement)}`}
        className="inline-flex h-8 shrink-0 items-center gap-1 rounded-full bg-primary px-3.5 text-[12.5px] font-semibold text-primary-contrast hover:bg-primary-hover"
      >
        See plans <ArrowRight className="size-3.5" aria-hidden />
      </Link>
    </div>
  );
}
