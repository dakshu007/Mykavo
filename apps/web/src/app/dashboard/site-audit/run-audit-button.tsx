"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Play } from "lucide-react";

export function RunAuditButton({ websiteId, small = false }: { websiteId: string; small?: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/site-audit`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not start the audit.");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the audit.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button
        onClick={run}
        disabled={busy}
        className={
          small
            ? "inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
            : "inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        }
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Play className="size-3.5" aria-hidden />}
        Run audit
      </button>
      {error && (
        <span className="max-w-72 text-right text-[12px] text-critical-strong" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
