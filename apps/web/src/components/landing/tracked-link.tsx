"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track, type AnalyticsEvent, type EventProps } from "@/lib/analytics";

/**
 * A next/link that also reports the click. Everything else is exactly a
 * next/link - same href, same navigation, same prefetching - so wrapping an
 * existing link changes nothing for the visitor.
 *
 * track() sends the event to Google Analytics from the browser (and to
 * Plausible if it is ever switched on). It does not call MyKavo's servers or
 * touch the database, so a click costs nothing on the backend.
 */
export function TrackedLink({
  event,
  eventProps,
  onClick,
  ...rest
}: ComponentProps<typeof Link> & { event: AnalyticsEvent; eventProps?: EventProps }) {
  return (
    <Link
      {...rest}
      onClick={(e) => {
        track(event, eventProps);
        onClick?.(e);
      }}
    />
  );
}
