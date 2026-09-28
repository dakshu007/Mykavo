"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/** Queue a full Brevo contact sync; the worker runs it within a minute or so. */
export function SyncNowButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "queued" | "error">("idle");
  const [error, setError] = useState("");

  async function sync() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/admin/email-marketing/sync", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? "Could not start the sync.");
        setState("error");
        return;
      }
      setState("queued");
      // The worker picks it up shortly; refresh to show the new log line.
      setTimeout(() => router.refresh(), 8000);
    } catch {
      setError("Network error - try again.");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "queued" && <span className="text-[12px] text-success-strong">Queued - the worker runs it in a moment</span>}
      {state === "error" && <span className="max-w-64 text-[12px] text-critical-strong">{error}</span>}
      <button
        onClick={() => void sync()}
        disabled={disabled || state === "busy"}
        title={disabled ? "Connect Brevo first" : undefined}
        className="inline-flex h-9 items-center gap-1.5 rounded-full bg-surface px-4 text-[13px] font-medium text-ink transition-colors hover:bg-line/60 disabled:opacity-50"
      >
        {state === "busy" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}
        Sync now
      </button>
    </div>
  );
}
