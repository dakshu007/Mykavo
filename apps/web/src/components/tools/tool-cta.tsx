"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, BellRing, Check, X } from "lucide-react";
import { GoogleIcon } from "@/components/brand/integration-icons";
import { track } from "@/lib/analytics";
import { displayHost, monitorableUrl, signupHref } from "@/lib/attribution/monitor-link";
import { fontDisplay } from "@/components/landing/style";
import { ToolAuditOffer } from "./tool-audit-offer";
import { BRAND_MARKS } from "@/components/brand/brand-marks";
import { WpPluginInstall } from "@/components/landing/wp-plugin-download";

/**
 * Product CTA block shown under free-tool results, tying the tool to
 * monitoring. v4 landing design: the ink band with a gold offset shadow.
 *
 * When the tool checked a page, the button names it ("Monitor example.com
 * free") and sign-up lands on Add website with that page filled in: the
 * person who just found a problem keeps their momentum instead of starting
 * over in an empty dashboard.
 */
/**
 * What the tool found that MyKavo would watch, so the pitch is about the
 * visitor's own page: "Google Analytics, Meta Pixel and 9 more on
 * example.com" and the exact alert they would get if one disappeared.
 */
export interface ToolCtaWatch {
  /** Short names of what was found, e.g. ["Google Analytics", "Stripe"]. */
  items: string[];
  /** The example alert, e.g. "Google Analytics stopped loading". */
  alert: string;
  /** Severity shown on the example alert. */
  severity?: "CRITICAL" | "HIGH" | "MEDIUM";
}

const SHOWN = 4;

