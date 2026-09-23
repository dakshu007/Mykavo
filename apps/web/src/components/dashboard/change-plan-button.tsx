"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";

/**
 * Moves an existing subscription between Pro and Agency. The plan itself
 * flips when Dodo's webhook confirms the change (seconds for an upgrade, the
 * next billing date for a downgrade), so success shows a note rather than
 * pretending the page already reflects it.
 */
export function ChangePlanButton({
  target,
  label,
  confirmMessage,
  variant = "primary",
}: {
  target: "pro" | "agency";
  label: string;
  confirmMessage: string;
  variant?: "primary" | "quiet";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  async function change() {
    if (loading) return;
    if (!window.confirm(confirmMessage)) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/change-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plan: target }),
      });
      const data = (await res.json()) as { error?: string; direction?: "upgrade" | "downgrade" };
      if (!res.ok) throw new Error(data.error ?? "Could not change the plan.");
      setDone(
        data.direction === "upgrade"
          ? "Upgrade requested. It switches on as soon as the payment clears - usually a few seconds. Refresh to see it."
          : "Done. You keep your current plan until the end of this billing period, then move to Pro.",
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the plan.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <p className="text-sm text-ink" role="status">
        {done}
      </p>
    );
  }

  const styles =
    variant === "primary"
      ? "h-11 gap-2 bg-primary px-6 text-sm text-primary-contrast hover:bg-primary-hover"
      : "h-10 gap-1.5 border border-line bg-card px-4 text-[13px] text-ink-secondary hover:text-ink";

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={change}
        disabled={loading}
        className={`inline-flex items-center rounded-full font-medium transition-colors disabled:opacity-60 ${styles}`}
      >
        {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        {label}
        {variant === "primary" && !loading && <ArrowRight className="size-4" aria-hidden />}
      </button>
      {error && (
        <span className="text-[13px] text-critical-strong" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
