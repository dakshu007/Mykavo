"use client";

import { useEffect, useRef, useState } from "react";

export interface VideoJob {
  id: string;
  kind: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
}

export function isRunning(job: Pick<VideoJob, "status"> | null | undefined): boolean {
  return job?.status === "queued" || job?.status === "running";
}

/**
 * Polls one brand video job every 3 seconds while it runs and the tab is
 * visible; calls onDone once when it finishes (done or failed).
 */
export function useVideoJob(initial: VideoJob | null, onDone: (job: VideoJob) => void) {
  const [job, setJob] = useState<VideoJob | null>(initial);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });
  const running = isRunning(job);

  useEffect(() => {
    if (!running || !job) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/brand-video/jobs/${job.id}`, { cache: "no-store" });
          if (res.ok) {
            const next = (await res.json()) as VideoJob;
            if (stopped) return;
            setJob(next);
            if (next.status === "done" || next.status === "failed") {
              stopped = true;
              doneRef.current(next);
              return;
            }
          } else if (res.status === 404) {
            stopped = true;
            return;
          }
        } catch {
          // Network blip: try again next tick.
        }
      }
      timer = setTimeout(() => void tick(), 3000);
    };
    timer = setTimeout(() => void tick(), 1500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [running, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return { job, setJob, running };
}
