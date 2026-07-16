"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BellOff, Loader2 } from "lucide-react";

/**
 * Maintenance windows (spec §25): mute a website's alerts for a fixed
 * duration. Change events and health incidents are still recorded while
 * muted - the worker just skips sending emails and channel messages.
 */

type MuteHours = 1 | 8 | 24;

const DURATIONS: Array<{ hours: MuteHours; label: string }> = [
  { hours: 1, label: "1 hour" },
  { hours: 8, label: "8 hours" },
  { hours: 24, label: "24 hours" },
];

function formatUntil(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function useMutePatch(websiteId: string) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function patch(muteHours: MuteHours | null) {
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ muteHours }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError("Could not update alert muting. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return { patch, busy, error };
}

/** Amber banner shown on the website detail page while alerts are muted. */
export function MutedAlertsBanner({
  websiteId,
  mutedUntilIso,
}: {
  websiteId: string;
  mutedUntilIso: string;
}) {
  const { patch, busy, error } = useMutePatch(websiteId);

  return (
    <div
      role="status"
      className="flex flex-wrap items-center justify-between gap-3 rounded-card bg-warning-soft px-5 py-3.5"
    >
      <p className="flex items-center gap-2 text-sm font-medium text-warning-strong">
        <BellOff className="size-4 shrink-0" aria-hidden />
        <span suppressHydrationWarning>
          Alerts muted until {formatUntil(mutedUntilIso)} · alerts still recorded, just
          not sent
        </span>
      </p>
      <div className="flex items-center gap-3">
        {error && <span className="text-sm text-critical-strong">{error}</span>}
        <button
          onClick={() => patch(null)}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-1.5 text-[13px] font-medium text-warning-strong shadow-card transition-colors hover:text-ink disabled:opacity-60"
        >
          {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
          Unmute
        </button>
      </div>
    </div>
  );
}

/** Settings control: mute for 1/8/24 hours, or unmute. */
export function MuteAlertsControl({
  websiteId,
  mutedUntilIso,
}: {
  websiteId: string;
  mutedUntilIso: string | null;
}) {
  const { patch, busy, error } = useMutePatch(websiteId);

  return (
    <div>
      <p className="text-sm text-ink-secondary">
        Pause email and channel alerts during planned maintenance. Changes and
        incidents are still recorded - nothing gets sent until the window ends.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {DURATIONS.map((d) => (
          <button
            key={d.hours}
            onClick={() => patch(d.hours)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-card px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
          >
            <BellOff className="size-3.5" aria-hidden />
            {d.label}
          </button>
        ))}
        {mutedUntilIso && (
          <button
            onClick={() => patch(null)}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : null}
            Unmute
          </button>
        )}
      </div>
      {mutedUntilIso && (
        <p className="mt-2 text-[13px] font-medium text-warning-strong" suppressHydrationWarning>
          Muted until {formatUntil(mutedUntilIso)}
        </p>
      )}
      {error && (
        <p className="mt-2 text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
