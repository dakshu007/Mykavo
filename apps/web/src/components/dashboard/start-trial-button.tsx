"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/** Starts the free Pro trial in one click, then refreshes the page into trial mode. */
export function StartTrialButton({ label, className }: { label: string; className: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/billing/trial", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start the trial.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the trial.");
      setLoading(false);
    }
  }

  return (
    <>
      <button type="button" onClick={start} disabled={loading} aria-busy={loading} className={className}>
        {loading ? <Loader2 aria-hidden className="size-4 animate-spin" /> : null}
        {loading ? "Starting your trial" : label}
      </button>
      {error ? (
        <p role="alert" className="mt-2 text-[12px] text-critical-strong">
          {error}
        </p>
      ) : null}
    </>
  );
}
