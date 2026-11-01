"use client";

import Link from "next/link";
import { ArrowRight, BellRing, Check } from "lucide-react";
import { GoogleIcon } from "@/components/brand/integration-icons";
import { track } from "@/lib/analytics";
import { displayHost, monitorableUrl, signupHref } from "@/lib/attribution/monitor-link";
import { fontDisplay } from "@/components/landing/style";

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
}: {
  heading: string;
  body: string;
  tool: string;
  /** The page the tool just checked, if any. */
  url?: string | null;
  watch?: ToolCtaWatch | null;
}) {
  const page = monitorableUrl(url);
  const from = `tool:${tool}`.slice(0, 60);
  const onClick = (method: string) => () =>
    track("cta_clicked", { cta: "tool_results", tool, method, prefilled: Boolean(page), personalized: Boolean(watch?.items.length) });

  return (
    <div className="rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
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
    </div>
  );
}
