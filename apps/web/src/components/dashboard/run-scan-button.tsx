"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Radar } from "lucide-react";
import { track } from "@/lib/analytics";
import { LimitAwareError } from "@/components/dashboard/limit-aware-error";

export function RunScanButton({
  websiteId,
  isFirstScan,
}: {
  websiteId: string;
  isFirstScan: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/scan`, { method: "POST" });
      const data = (await res.json()) as { scan?: { id: string }; scanId?: string; error?: string };
      if (res.status === 409 && data.scanId) {
        router.push(`/dashboard/scans/${data.scanId}`);
        return;
      }
      if (!res.ok || !data.scan) throw new Error(data.error ?? "Could not start the scan.");
      track(isFirstScan ? "baseline_started" : "scan_completed", { websiteId });
      router.push(`/dashboard/scans/${data.scan.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the scan.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={run}
        disabled={loading}
        className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Radar className="size-4" aria-hidden />
        )}
        {isFirstScan ? "Run baseline scan" : "Run scan"}
      </button>
      {error && <LimitAwareError message={error} placement="limit:run-scan" className="text-[13px]" />}
    </div>
  );
}
