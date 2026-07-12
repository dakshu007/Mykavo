"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function CancelSubscriptionButton({ apiCancel }: { apiCancel: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function cancel() {
    if (loading) return;
    // Without the API key, cancellation is done through the hosted portal.
    if (!apiCancel) {
      window.location.href = "/api/billing/portal";
      return;
    }
    const ok = window.confirm(
      "Cancel your Pro subscription? It stays active until the end of the current billing period.",
    );
    if (!ok) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/cancel", { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not cancel.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel.");
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={cancel}
        disabled={loading}
        className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
      >
        {loading && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        Cancel subscription
      </button>
      {error && (
        <span className="text-[13px] text-critical-strong" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
