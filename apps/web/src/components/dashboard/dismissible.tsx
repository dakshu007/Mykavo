"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";

/**
 * Wraps a dashboard card or bar with a close button. Closing it hides it now
 * and writes a cookie the dashboard layout reads, so it stays closed on the
 * next page load. The cookie holds `value` (an offer id, or a limit and its
 * period), so a different offer or a newly reached limit shows again.
 */
export function Dismissible({
  cookie,
  value,
  days,
  label,
  className,
  buttonClassName,
  children,
}: {
  cookie: string;
  value: string;
  days: number;
  label: string;
  className?: string;
  buttonClassName?: string;
  children: React.ReactNode;
}) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  function close() {
    document.cookie = `${cookie}=${encodeURIComponent(value)}; path=/; max-age=${days * 86_400}; samesite=lax`;
    track("dashboard_card_dismissed", { card: cookie, value });
    setHidden(true);
  }

  return (
    <div className={cn("relative", className)}>
      {children}
      <button
        type="button"
        onClick={close}
        aria-label={label}
        title={label}
        className={cn(
          "absolute right-2 top-2 inline-flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-ink/10 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
          buttonClassName,
        )}
      >
        <X className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
