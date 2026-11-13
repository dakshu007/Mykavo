"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CircleAlert, FileText, Sparkles, X } from "lucide-react";
import { track } from "@/lib/analytics";

/**
 * Says "your blog post is ready" wherever the person is in the dashboard.
 *
 * Mounted once in the dashboard layout, so it survives page changes. It asks
 * /api/keywords/jobs/active which post and report jobs are running, checks on
 * every page change and when the tab comes back, and polls only while a job
 * it knows about is still running. When one finishes it shows a toast with a
 * link to the post. On the website's own AI Keywords page it stays quiet:
 * that page already shows the progress and opens the post itself.
 */

interface WatchedJob {
  id: string;
  kind: string;
  status: string;
  websiteId: string;
  websiteName: string;
  resultId: string | null;
  keyword: string | null;
  error: string | null;
}

interface Toast {
  id: string;
  ok: boolean;
  title: string;
  body: string;
  href: string;
  action: string;
}

/** Other components can say "I just started a job" so polling starts at once. */
export const AI_JOB_STARTED_EVENT = "mk:ai-job-started";

const POLL_MS = 8_000;
const STORE_KEY = "mk_ai_jobs";

function readStored(): string[] {
  try {
    const raw = window.sessionStorage.getItem(STORE_KEY);
    const ids: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string").slice(0, 10) : [];
  } catch {
    return [];
  }
}

function writeStored(ids: string[]) {
  try {
    window.sessionStorage.setItem(STORE_KEY, JSON.stringify(ids));
  } catch {
    // Private mode or blocked storage: the next page change finds them again.
  }
}

function toastFor(job: WatchedJob): Toast {
  const ok = job.status === "done";
  const post = job.kind === "write";
  const what = job.keyword ? `"${job.keyword}"` : post ? "Your post" : "Your keyword report";
  return {
    id: job.id,
    ok,
    title: ok
      ? post
        ? "Your blog post is ready"
        : "Your keyword report is ready"
      : post
        ? "Your blog post couldn't be written"
        : "Your keyword report didn't finish",
    body: ok
      ? post
        ? `${what} for ${job.websiteName} is written. Review it, then copy it into your site.`
        : `New keywords for ${job.websiteName}, ranked by what to write first.`
      : `${job.error ?? "Something went wrong."} Your allowance was given back.`,
    href:
      ok && post && job.resultId
        ? `/dashboard/keywords/${job.websiteId}/posts/${job.resultId}`
        : `/dashboard/keywords/${job.websiteId}${post ? "#posts" : "#report"}`,
    action: ok ? (post ? "Open post" : "See keywords") : "Open AI Keywords",
  };
}

export function AiJobWatcher() {
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  const tracked = useRef<Set<string>>(new Set());
  const timer = useRef<number | null>(null);
  const inFlight = useRef(false);
  const baseTitle = useRef<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    pathRef.current = pathname;
  }, [pathname]);

  // Kept in a ref: it reschedules itself, which a memoised callback can't.
  const checkRef = useRef<() => Promise<void>>(async () => {});
  async function check() {
    if (inFlight.current) return;
    inFlight.current = true;
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
    try {
      const ids = [...tracked.current].join(",");
      const res = await fetch(`/api/keywords/jobs/active${ids ? `?ids=${encodeURIComponent(ids)}` : ""}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { active: WatchedJob[]; finished: WatchedJob[] };
      const next = new Set(data.active.map((j) => j.id));
      const fresh: Toast[] = [];
      for (const job of data.finished) {
        if (!tracked.current.has(job.id)) continue;
        // The website's own page shows this already and opens the post.
        if (pathRef.current.startsWith(`/dashboard/keywords/${job.websiteId}`)) continue;
        fresh.push(toastFor(job));
      }
      tracked.current = next;
      writeStored([...next]);
      if (fresh.length) {
        setToasts((current) => [...fresh, ...current.filter((t) => !fresh.some((f) => f.id === t.id))].slice(0, 3));
        if (document.hidden) {
          baseTitle.current ??= document.title;
          document.title = `(${fresh.length}) ${fresh[0]!.ok ? "Ready" : "Needs a look"} · ${baseTitle.current}`;
        }
      }
    } catch {
      // Offline for a moment: try again on the next tick or page change.
    } finally {
      inFlight.current = false;
      if (tracked.current.size > 0) timer.current = window.setTimeout(() => void checkRef.current(), POLL_MS);
    }
  }

  useEffect(() => {
    checkRef.current = check;
  });

  // On mount and on every page change.
  useEffect(() => {
    if (tracked.current.size === 0) for (const id of readStored()) tracked.current.add(id);
    void checkRef.current();
  }, [pathname]);

  useEffect(() => {
    const onStarted = () => void checkRef.current();
    const onVisible = () => {
      if (document.hidden) return;
      if (baseTitle.current !== null) {
        document.title = baseTitle.current;
        baseTitle.current = null;
      }
      void checkRef.current();
    };
    window.addEventListener(AI_JOB_STARTED_EVENT, onStarted);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener(AI_JOB_STARTED_EVENT, onStarted);
      document.removeEventListener("visibilitychange", onVisible);
      if (timer.current !== null) window.clearTimeout(timer.current);
    };
  }, []);

  const close = (id: string) => setToasts((current) => current.filter((t) => t.id !== id));

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-3 bottom-3 z-[70] flex flex-col items-end gap-2 sm:inset-x-auto sm:bottom-5 sm:right-5"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className="mk-toast-in pointer-events-auto w-full max-w-[360px] rounded-xl border border-line bg-card p-3.5 shadow-[0_12px_40px_rgb(0_0_0/0.28)]"
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg ${t.ok ? "bg-primary-soft text-accent" : "bg-critical/10 text-critical"}`}
              aria-hidden
            >
              {t.ok ? t.href.includes("/posts/") ? <FileText className="size-4" /> : <Sparkles className="size-4" /> : <CircleAlert className="size-4" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="pr-5 text-[13.5px] font-semibold text-ink">{t.title}</p>
              <p className="mt-0.5 text-[12.5px] leading-snug text-ink-secondary">{t.body}</p>
              <Link
                href={t.href}
                onClick={() => {
                  track("ai_post_ready_toast_clicked", { ok: t.ok });
                  close(t.id);
                }}
                className="mt-2.5 inline-flex h-8 items-center rounded-full bg-primary px-3.5 text-[12.5px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
              >
                {t.action}
              </Link>
            </div>
            <button
              type="button"
              onClick={() => close(t.id)}
              aria-label="Dismiss"
              className="-mr-1 -mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/10 hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
