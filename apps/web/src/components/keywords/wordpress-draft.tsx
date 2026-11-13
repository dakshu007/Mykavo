"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Loader2, RefreshCw, Send, TriangleAlert } from "lucide-react";
import { BRAND_MARKS } from "@/components/brand/brand-marks";
import type { WpDraftView, WpSiteLink } from "@/lib/integrations/wp-drafts";
import { cn } from "@/lib/utils";

/**
 * "Save as draft in WordPress": sends a post to the site's MyKavo plugin,
 * then follows it until WordPress has it. The plugin collects queued drafts
 * when someone opens WP Admin and every 15 minutes, so while one is on its
 * way this polls a tiny status row every 10 seconds (tab visible only).
 */

const POLL_MS = 10_000;

export function WordPressMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden focusable="false">
      <path d={BRAND_MARKS.wordpress.path} fill="#21759B" />
    </svg>
  );
}

function useWpDraft(postId: string, initial: WpDraftView | null) {
  const [draft, setDraft] = useState<WpDraftView | null>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queued = draft?.status === "queued";
  useEffect(() => {
    if (!queued) return;
    let stopped = false;
    const timer = window.setInterval(async () => {
      if (stopped || document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/keywords/posts/${postId}/wordpress`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { draft: WpDraftView | null };
        if (!stopped && data.draft) setDraft(data.draft);
      } catch {
        // Offline for a moment: the next tick tries again.
      }
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [queued, postId]);

  async function send() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/keywords/posts/${postId}/wordpress`, { method: "POST" });
      const data = (await res.json()) as { draft?: WpDraftView; error?: string };
      if (!res.ok || !data.draft) setError(data.error ?? "Could not send it. Please try again.");
      else setDraft(data.draft);
    } catch {
      setError("Could not reach MyKavo. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return { draft, busy, error, send };
}

const outline =
  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border-[1.5px] border-ink/80 px-3 text-[12.5px] font-semibold text-ink transition-colors hover:bg-primary hover:text-primary-contrast focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-50";

/** One post in a list: a compact button, or where it stands in WordPress. */
export function WpDraftRowControl({ postId, initial }: { postId: string; initial: WpDraftView | null }) {
  const { draft, busy, error, send } = useWpDraft(postId, initial);

  if (draft?.status === "queued") {
    return (
      <span role="status" className="inline-flex items-center gap-1.5 text-[12.5px] text-ink-secondary">
        <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden /> On its way to WordPress
      </span>
    );
  }
  if (draft?.status === "delivered" && !draft.outdated) {
    return (
      <span className="inline-flex items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11.5px] font-semibold text-success-strong">
          <Check className="size-3" aria-hidden /> Draft in WordPress
        </span>
        {draft.editUrl && (
          <a href={draft.editUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[12.5px] font-medium text-accent hover:underline">
            Open <ArrowUpRight className="size-3" aria-hidden />
          </a>
        )}
      </span>
    );
  }
  return (
    <span className="inline-flex flex-col items-end gap-1">
      <button type="button" className={outline} onClick={() => void send()} disabled={busy}>
        {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : draft ? <RefreshCw className="size-3.5" aria-hidden /> : <WordPressMark className="size-3.5" />}
        {busy ? "Sending…" : draft?.status === "failed" ? "Try again" : draft?.outdated ? "Send latest" : "Save to WP Admin"}
      </button>
      {(error ?? (draft?.status === "failed" ? draft.error : null)) && (
        <span role="alert" className="max-w-[240px] text-right text-[11.5px] leading-4 text-critical-strong">
          {error ?? draft?.error}
        </span>
      )}
    </span>
  );
}

/** The editor's WordPress card: send, follow, open the draft. */
export function WpDraftPanel({
  postId,
  link,
  initial,
  dirty,
  savedVersion,
}: {
  postId: string;
  link: WpSiteLink | null;
  initial: WpDraftView | null;
  /** Unsaved edits: WordPress gets the post as last saved, so save first. */
  dirty: boolean;
  /** The editor's last saved version: a save after sending makes WordPress's copy old. */
  savedVersion: number;
}) {
  const state = useWpDraft(postId, initial);
  const { busy, error, send } = state;
  const draft = state.draft && state.draft.status !== "queued" && savedVersion > state.draft.postVersion
    ? { ...state.draft, outdated: true }
    : state.draft;

  if (!link) {
    return (
      <div className="rounded-2xl border border-line bg-card p-4">
        <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
          <WordPressMark className="size-4" /> Using WordPress?
        </h2>
        <p className="mt-1.5 text-[12.5px] leading-5 text-ink-secondary">
          Connect the free MyKavo plugin and save posts straight to your WordPress drafts, ready to review and publish.
        </p>
        <a href="/dashboard/wordpress" className="mt-2.5 inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
          Connect WordPress <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </div>
    );
  }

  const host = link.siteUrl.replace(/^https?:\/\//, "");
  return (
    <div className="rounded-2xl border-[1.5px] border-ink bg-card p-4 shadow-[4px_4px_0_var(--color-primary)]">
      <h2 className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <WordPressMark className="size-4" /> Save to WordPress
      </h2>
      <p className="mt-1 truncate font-mono text-[11px] text-ink-faint" title={link.siteUrl}>
        {host}
      </p>

      {!link.supportsDrafts ? (
        <p className="mt-2.5 text-[12.5px] leading-5 text-ink-secondary">
          Update the MyKavo plugin on your site to save drafts here.{" "}
          <a href={`${link.siteUrl}/wp-admin/plugins.php`} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
            Open Plugins
          </a>
        </p>
      ) : draft?.status === "queued" ? (
        <div role="status" className="mt-2.5 rounded-xl bg-primary-soft px-3 py-2.5">
          <p className="flex items-center gap-1.5 text-[13px] font-semibold text-ink">
            <Loader2 className="size-3.5 animate-spin text-accent" aria-hidden /> On its way to WordPress
          </p>
          <p className="mt-1 text-[12px] leading-5 text-ink-secondary">
            Your site didn&apos;t pick it up straight away. It lands as a draft the next time WP Admin opens, or within 15
            minutes.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <a href={link.draftsUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline">
              Open WP Admin now <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy}
              className="inline-flex items-center gap-1 text-[12.5px] font-semibold text-ink-secondary hover:text-ink disabled:opacity-60"
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
              {busy ? "Sending…" : "Send again now"}
            </button>
          </div>
        </div>
      ) : (
        <>
          {draft?.status === "delivered" && (
            <div className="mt-2.5 rounded-xl bg-success-soft px-3 py-2.5">
              <p className="flex items-center gap-1.5 text-[13px] font-semibold text-success-strong">
                <Check className="size-3.5" aria-hidden /> Saved as a draft in WordPress
              </p>
              {draft.outdated && (
                <p className="mt-1 text-[12px] leading-5 text-ink-secondary">You edited it since. Send the latest version to update that draft.</p>
              )}
            </div>
          )}
          {draft?.status === "delivered" && (
            <a
              href={draft.editUrl ?? link.draftsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold",
                draft.outdated
                  ? "border border-line text-ink hover:bg-ink/5"
                  : "bg-primary text-primary-contrast hover:bg-primary-hover",
              )}
            >
              <WordPressMark className="size-4" /> Open draft in WP Admin <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
          )}
          {draft?.status === "failed" && (
            <p role="alert" className="mt-2.5 flex items-start gap-1.5 text-[12.5px] leading-5 text-critical-strong">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden />
              WordPress didn&apos;t save it: {draft.error ?? "unknown error"}
            </p>
          )}
          {(!draft || draft.status === "failed" || draft.outdated) && (
            <button
              type="button"
              onClick={() => void send()}
              disabled={busy || dirty}
              className={cn(
                "mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60",
              )}
            >
              {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
              {busy ? "Sending to WordPress…" : draft?.status === "failed" ? "Try again" : draft?.outdated ? "Send the latest version" : "Save as draft in WordPress"}
            </button>
          )}
          {dirty && (!draft || draft.status === "failed" || draft.outdated) && (
            <p className="mt-1.5 text-[11.5px] text-ink-faint">Save your changes first: WordPress gets the post as last saved.</p>
          )}
          {!draft && (
            <p className="mt-2 text-[11.5px] leading-4 text-ink-faint">It never publishes: you review and publish it in WordPress.</p>
          )}
        </>
      )}
      {error && (
        <p role="alert" className="mt-2 text-[12px] text-critical-strong">
          {error}
        </p>
      )}
    </div>
  );
}