export function ToolCta({
  heading,
  body,
  tool,
  url,
  watch,
  wordpress = false,
}: {
  heading: string;
  body: string;
  tool: string;
  /** The page the tool just checked, if any. */
  url?: string | null;
  watch?: ToolCtaWatch | null;
  /** The checked site runs WordPress: also offer the free plugin. */
  wordpress?: boolean;
}) {
  const page = monitorableUrl(url);
  const from = `tool:${tool}`.slice(0, 60);
  const onClick = (method: string) => () =>
    track("cta_clicked", { cta: "tool_results", tool, method, prefilled: Boolean(page), personalized: Boolean(watch?.items.length) });
  const boxRef = useRef<HTMLDivElement>(null);
  const belowFold = useBelowFold(boxRef);

  return (
    <>
    <ToolStickyBar show={belowFold} page={page} tool={tool} from={from} />
    <div
      ref={boxRef}
      className="rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]"
    >
      <h2 className={`${fontDisplay} text-2xl leading-tight text-[#F5F5F0] sm:text-3xl`}>{heading}</h2>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-[#9C9E93]">{body}</p>
      {watch && watch.items.length > 0 && (
        <div className="mx-auto mt-6 max-w-md text-left">
          <p className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.18em] text-[#9C9E93]">
            {page ? `What MyKavo would watch on ${displayHost(page)}` : "What MyKavo would watch"}
          </p>
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {watch.items.slice(0, SHOWN).map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 rounded-full border border-[#F5F5F0]/15 bg-[#F5F5F0]/[0.06] px-2.5 py-1 text-[12px] font-medium text-[#F5F5F0]"
              >
                <Check className="size-3 text-[#FFD400]" aria-hidden />
                {item}
              </li>
            ))}
            {watch.items.length > SHOWN && (
              <li className="inline-flex items-center rounded-full px-2 py-1 text-[12px] text-[#9C9E93]">
                +{watch.items.length - SHOWN} more
              </li>
            )}
          </ul>
          <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#F5F5F0]/15 bg-[#F5F5F0] p-3.5 text-[#151515] shadow-[3px_3px_0_#FFD400]">
            <span className="mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#151515] text-[#FFD400]">
              <BellRing className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2 text-[11px] text-[#6B6B60]">
                <span
                  className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-bold tracking-wider ${
                    (watch.severity ?? "HIGH") === "CRITICAL"
                      ? "bg-[#B42318] text-white"
                      : (watch.severity ?? "HIGH") === "HIGH"
                        ? "bg-[#E8590C] text-white"
                        : "bg-[#FFD400] text-[#151515]"
                  }`}
                >
                  {watch.severity ?? "HIGH"}
                </span>
                Example alert from MyKavo
              </p>
              <p className="mt-1 text-[13.5px] font-semibold leading-5">
                {watch.alert}
                {page ? ` on ${displayHost(page)}` : ""}
              </p>
              <p className="mt-0.5 text-[12px] text-[#6B6B60]">Emailed the morning it happens, with before and after.</p>
            </div>
          </div>
        </div>
      )}
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href={signupHref({ url: page, from, google: true })}
          onClick={onClick("google")}
          className="inline-flex h-12 max-w-full items-center gap-2.5 rounded-full bg-[#FFD400] px-6 text-[15px] font-semibold text-[#151515] shadow-[4px_4px_0_#F5F5F0] transition-all hover:-translate-y-0.5 hover:bg-[#ffe14d]"
        >
          <GoogleIcon className="size-[18px] shrink-0" />
          <span className="truncate">
            {page
              ? watch && watch.items.length > 0
                ? `Watch ${displayHost(page)} free`
                : `Monitor ${displayHost(page)} free`
              : "Start monitoring free"}
          </span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
        <Link
          href={signupHref({ url: page, from, google: false })}
          onClick={onClick("email")}
          className="text-[12.5px] text-[#9C9E93] underline underline-offset-4 hover:text-[#F5F5F0]"
        >
          or sign up with email
        </Link>
        <p className="text-[12px] text-[#9C9E93]">
          Free plan · No credit card · {page ? "Your page is filled in for you" : "Set up in about a minute"}
        </p>
      </div>
      {wordpress && (
        <div className="mx-auto mt-7 max-w-md rounded-xl border-2 border-[#151515] bg-[#FFF7CC] p-4 text-left text-[#151515] shadow-[3px_3px_0_#FFD400]">
          <p className="flex items-center gap-2 text-[14px] font-semibold">
            <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden focusable="false">
              <path d={BRAND_MARKS.wordpress.path} fill="#21759B" />
            </svg>
            {page ? `${displayHost(page)} runs WordPress` : "This site runs WordPress"}
          </p>
          <p className="mt-1.5 text-[13px] leading-5 text-[#3D3D38]">
            Add the free MyKavo plugin: every plugin, theme and core update is recorded and checked, with one-click
            rollback when an update breaks something.
          </p>
          <div className="mt-3.5">
            <WpPluginInstall placement={`tool:${tool}`} />
          </div>
        </div>
      )}
      {page && <ToolAuditOffer url={page} tool={tool} />}
    </div>
    </>
  );
}

/**
 * True while the element is still below the visible screen. The results of
 * most tools are long (tables of tags, links, scripts), so the CTA above sits
 * far down the page right when interest peaks: the first screen of results.
 * Once the visitor reaches the CTA, or scrolls past it, this turns false.
 */
function useBelowFold(ref: React.RefObject<HTMLElement | null>): boolean {
  const [below, setBelow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => setBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return below;
}

/**
 * The compact version of the CTA, pinned to the bottom of the screen while the
 * full one is still below: "Monitor example.com free" next to the results the
 * visitor is reading. Closable for the rest of the visit.
 */
function ToolStickyBar({ show, page, tool, from }: { show: boolean; page: string | null; tool: string; from: string }) {
  // Results (and so this bar) only ever render in the browser, after a check
  // runs, so reading storage on the first render cannot mismatch hydration.
  const [closed, setClosed] = useState(() => {
    try {
      return Boolean(window.sessionStorage.getItem("mk-tool-bar-closed"));
    } catch {
      return false; // Storage blocked: the bar can still be closed for this page.
    }
  });
  if (closed) return null;
  const host = page ? displayHost(page) : null;
  return (
    <div
      // Phones: full width at the bottom (the Chrome announcement sits higher
      // there). From sm up that announcement is pinned bottom-left, so the bar
      // anchors bottom-right and never covers it.
      className={`fixed inset-x-3 bottom-3 z-40 transition-all duration-300 motion-reduce:transition-none sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-[min(40rem,calc(100vw-26.5rem))] ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
      }`}
      aria-hidden={!show}
    >
      <div className="mx-auto flex max-w-2xl items-center gap-3 rounded-2xl border border-[#151515] bg-[#151515] py-2.5 pl-4 pr-2 text-left text-[#E9EBDF] shadow-[4px_4px_0_#FFD400]">
        <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-[#FFD400] text-[#151515] sm:grid">
          <BellRing className="size-4" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-5">
          <span className="font-semibold text-white">
            {host ? `Get an email when ${host} changes.` : "Get an email when your site changes."}
          </span>{" "}
          <span className="hidden text-[#9C9E93] xl:inline">Checked daily, free.</span>
        </p>
        <Link
          href={signupHref({ url: page, from: `${from}:bar`.slice(0, 60), google: true })}
          tabIndex={show ? 0 : -1}
          onClick={() => track("cta_clicked", { cta: "tool_sticky", tool, prefilled: Boolean(page) })}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-[#FFD400] px-4 text-[13px] font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
        >
          <GoogleIcon className="size-4 shrink-0" />
          {/* The site is already named in the message; phones get the short label. */}
          <span className="sm:hidden">{host ? "Monitor free" : "Start free"}</span>
          <span className="hidden max-w-[14rem] truncate sm:inline">{host ? `Monitor ${host}` : "Start free"}</span>
        </Link>
        <button
          type="button"
          tabIndex={show ? 0 : -1}
          onClick={() => {
            setClosed(true);
            try {
              window.sessionStorage.setItem("mk-tool-bar-closed", "1");
            } catch {
              // ignore
            }
          }}
          className="grid size-8 shrink-0 place-items-center rounded-full text-[#9C9E93] hover:bg-white/10 hover:text-white"
          aria-label="Close"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
