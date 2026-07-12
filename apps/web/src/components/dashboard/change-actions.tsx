"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Baseline,
  Check,
  CheckCircle2,
  Eye,
  Loader2,
  RotateCcw,
  X,
} from "lucide-react";
import type { ChangeStatus } from "@fluxen/database";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import { ChangeStatusBadge } from "@/components/dashboard/change-badges";

type Action = "review" | "approve" | "ignore" | "resolve" | "reopen";

/**
 * Change triage + baseline-update actions (spec §33). Buttons are contextual
 * to the change's current status. "Update baseline" accepts the current state
 * as the new normal and resolves the page's open changes.
 */
export function ChangeActions({
  changeId,
  status,
  canUpdateBaseline,
  layout = "row",
}: {
  changeId: string;
  status: ChangeStatus;
  canUpdateBaseline: boolean;
  layout?: "row" | "compact";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | "baseline" | null>(null);
  const [error, setError] = useState("");

  async function act(action: Action) {
    if (busy) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch(`/api/changes/${changeId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Action failed.");
      }
      if (action === "approve") track("change_approved", { changeId });
      else if (action === "review") track("change_reviewed", { changeId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed.");
      setBusy(null);
    }
  }

  async function updateBaseline() {
    if (busy) return;
    const ok = window.confirm(
      "Accept the current state as the new baseline for this page? This approves all open changes on the page and future scans will compare against the new state.",
    );
    if (!ok) return;
    setBusy("baseline");
    setError("");
    try {
      const res = await fetch(`/api/changes/${changeId}/update-baseline`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not update the baseline.");
      track("baseline_updated", { changeId });
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the baseline.");
      setBusy(null);
    }
  }

  const isOpen = status === "NEW" || status === "REVIEWED";
  const compact = layout === "compact";
  const btn =
    "inline-flex items-center gap-1.5 rounded-full font-medium transition-colors disabled:opacity-60";
  const size = "h-10 px-4 text-[13px]";

  // Compact list variant: icon-only approve / ignore. The consequential
  // "Update baseline" action stays on the change detail page.
  if (compact) {
    if (!isOpen) return <ChangeStatusBadge status={status} />;
    return (
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          onClick={() => act("approve")}
          disabled={busy !== null}
          aria-label="Approve change"
          title="Approve"
          className="inline-flex size-8 items-center justify-center rounded-full border border-line bg-card text-ink-secondary transition-colors hover:border-success hover:text-success disabled:opacity-60"
        >
          {busy === "approve" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Check className="size-4" aria-hidden />
          )}
        </button>
        <button
          onClick={() => act("ignore")}
          disabled={busy !== null}
          aria-label="Ignore change"
          title="Ignore"
          className="inline-flex size-8 items-center justify-center rounded-full border border-line bg-card text-ink-secondary transition-colors hover:border-ink-faint hover:text-ink disabled:opacity-60"
        >
          {busy === "ignore" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <X className="size-4" aria-hidden />
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-1.5", compact ? "items-end" : "")}>
      <div className="flex flex-wrap gap-2">
        {isOpen ? (
          <>
            {canUpdateBaseline && (
              <button
                onClick={updateBaseline}
                disabled={busy !== null}
                className={cn(btn, size, "bg-primary text-primary-contrast hover:bg-primary-hover")}
              >
                {busy === "baseline" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Baseline className="size-3.5" aria-hidden />
                )}
                Update baseline
              </button>
            )}
            <button
              onClick={() => act("approve")}
              disabled={busy !== null}
              className={cn(btn, size, "border border-line bg-card text-ink-secondary hover:text-ink")}
            >
              {busy === "approve" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              Approve
            </button>
            {!compact && status === "NEW" && (
              <button
                onClick={() => act("review")}
                disabled={busy !== null}
                className={cn(btn, size, "border border-line bg-card text-ink-secondary hover:text-ink")}
              >
                {busy === "review" ? (
                  <Loader2 className="size-3.5 animate-spin" aria-hidden />
                ) : (
                  <Eye className="size-3.5" aria-hidden />
                )}
                Mark reviewed
              </button>
            )}
            <button
              onClick={() => act("ignore")}
              disabled={busy !== null}
              className={cn(btn, size, "border border-line bg-card text-ink-secondary hover:text-ink")}
            >
              {busy === "ignore" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
              Ignore
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-secondary">
              <CheckCircle2 className="size-4 text-success" aria-hidden />
              {status === "APPROVED"
                ? "Approved"
                : status === "RESOLVED"
                  ? "Resolved"
                  : "Ignored"}
            </span>
            <button
              onClick={() => act("reopen")}
              disabled={busy !== null}
              className={cn(btn, size, "border border-line bg-card text-ink-secondary hover:text-ink")}
            >
              {busy === "reopen" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <RotateCcw className="size-3.5" aria-hidden />
              )}
              Reopen
            </button>
          </div>
        )}
      </div>
      {error && (
        <p className="text-[13px] text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
