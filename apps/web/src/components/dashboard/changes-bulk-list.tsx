"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, Loader2, X } from "lucide-react";
import type { ChangeCategory, ChangeSeverity, ChangeStatus } from "@fluxen/database";
import { cn } from "@/lib/utils";
import {
  ChangeCategoryChip,
  ChangeSeverityBadge,
  ChangeStatusBadge,
} from "@/components/dashboard/change-badges";
import { ChangeActions } from "@/components/dashboard/change-actions";

/** Serializable row shape the server list page hands to this client layer. */
export interface ChangeListRow {
  id: string;
  title: string;
  severity: ChangeSeverity;
  category: ChangeCategory;
  status: ChangeStatus;
  /** Monospace location line, e.g. `example.com/pricing` or `example.com · Site-wide`. */
  location: string;
  canUpdateBaseline: boolean;
}

type BulkAction = "REVIEWED" | "APPROVED" | "IGNORED";

const BULK_LIMIT = 100;

/**
 * Selection layer over the changes list: checkbox per row, header select-all,
 * and a sticky action bar (mark reviewed / approve / ignore) once anything is
 * selected. Rows render exactly as the previous server list did — same badges,
 * links, and per-row actions.
 */
export function ChangesBulkList({ changes }: { changes: ChangeListRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [busy, setBusy] = useState<BulkAction | null>(null);
  const [error, setError] = useState("");

  // Ignore selections that no longer exist after a refresh re-renders the list.
  const listedIds = new Set(changes.map((c) => c.id));
  const selectedIds = [...selected].filter((id) => listedIds.has(id));
  const allSelected = changes.length > 0 && selectedIds.length === changes.length;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setError("");
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(changes.map((c) => c.id)));
    setError("");
  }

  async function bulk(action: BulkAction) {
    if (busy || selectedIds.length === 0) return;
    setBusy(action);
    setError("");
    try {
      const res = await fetch("/api/changes/bulk", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ids: selectedIds.slice(0, BULK_LIMIT), action }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Bulk action failed.");
      }
      setSelected(new Set());
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Bulk action failed.");
    } finally {
      setBusy(null);
    }
  }

  const barButton =
    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors disabled:opacity-60";

  return (
    <div>
      {/* Header select-all for the currently listed changes */}
      <div className="flex items-center gap-3 border-b border-line pb-2.5">
        <input
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = selectedIds.length > 0 && !allSelected;
          }}
          onChange={toggleAll}
          aria-label="Select all listed changes"
          className="size-4 shrink-0 accent-primary"
        />
        <span className="text-xs font-medium text-ink-secondary">
          {selectedIds.length > 0
            ? `${selectedIds.length} of ${changes.length} selected`
            : "Select all"}
        </span>
      </div>

      <ul className="divide-y divide-line">
        {changes.map((c) => {
          const isOpen = c.status === "NEW" || c.status === "REVIEWED";
          return (
            <li key={c.id} className="flex items-center gap-4 py-4">
              <input
                type="checkbox"
                checked={selected.has(c.id)}
                onChange={() => toggle(c.id)}
                aria-label={`Select change: ${c.title}`}
                className="size-4 shrink-0 accent-primary"
              />
              <ChangeSeverityBadge severity={c.severity} className="w-24 shrink-0 justify-center" />
              <Link href={`/dashboard/changes/${c.id}`} className="group min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink group-hover:text-primary">
                  {c.title}
                </p>
                <p className="truncate text-xs text-ink-faint">
                  <span className="font-mono">{c.location}</span>
                </p>
              </Link>
              <span className="hidden sm:block">
                <ChangeCategoryChip category={c.category} />
              </span>
              {isOpen ? (
                <ChangeActions
                  changeId={c.id}
                  status={c.status}
                  canUpdateBaseline={c.canUpdateBaseline}
                  layout="compact"
                />
              ) : (
                <ChangeStatusBadge status={c.status} />
              )}
            </li>
          );
        })}
      </ul>

      {/* Sticky bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-4 z-20 mt-4">
          <div className="flex flex-wrap items-center gap-2 rounded-full border border-line bg-card px-4 py-2.5 shadow-card">
            <span className="text-[13px] font-semibold text-ink">
              {selectedIds.length} selected
            </span>
            <span className="mx-0.5 text-line">|</span>
            <button
              onClick={() => bulk("REVIEWED")}
              disabled={busy !== null}
              className={cn(barButton, "border border-line bg-card text-ink-secondary hover:text-ink")}
            >
              {busy === "REVIEWED" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Eye className="size-3.5" aria-hidden />
              )}
              Mark reviewed
            </button>
            <button
              onClick={() => bulk("APPROVED")}
              disabled={busy !== null}
              className={cn(barButton, "bg-primary text-white hover:bg-primary-hover")}
            >
              {busy === "APPROVED" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <Check className="size-3.5" aria-hidden />
              )}
              Approve
            </button>
            <button
              onClick={() => bulk("IGNORED")}
              disabled={busy !== null}
              className={cn(barButton, "border border-line bg-card text-ink-secondary hover:text-ink")}
            >
              {busy === "IGNORED" ? (
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
              ) : (
                <X className="size-3.5" aria-hidden />
              )}
              Ignore
            </button>
            <button
              onClick={() => {
                setSelected(new Set());
                setError("");
              }}
              disabled={busy !== null}
              aria-label="Clear selection"
              title="Clear selection"
              className="ml-auto inline-flex size-8 items-center justify-center rounded-full text-ink-secondary transition-colors hover:bg-surface hover:text-ink disabled:opacity-60"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
          {error && (
            <p className="mt-2 text-[13px] text-red-700" role="alert">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
