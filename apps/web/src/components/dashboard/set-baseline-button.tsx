"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

/** Approves a snapshot as the new baseline for its page. */
export function SetBaselineButton({
  snapshotId,
  label = "Set as baseline",
  size = "md",
}: {
  snapshotId: string;
  label?: string;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/snapshots/${snapshotId}/baseline`, { method: "POST" });
      const data = (await res.json()) as { baseline?: unknown; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update the baseline.");
      track("baseline_updated", { snapshotId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the baseline.");
      setLoading(false);
    }
  }

  const sizeClasses = size === "sm" ? "h-8 px-3.5 text-xs" : "h-10 px-5 text-[13px]";

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={loading}
        className={`inline-flex items-center gap-1.5 rounded-full border border-line bg-card font-medium text-ink-secondary transition-colors hover:border-primary hover:text-primary disabled:opacity-60 ${sizeClasses}`}
      >
        {loading ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          <CheckCircle2 className="size-3.5" aria-hidden />
        )}
        {label}
      </button>
      {error && (
        <span className="text-[11px] text-red-700" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
