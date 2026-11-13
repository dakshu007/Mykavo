"use client";

import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import { AiWriterIcon } from "@/components/brand/ai-writer-icon";
import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { fontDisplay } from "@/components/landing/style";
import { track } from "@/lib/analytics";

/**
 * The AI Keywords & Blog Writer pitch, for posts about keywords and blogging
 * (lib/content-topic.ts). Someone reading how to find keywords or write a
 * post is exactly who it is for, so it replaces the monitoring pitch there.
 * Every point is true on the Free plan; the allowance comes from the agent's
 * own limits.
 */
const FREE = AGENT_LIMITS.free;
const POINTS = [
  "Reads your website and learns what you sell",
  "Finds keywords from Google suggestions and today's results",
  "Writes the full post: title, meta, article, FAQ and schema",
  "Stays a draft you edit, never published without you",
];

export function AiWriterCta({
  placement,
  heading = "Know what to write next. Then get it written.",
  body = "MyKavo's AI Keywords & Blog Writer finds the searches your website can win and writes the SEO post for each one, ready to edit.",
  className = "",
}: {
  /** Where it is shown, for click counts (e.g. "blog:overview"). */
  placement: string;
  heading?: string;
  body?: string;
  className?: string;
}) {
  return (
    <section aria-label="MyKavo AI Keywords & Blog Writer" className={className}>
      <div className="relative overflow-hidden rounded-2xl border-2 border-[#151515] bg-[#FFF7CC] p-6 text-[#151515] shadow-[6px_6px_0_#151515] sm:p-8">
        <div className="flex items-start gap-4">
          <span className="hidden size-12 shrink-0 place-items-center rounded-xl border-2 border-[#151515] bg-[#FFD400] sm:grid">
            <AiWriterIcon className="size-6" />
          </span>
          <div className="min-w-0">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#6B6B60]">
              AI Keywords &amp; Blog Writer
            </p>
            {/* "!" so page prose rules cannot restyle the heading or list. */}
            <h2 className={`${fontDisplay} mt-1.5! text-[22px]! leading-tight! font-medium! text-[#151515]! sm:text-[26px]!`}>
              {heading}
            </h2>
            <p className="mt-2 max-w-2xl text-[14.5px] leading-6 text-[#3D3D38]">{body}</p>
          </div>
        </div>
        <ul className="mt-5 grid list-none! gap-2.5 pl-0! sm:grid-cols-2 *:my-0!">
          {POINTS.map((point) => (
            <li key={point} className="flex items-start gap-2.5 text-[14px] leading-5">
              <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5 ring-1 ring-[#151515]" aria-hidden />
              {point}
            </li>
          ))}
        </ul>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/signup"
            onClick={() => track("cta_clicked", { cta: "ai_writer_signup", placement })}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-[#151515] bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] no-underline! shadow-[3px_3px_0_#151515] transition-transform hover:-translate-y-0.5"
          >
            Try it free
            <ArrowRight className="size-4" aria-hidden />
          </Link>
          <Link
            href="/ai-blog-writer"
            onClick={() => track("cta_clicked", { cta: "ai_writer_page", placement })}
            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#151515]/25 bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] no-underline! transition-colors hover:border-[#151515]"
          >
            See how it works
          </Link>
        </div>
        <p className="mt-4 text-[12.5px] text-[#6B6B60]">
          Free plan: {FREE.reports} keyword report and {FREE.posts} blog post a month. No card needed.
        </p>
      </div>
    </section>
  );
}

/** The short version for the sticky sidebar rail. */
export function AiWriterRailCta() {
  return (
    <div className="rounded-card border-2 border-[#151515] bg-white p-5 text-[#151515] shadow-[5px_5px_0_#FFD400]">
      <p className="flex items-center gap-1.5 text-[15px] font-semibold leading-snug">
        <AiWriterIcon className="size-4" />
        Know what to write next
      </p>
      <p className="mt-1.5 text-[13px] leading-5 text-[#6B6B60]">
        MyKavo finds the keywords your site can win and writes the post for each one.
      </p>
      <Link
        href="/signup"
        onClick={() => track("cta_clicked", { cta: "ai_writer_signup", placement: "blog:rail" })}
        className="mt-4 flex h-10 w-full items-center justify-center gap-1.5 rounded-full border-2 border-[#151515] bg-[#FFD400] text-[13.5px] font-semibold text-[#151515] transition-transform hover:-translate-y-0.5"
      >
        Try it free <ArrowRight className="size-4" aria-hidden />
      </Link>
      <Link
        href="/ai-blog-writer"
        onClick={() => track("cta_clicked", { cta: "ai_writer_page", placement: "blog:rail" })}
        className="mt-2.5 block text-center text-[12.5px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]"
      >
        See how it works
      </Link>
    </div>
  );
}
