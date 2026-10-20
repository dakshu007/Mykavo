"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { Card, CardHeader } from "@/components/ui/card";

interface Explanation {
  headline: string;
  whatChanged: string;
  whyItMatters: string;
  howToFix: string[];
  urgency: "act_now" | "check_soon" | "no_action";
}

const URGENCY: Record<Explanation["urgency"], { label: string; className: string }> = {
  act_now: { label: "Act now", className: "bg-critical-soft text-critical-strong" },
  check_soon: { label: "Check this week", className: "bg-warning-soft text-warning-strong" },
  no_action: { label: "Probably fine", className: "bg-success-soft text-success-strong" },
};

/**
 * "Explain this change": a plain-language read of the change with fix steps.
 * Shown already when one is stored; HIGH and CRITICAL changes ask for one on
 * open, everything else waits for the button so the monthly allowance goes
 * to what matters.
 */
export function ChangeExplanationCard({
  changeId,
  initial,
  autoLoad,
}: {
  changeId: string;
  initial: Explanation | null;
  autoLoad: boolean;
}) {
  const [explanation, setExplanation] = useState<Explanation | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const asked = useRef(false);

  const explain = useCallback(async () => {
    if (asked.current) return;
    asked.current = true;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/changes/${changeId}/explain`, { method: "POST" });
      const data = (await res.json()) as { explanation?: Explanation; error?: string; code?: string };
      if (!res.ok || !data.explanation) {
        setError({ message: data.error ?? "Could not explain this change.", code: data.code });
        // Out of allowance: asking again would only get the same answer.
        asked.current = data.code === "quota_exhausted" || data.code === "budget_exhausted";
        return;
      }
      setExplanation(data.explanation);
      track("ai_explanation_shown", { changeId });
    } catch {
      setError({ message: "Could not reach MyKavo. Check your connection and try again." });
      asked.current = false;
    } finally {
      setLoading(false);
    }
  }, [changeId]);

  useEffect(() => {
    if (!autoLoad || initial) return;
    const timer = window.setTimeout(() => void explain(), 0);
    return () => window.clearTimeout(timer);
  }, [autoLoad, initial, explain]);

  return (
    <Card>
      <CardHeader
        icon={Sparkles}
        title="Explain this change"
        action={
          explanation ? (
            <span
              className={cn(
                "shrink-0 rounded-full px-2.5 py-0.5 text-[12px] font-semibold",
                URGENCY[explanation.urgency].className,
              )}
            >
              {URGENCY[explanation.urgency].label}
            </span>
          ) : undefined
        }
      />

      {explanation ? (
        <div className="space-y-4">
          <p className="text-[15px] font-semibold leading-6 text-ink">{explanation.headline}</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="label-micro mb-1.5">What changed</p>
              <p className="text-sm leading-6 text-ink">{explanation.whatChanged}</p>
            </div>
            <div>
              <p className="label-micro mb-1.5">Why it matters</p>
              <p className="text-sm leading-6 text-ink">{explanation.whyItMatters}</p>
            </div>
          </div>
          {explanation.howToFix.length > 0 && (
            <div>
              <p className="label-micro mb-1.5">How to fix it</p>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm leading-6 text-ink marker:text-ink-faint">
                {explanation.howToFix.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
          <p className="border-t border-line pt-3 text-[12.5px] text-ink-faint">
            Written by AI from this change&apos;s data. Check before acting.{" "}
            <Link
              href={`/services?change=${encodeURIComponent(changeId)}#request`}
              className="font-medium text-accent hover:underline"
            >
              Want us to fix it?
            </Link>
          </p>
        </div>
      ) : loading ? (
        <p className="flex items-center gap-2 text-sm text-ink-secondary" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden /> Reading the change…
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm leading-6 text-ink-secondary">
            {error ? (
              <span role="alert">{error.message}</span>
            ) : (
              "Get a plain-language summary of what changed, why it matters and how to fix it."
            )}
          </p>
          {error?.code === "quota_exhausted" ? (
            <Link
              href="/dashboard/billing?from=ai:quota"
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
            >
              See plans <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : error?.code === "budget_exhausted" ? null : (
            <button
              type="button"
              onClick={() => void explain()}
              className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover"
            >
              <Sparkles className="size-3.5" aria-hidden /> {error ? "Try again" : "Explain this change"}
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
