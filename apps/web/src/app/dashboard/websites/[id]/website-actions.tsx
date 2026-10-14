"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import { LimitAwareError } from "@/components/dashboard/limit-aware-error";

export function WebsiteActions({
  websiteId,
  websiteName,
  paused,
}: {
  websiteId: string;
  websiteName: string;
  paused: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<"pause" | "delete" | null>(null);
  const [error, setError] = useState("");

  async function togglePause() {
    setBusy("pause");
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ paused: !paused }),
      });
      if (!res.ok) {
        // The plan limit message (resuming beyond Free) is shown as-is, with
        // the way to upgrade next to it.
        const data = (await res.json().catch(() => null)) as { error?: string; upgrade?: boolean } | null;
        throw new Error(data?.upgrade && data.error ? data.error : "Could not update the website. Please try again.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not update the website. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Delete "${websiteName}" and all its monitored pages? This cannot be undone.`,
    );
    if (!confirmed) return;
    setBusy("delete");
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      router.push("/dashboard/websites");
      router.refresh();
    } catch {
      setError("Could not delete the website. Please try again.");
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={togglePause}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
        >
          {busy === "pause" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : paused ? (
            <Play className="size-3.5" aria-hidden />
          ) : (
            <Pause className="size-3.5" aria-hidden />
          )}
          {paused ? "Resume monitoring" : "Pause monitoring"}
        </button>
        <button
          onClick={handleDelete}
          disabled={busy !== null}
          className="inline-flex items-center gap-1.5 rounded-full border border-critical/30 bg-card px-4 py-2 text-[13px] font-medium text-critical-strong transition-colors hover:bg-critical-soft disabled:opacity-60"
        >
          {busy === "delete" ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <Trash2 className="size-3.5" aria-hidden />
          )}
          Delete website
        </button>
      </div>
      {error && (
        <div className="mt-2">
          <LimitAwareError message={error} placement="limit:resume-website" />
        </div>
      )}
    </div>
  );
}
