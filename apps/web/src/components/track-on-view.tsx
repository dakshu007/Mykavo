"use client";

import { useEffect, useRef } from "react";
import { track, type AnalyticsEvent } from "@/lib/analytics";

/** Fires an analytics event once when the page mounts. */
export function TrackOnView({ event }: { event: AnalyticsEvent }) {
  const fired = useRef(false);
  useEffect(() => {
    if (fired.current) return;
    fired.current = true;
    track(event);
  }, [event]);
  return null;
}
