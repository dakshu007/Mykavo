"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
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
export function ToolCta({
  heading,
  body,
  tool,
  url,
}: {
  heading: string;
  body: string;
  tool: string;
  /** The page the tool just checked, if any. */
  url?: string | null;
}) {
  const page = monitorableUrl(url);
  const from = `tool:${tool}`.slice(0, 60);
  const onClick = (method: string) => () =>
    track("cta_clicked", { cta: "tool_results", tool, method, prefilled: Boolean(page) });

  return (
    <div className="rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <h2 className={`${fontDisplay} text-2xl leading-tight text-[#F5F5F0] sm:text-3xl`}>{heading}</h2>
      <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-[#9C9E93]">{body}</p>
      <div className="mt-6 flex flex-col items-center gap-3">
        <Link
          href={signupHref({ url: page, from, google: true })}
          onClick={onClick("google")}
          className="inline-flex h-12 max-w-full items-center gap-2.5 rounded-full bg-[#FFD400] px-6 text-[15px] font-semibold text-[#151515] shadow-[4px_4px_0_#F5F5F0] transition-all hover:-translate-y-0.5 hover:bg-[#ffe14d]"
        >
          <GoogleIcon className="size-[18px] shrink-0" />
          <span className="truncate">{page ? `Monitor ${displayHost(page)} free` : "Start monitoring free"}</span>
          <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
        <Link
          href={signupHref({ url: page, from, google: false })}
          onClick={onClick("email")}
          className="text-[12.5px] text-[#9C9E93] underline underline-offset-4 hover:text-[#F5F5F0]"
        >
          or sign up with email
        </Link>
        <p className="text-[12px] text-[#9C9E93]">Free plan · No credit card · Set up in about a minute</p>
      </div>
    </div>
  );
}
