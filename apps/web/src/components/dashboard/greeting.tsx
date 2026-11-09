"use client";

import { useSyncExternalStore } from "react";
import { greetingForHour, type Greeting as GreetingText } from "@/lib/greeting";

// The greeting only changes on hour boundaries; no subscription needed.
const subscribe = () => () => {};

/**
 * Renders the dashboard greeting. The server provides a geo-based guess (used
 * verbatim for the SSR snapshot, so most visitors never see a flash); the
 * client snapshot derives from the browser's own clock - the only source
 * that is always right for the person looking.
 */
export function Greeting({
  name,
  initialGreeting,
  className = "text-[17px] font-semibold tracking-tight text-ink",
}: {
  name: string;
  initialGreeting: GreetingText;
  className?: string;
}) {
  const greeting = useSyncExternalStore(
    subscribe,
    () => greetingForHour(new Date().getHours()),
    () => initialGreeting,
  );

  return (
    <span className={className}>
      {greeting}, {name}
    </span>
  );
}
