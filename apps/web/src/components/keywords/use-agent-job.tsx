"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AI_JOB_STARTED_EVENT } from "@/components/keywords/ai-job-watcher";
import { KavoProgress } from "./kavo-runner";

export interface JobState {
  id: string;
  status: string;
  step: string | null;
  progress: number;
  error: string | null;
  resultId?: string | null;
}

/**
 * Polls one AI job's tiny status row every 4 seconds while it runs and the
 * tab is visible, and calls `onDone` once when it finishes. Stops on done,
 * failed, or an error answer.
 */
export function useAgentJob(initial: JobState | null, onDone: (job: JobState) => void) {
  const [job, setJob] = useState<JobState | null>(initial);
  const doneRef = useRef(onDone);
  useEffect(() => {
    doneRef.current = onDone;
  });

  const running = job !== null && (job.status === "queued" || job.status === "running");

  useEffect(() => {
    if (!running || !job) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "visible") {
        try {
          const res = await fetch(`/api/keywords/jobs/${job.id}`, { cache: "no-store" });
          if (!res.ok) {
            stopped = true;
            return;
          }
          const next = (await res.json()) as Omit<JobState, "id">;
          if (stopped) return;
          setJob({ id: job.id, ...next });
          if (next.status === "done" || next.status === "failed") {
            stopped = true;
            doneRef.current({ id: job.id, ...next });
            return;
          }
        } catch {
          // Network blip: try again next tick.
        }
      }
      timer = setTimeout(() => void tick(), 4000);
    };
    timer = setTimeout(() => void tick(), 2500);
    return () => {
      stopped = true;
      if (timer) clearTimeout(timer);
    };
  }, [running, job?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = useCallback(async (websiteId: string, body: Record<string, unknown>): Promise<string | null> => {
    try {
      const res = await fetch(`/api/keywords/${websiteId}/jobs`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) return data.error ?? "Could not start. Please try again.";
      setJob({ id: data.jobId, status: "queued", step: "Waiting to start", progress: 0, error: null });
      // The dashboard-wide watcher starts following it, so leaving this page
      // still ends in a "your post is ready" alert (ai-job-watcher.tsx).
      window.dispatchEvent(new Event(AI_JOB_STARTED_EVENT));
      return null;
    } catch {
      return "Could not reach MyKavo. Check your connection and try again.";
    }
  }, []);

  return { job, running, start, setJob };
}

/** The AI loader: the Kavo runner (kavo-runner.tsx). */
export function JobProgress({ job }: { job: JobState }) {
  return <KavoProgress step={job.step} progress={job.progress} />;
}
