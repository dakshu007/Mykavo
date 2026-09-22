"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, CircleUser, Loader2, MailCheck, X } from "lucide-react";
import { requestedAgo, type AppAccessStatus } from "@mykavo/shared";
import { Card, CardHeader } from "@/components/ui/card";
import type { AppRequestRow, AppRequestsReport } from "@/lib/app-access";

/**
 * The operator's Android-app approval queue.
 *
 * Pending first: this is a to-do list, and a decided request is history.
 *
 * `emailSent` is shown rather than assumed. Approving is two steps - write
 * the decision, then send the mail - and they are deliberately not in one
 * transaction, so "approved but the email failed" is a real state. Without
 * this column the operator would have no way to notice, and the requester
 * would wait for a message that never comes. Clicking Approve again re-sends.
 */

const LABELS: Record<AppAccessStatus, string> = {
  PENDING: "Pending",
  APPROVED: "Approved",
  DECLINED: "Declined",
};

function StatusPill({ status }: { status: AppAccessStatus }) {
  const tone =
    status === "APPROVED"
      ? "bg-success-soft text-success-strong"
      : status === "DECLINED"
        ? "bg-surface text-ink-faint"
        : "bg-primary-soft text-accent";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${tone}`}>
      {LABELS[status]}
    </span>
  );
}

function Row({
  row,
  busy,
  onDecide,
}: {
  row: AppRequestRow;
  busy: boolean;
  onDecide: (action: "approve" | "decline") => void;
}) {
  return (
    <li className="flex flex-wrap items-center gap-3 py-3">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate text-[14px] font-medium text-ink">
          {row.name}
          <StatusPill status={row.status} />
          {/* Whether they already have an account changes how much scrutiny
              the request deserves: a customer asking for the app is not the
              same as a stranger filling in a form. */}
          {row.hasAccount && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-ink-faint"
              title="Has a MyKavo account with this address"
            >
              <CircleUser className="size-3.5" aria-hidden /> account
            </span>
          )}
          {row.status === "APPROVED" && row.emailSent && (
            <span
              className="inline-flex items-center gap-1 text-[11px] text-success-strong"
              title="Approval email was accepted by the provider"
            >
              <MailCheck className="size-3.5" aria-hidden /> emailed
            </span>
          )}
          {row.status === "APPROVED" && !row.emailSent && (
            <span className="text-[11px] font-semibold text-critical">
              email failed - approve again to retry
            </span>
          )}
        </p>
        <p className="truncate font-mono text-[12px] text-ink-secondary">{row.email}</p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-[12px] text-ink-secondary">{requestedAgo(row.requestedAt)}</p>
        <p className="text-[11.5px] text-ink-faint">
          {row.downloadCount === 0
            ? "no downloads"
            : `${row.downloadCount} download${row.downloadCount === 1 ? "" : "s"}`}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {busy ? (
          <Loader2 className="size-4 animate-spin text-ink-faint" aria-hidden />
        ) : (
          <>
            {row.status !== "APPROVED" && (
              <button
                onClick={() => onDecide("approve")}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-primary px-3.5 text-[12.5px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                <Check className="size-3.5" aria-hidden /> Approve
              </button>
            )}
            {row.status === "APPROVED" && (
              <button
                onClick={() => onDecide("approve")}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] font-medium text-ink-secondary transition-colors hover:text-ink"
                title="Re-send the approval email"
              >
                <MailCheck className="size-3.5" aria-hidden /> Re-send
              </button>
            )}
            {row.status !== "DECLINED" && (
              <button
                onClick={() => onDecide("decline")}
                className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface px-3.5 text-[12.5px] font-medium text-ink-secondary transition-colors hover:bg-critical-soft hover:text-critical-strong"
              >
                <X className="size-3.5" aria-hidden /> Decline
              </button>
            )}
          </>
        )}
      </div>
    </li>
  );
}

export function AppRequestsTable({ report }: { report: AppRequestsReport }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function decide(row: AppRequestRow, action: "approve" | "decline") {
    setBusyId(row.id);
    setError("");
    try {
      const res = await fetch(`/api/app-access/${encodeURIComponent(row.id)}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { error?: string; emailSent?: boolean };
      if (!res.ok) {
        setError(body.error ?? "Could not save that decision.");
        return;
      }
      if (action === "approve" && body.emailSent === false) {
        setError(
          `Approved ${row.email}, but the email did not send. Press Approve again to retry.`,
        );
      }
      // Re-read rather than patching local state: the server owns decidedAt
      // and whether the email actually went out.
      router.refresh();
    } catch {
      setError("Could not reach the server. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Android app requests"
        action={
          <span className="text-[12px] text-ink-secondary">
            {report.pending} pending · {report.approved} approved · {report.total} total
          </span>
        }
      />

      {error && (
        <p className="mb-3 text-[13px] text-critical-strong" role="alert">
          {error}
        </p>
      )}

      {report.error ? (
        <p className="py-3 text-[13px] text-critical">
          Could not read the request list: {report.error}
        </p>
      ) : report.rows.length === 0 ? (
        <p className="py-3 text-[13px] text-ink-secondary">
          Nobody has requested the app yet. The button lives in the Android section of the
          homepage.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {report.rows.map((row) => (
            <Row
              key={row.id}
              row={row}
              busy={busyId === row.id}
              onDecide={(action) => void decide(row, action)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
