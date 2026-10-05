"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, Loader2, Puzzle } from "lucide-react";

type Phase = "waiting" | "linked" | "missing" | "failed";

/** How long to wait for the extension before assuming it isn't here. */
const WAIT_MS = 6000;

/**
 * The page half of the handoff. The extension's content script reads the
 * code from #mykavo-extension-handoff, has its background worker exchange
 * it, and reports back by setting data-mykavo-extension on <html> and
 * posting a window message (whichever this component sees first).
 */
export function ExtensionHandoff({
  code,
  state,
  host,
  needsSetup,
  nextHref,
}: {
  code: string | null;
  state: string | null;
  host: string;
  needsSetup: boolean;
  nextHref: string;
}) {
  const [phase, setPhase] = useState<Phase>(code ? "waiting" : "missing");

  useEffect(() => {
    if (!code) return;
    const read = () => {
      const v = document.documentElement.dataset.mykavoExtension;
      if (v === "linked") setPhase("linked");
      else if (v === "failed") setPhase("failed");
    };
    read();
    const onMessage = (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const data = event.data as { source?: string; type?: string; ok?: boolean } | null;
      if (data?.source !== "mykavo-extension" || data.type !== "handoff-result") return;
      setPhase(data.ok ? "linked" : "failed");
    };
    window.addEventListener("message", onMessage);
    const timer = window.setTimeout(() => setPhase((p) => (p === "waiting" ? "missing" : p)), WAIT_MS);
    return () => {
      window.removeEventListener("message", onMessage);
      window.clearTimeout(timer);
    };
  }, [code]);

  const title =
    phase === "waiting"
      ? "Linking the extension…"
      : needsSetup
        ? `${host} is ready`
        : `${host} is protected`;
  const body =
    phase === "waiting"
      ? "One moment - the MyKavo extension is finishing the connection."
      : needsSetup
        ? "Choose the pages to watch and MyKavo takes the first baseline straight away. It takes about a minute."
        : "MyKavo is monitoring it around the clock. The extension now shows its status whenever you visit.";

  return (
    <div className="text-center">
      {code && state && (
        <div id="mykavo-extension-handoff" data-code={code} data-state={state} hidden />
      )}
      <div
        className={`mx-auto mb-5 grid size-14 place-items-center rounded-full ${
          phase === "waiting" ? "bg-surface" : "bg-primary"
        } transition-colors duration-300`}
        aria-hidden
      >
        {phase === "waiting" ? (
          <Loader2 className="size-6 animate-spin text-ink-secondary motion-reduce:animate-none" />
        ) : (
          <Check className="size-7 text-ink" strokeWidth={2.5} />
        )}
      </div>
      <h1 className="text-xl font-semibold tracking-tight text-ink" aria-live="polite">
        {title}
      </h1>
      <p className="mx-auto mt-2 max-w-80 text-sm text-ink-secondary">{body}</p>

      {phase === "linked" && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-success-soft px-3 py-1 text-[12px] font-medium text-success-strong">
          <Puzzle className="size-3.5" aria-hidden /> Extension connected
        </p>
      )}
      {phase === "missing" && (
        <p className="mx-auto mt-4 max-w-80 rounded-field bg-surface px-3.5 py-2.5 text-[12.5px] text-ink-secondary">
          The website is in your MyKavo account. To see its status in Chrome, open the MyKavo extension on {host}{" "}
          and press Connect.
        </p>
      )}
      {phase === "failed" && (
        <p role="alert" className="mx-auto mt-4 max-w-80 rounded-field bg-warning-soft px-3.5 py-2.5 text-[12.5px] text-warning-strong">
          The extension couldn&apos;t finish linking. Your website is safe in MyKavo - open the extension and press
          Connect to try again.
        </p>
      )}

      <Link
        href={nextHref}
        aria-disabled={phase === "waiting"}
        className={`mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-[colors,opacity] hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
          phase === "waiting" ? "pointer-events-none opacity-50" : ""
        }`}
      >
        {needsSetup ? "Start monitoring" : "Open dashboard"} <ArrowRight className="size-4" aria-hidden />
      </Link>
    </div>
  );
}
