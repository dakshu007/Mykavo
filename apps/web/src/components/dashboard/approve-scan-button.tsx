"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Baseline, Loader2 } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Approve an entire scan: promotes every changed page's current snapshot to
 * its new baseline and approves the scan's open changes (spec §24).
 */
export function ApproveScanButton({
  scanId,
  openChangeCount,
}: {
  scanId: string;
  openChangeCount: number;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function approve() {
    if (loading) return;
    const ok = window.confirm(
      `Accept all ${openChangeCount} open change${openChangeCount === 1 ? "" : "s"} from this scan as the new baseline? Future scans will compare against the current state of each changed page.`,
    );
    if (!ok) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/scans/${scanId}/approve`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not approve the scan.");
      track("baseline_updated", { scanId, scope: "scan" });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not approve the scan.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={approve}
        disabled={loading}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Baseline className="size-4" aria-hidden />
        )}
        Approve entire scan
      </button>
      {error && (
        <p className="text-[13px] text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
