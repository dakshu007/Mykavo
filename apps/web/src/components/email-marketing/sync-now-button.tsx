"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";

/** Run a full Brevo contact sync now and say what it did. */
export function SyncNowButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  const [error, setError] = useState("");
  const [summary, setSummary] = useState("");

  async function sync() {
    setState("busy");
    setError("");
    try {
      const res = await fetch("/api/admin/email-marketing/sync", { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as {
        error?: string;
        contacts?: number;
        blocklisted?: number;
        pulledUnsubscribes?: number;
      };
      if (!res.ok) {
        setError(body.error ?? "The sync failed.");
        setState("error");
        return;
      }
      setSummary(
        `Synced ${body.contacts ?? 0} contacts` +
          (body.blocklisted ? `, ${body.blocklisted} unsubscribed kept blocked` : "") +
          (body.pulledUnsubscribes ? `, ${body.pulledUnsubscribes} new unsubscribes from Brevo` : ""),
      );
      setState("done");
      router.refresh();
    } catch {
      setError("Network error - try again.");
      setState("error");
    }
  }

  return (
    <div className="flex items-center gap-2">
      {state === "busy" && <span className="text-[12px] text-ink-secondary">Syncing with Brevo…</span>}
      {state === "done" && <span className="text-[12px] text-success-strong">{summary}</span>}
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
