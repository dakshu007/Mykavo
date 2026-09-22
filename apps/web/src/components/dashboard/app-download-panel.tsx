"use client";

import { useEffect, useRef, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";

/**
 * The approved user's download panel.
 *
 * AUTO-START. The approval email links here with ?download=1, and the promise
 * made there is that the download begins on its own. That is done by setting
 * window.location to the download route once, after mount - not with an
 * <a download> click simulation, which browsers increasingly block, and not
 * with a fetch, which would buffer ~60MB in memory before the browser ever
 * offered to save it.
 *
 * A navigation to a 302 that lands on a file does not replace the page: the
 * browser starts the download and leaves this panel on screen. So the user
 * sees where the app lives from now on, rather than a blank tab.
 *
 * The button stays regardless, because auto-start is not guaranteed - a
 * pop-up blocker, a slow first paint, or arriving here without the flag all
 * end with somebody who still needs something to press.
 */
export function AppDownloadPanel({ autoStart }: { autoStart: boolean }) {
  const started = useRef(false);
  const [triggered, setTriggered] = useState(false);

  useEffect(() => {
    // Guarded by a ref, not just state: React 18 mounts effects twice in
    // development, and starting the download twice would double the count and
    // give the browser two files.
    if (!autoStart || started.current) return;
    started.current = true;
    setTriggered(true);
    window.location.href = "/api/app-access/download";
  }, [autoStart]);

  return (
    <Card>
      <div className="flex items-start gap-4">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
          <Smartphone className="size-6 text-accent" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-[17px] font-semibold text-ink">MyKavo for Android</h2>
          <p className="mt-1 text-[13.5px] leading-6 text-ink-secondary">
            {triggered
              ? "Your download is starting. If nothing happened, use the button below."
              : "Approved for your account. Install it and every website you monitor is on your phone, with push alerts when something changes."}
          </p>

          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a
              real navigation, not a route change: this endpoint 302s to a
              binary, and next/link would soft-navigate and never hand the
              browser a file to save. */}
          <a
            href="/api/app-access/download"
            className="mt-4 inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            <Download className="size-4" aria-hidden />
            Download the APK
          </a>

          <p className="mt-4 text-[12.5px] leading-5.5 text-ink-faint">
            Android will warn you about installing outside the Play Store — that is expected
            while MyKavo is in review. Open the downloaded file and allow the install when
            prompted. Sign in with this same account and your workspaces appear straight
            away.
          </p>
        </div>
      </div>
    </Card>
  );
}
