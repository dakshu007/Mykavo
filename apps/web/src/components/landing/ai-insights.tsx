import Link from "next/link";
import { ArrowRight, CheckCircle2, Sparkles } from "lucide-react";
import { getPlan } from "@/config/plans";
import { AiInsightsAnimation } from "./ai-insights-animation";
import { eyebrowOnDark, fontDisplay } from "./style";

/** The landing page for the feature. */
export const AI_INSIGHTS_PATH = "/ai-website-insights";

/** "10 a month free, 100 on Pro, 500 on Agency" - straight from the plan limits. */
export function aiAllowanceLine(): string {
  const n = (id: "free" | "pro" | "agency") => getPlan(id).limits.aiExplanationsPerMonth.toLocaleString("en-US");
  return `${n("free")} explanations a month free, ${n("pro")} on Pro, ${n("agency")} on Agency`;
}

export const AI_BULLETS = [
  "Explain this change: what changed, why it matters and how to fix it, in plain English",
  "Fix steps for your platform: WordPress, Shopify, Webflow and more",
  "An urgency call on every alert: act now, check this week, or probably fine",
  "Your site this week: a short status note for every website, rewritten after each scan",
];

/**
 * AI Website Insights on the homepage: a dark band, so it reads as the
 * headline feature it is. The copy is careful about one thing that matters
 * for trust: AI explains changes, it never decides what counts as one -
 * detection stays deterministic (spec §4.2).
 */
export function AiInsightsSection() {
  return (
    <section id="ai-insights" className="relative overflow-hidden border-y border-[#151515] bg-[#151515]">
      {/* A soft gold glow behind the animation - the one accent, no AI purple. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-40 top-10 size-[640px] rounded-full bg-[radial-gradient(circle,rgb(255_212_0/0.16),transparent_65%)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
          <div>
            <p className={`${eyebrowOnDark} mb-4 flex items-center gap-2`}>
              <span className="rounded-full bg-[#FFD400] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#151515]">New</span>
              {"// ai website insights //"}
            </p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Every alert,
              <br />
              <span className="relative inline-block">
                <span aria-hidden className="absolute inset-x-[-6px] bottom-[8%] top-[10%] -rotate-1 rounded-md bg-[#FFD400]" />
                <span className="relative text-[#151515]">explained by AI.</span>
              </span>
            </h2>
            <p className="mt-6 max-w-lg text-[15px] leading-7 text-[#9C9E93]">
              A noindex tag, a missing pixel, a 7% visual shift. MyKavo AI reads each change and tells you{" "}
              <span className="text-[#E9EBDF]">what happened, what it costs you and exactly how to fix it</span> -
              with steps for the platform your site runs on. No SEO degree, no digging through diffs.
            </p>
            <ul className="mt-8 space-y-3.5">
              {AI_BULLETS.map((b) => (
                <li key={b} className="flex items-start gap-3 text-[15px] leading-6 text-[#E9EBDF]">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
                  {b}
                </li>
              ))}
            </ul>
            <p className="mt-7 max-w-lg rounded-xl border border-white/12 bg-white/[0.04] px-4 py-3 text-[13.5px] leading-6 text-[#9C9E93]">
              <span className="font-semibold text-[#E9EBDF]">AI explains. It never invents alerts.</span> Detection
              stays rule-based, so the same page always gives the same result. Included on every plan:{" "}
              {aiAllowanceLine()}.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#FFD400] bg-[#FFD400] px-7 py-3.5 text-[15px] font-semibold text-[#151515] shadow-[0_14px_40px_-10px_rgba(255,212,0,0.55)] transition-colors hover:bg-[#ffe14d]"
              >
                <Sparkles className="size-4.5" aria-hidden />
                Try AI insights free
              </Link>
              <Link
                href={AI_INSIGHTS_PATH}
                className="inline-flex items-center gap-1 text-[14px] font-semibold text-[#E9EBDF] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                How AI Website Insights work <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </div>

          <div>
            <AiInsightsAnimation />
            <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9C9E93]">
              Illustrative alert and AI answer
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
