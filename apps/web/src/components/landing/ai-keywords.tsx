import Link from "next/link";
import { ArrowRight, CheckCircle2, FileText, PenLine, ScanSearch, Target } from "lucide-react";
import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { getPlan } from "@/config/plans";
import { AGENT_PLAN_ORDER, AI_KEYWORDS_NAME, FREE_VISIBLE_KEYWORDS } from "@/config/ai-keywords";
import { eyebrow, fontDisplay } from "./style";

/** The homepage anchor for this section; the full story is on /ai-blog-writer. */
export const AI_KEYWORDS_ANCHOR = "ai-keywords";

const STEPS = [
  {
    icon: ScanSearch,
    title: "It learns your business",
    body: "MyKavo reads your website and fills in a short profile: what you do, who you serve, your services, your market and language. You confirm it.",
  },
  {
    icon: Target,
    title: "It finds what to write",
    body: "Keywords from your own Google Search Console data, including searches you already rank 8 to 20 for, plus Google search suggestions and today's live results. Ranked by what to write first.",
  },
  {
    icon: PenLine,
    title: "It writes the post",
    body: "One click gives you a full SEO blog post, ready to edit in MyKavo. Not happy with it? Every post includes one free rewrite.",
  },
  {
    icon: FileText,
    title: "You publish it",
    body: "Copy the finished post into your site. It stays a draft until you do: MyKavo never publishes to your site on its own.",
  },
];

/** What every generated post contains. Structure, not sample data. */
const POST_PARTS = [
  "Title",
  "URL slug",
  "Meta description",
  "The full article",
  "FAQ section",
  "JSON-LD structured data",
  "Review notes",
];

/**
 * AI Keywords & Blog Writer on the homepage: the second half of MyKavo.
 * Monitoring protects the traffic a site already has; this helps it win
 * more. Light band so it reads as its own product line next to the dark
 * AI Website Insights band above it.
 *
 * Deliberately no mock report or sample keywords: the right-hand card lists
 * what a post contains and what each plan allows, which is all true without
 * inventing any data.
 */
export function AiKeywordsSection() {
  return (
    <section
      id={AI_KEYWORDS_ANCHOR}
      aria-labelledby="ai-keywords-heading"
      className="border-y border-black/10 bg-white"
    >
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div>
            <p className={`${eyebrow} mb-4`}>{"// ai keywords & blog writer //"}</p>
            <h2
              id="ai-keywords-heading"
              className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}
            >
              Know what to write next.
              <br />
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute inset-x-[-2px] bottom-[2px] h-[10px] -rotate-[0.6deg] rounded-sm bg-[#FFD400] sm:h-3"
                />
                <span className="relative">Then write it.</span>
              </span>
            </h2>
            <p className="mt-6 max-w-xl text-[15px] leading-7 text-[#6B6B60]">
              <span className="font-semibold text-[#151515]">
                Monitoring protects the traffic you have. AI Keywords helps you win more.
              </span>{" "}
              The {AI_KEYWORDS_NAME} learns your business from your website, finds the keywords worth
              writing about and writes the full SEO blog post in one click. Search Console is
              optional, but it makes the results better.
            </p>

            <ol className="mt-10 grid gap-x-8 gap-y-8 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={s.title}>
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] px-3 py-1.5 font-mono text-[12px] font-bold text-[#151515] shadow-[2px_2px_0_#151515]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <s.icon className="size-5 text-[#151515]" aria-hidden />
                  </div>
                  <h3 className="mt-3.5 text-[17px] font-semibold leading-snug text-[#151515]">{s.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-6.5 text-[#6B6B60]">{s.body}</p>
                </li>
              ))}
            </ol>

            <div className="mt-10 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-[15px] font-semibold text-[#151515] shadow-[4px_4px_0_#151515] transition-all hover:-translate-y-0.5 hover:bg-[#ffe14d]"
              >
                Try AI Keywords free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className="text-[14px] font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                Compare plans
              </Link>
              <Link
                href="/ai-blog-writer"
                className="text-[14px] font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
              >
                See how it works
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-[#151515] bg-[#FBFAF3] p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515] sm:p-8">
            <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
              Every post includes
            </h3>
            <ul className="mt-4 grid gap-x-4 gap-y-2.5 sm:grid-cols-2">
              {POST_PARTS.map((part) => (
                <li key={part} className="flex items-start gap-2.5 text-[14.5px] leading-6 text-[#151515]">
                  <CheckCircle2 className="mt-0.5 size-4.5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
                  {part}
                </li>
              ))}
            </ul>

            <div className="mt-7 border-t border-black/10 pt-6">
              <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#6B6B60]">
                On every plan
              </h3>
              <table className="mt-3 w-full text-left text-[14px]">
                <caption className="sr-only">{AI_KEYWORDS_NAME} allowances per plan, per month</caption>
                <thead>
                  <tr className="border-b border-black/10 text-[12.5px] text-[#6B6B60]">
                    <th scope="col" className="py-2 pr-3 font-medium">Plan</th>
                    <th scope="col" className="px-3 py-2 font-medium">Keyword reports</th>
                    <th scope="col" className="py-2 pl-3 font-medium">Blog posts</th>
                  </tr>
                </thead>
                <tbody>
                  {AGENT_PLAN_ORDER.map((id) => {
                    const plan = getPlan(id);
                    return (
                      <tr key={id} className="border-b border-black/5 last:border-b-0">
                        <th scope="row" className="py-2.5 pr-3 font-semibold text-[#151515]">
                          {plan.name}{" "}
                          <span className="font-mono text-[12px] font-normal text-[#6B6B60]">
                            ${plan.priceMonthlyUsd}/mo
                          </span>
                        </th>
                        <td className="px-3 py-2.5 text-[#151515]">{AGENT_LIMITS[id].reports} a month</td>
                        <td className="py-2.5 pl-3 text-[#151515]">{AGENT_LIMITS[id].posts} a month</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-[13px] leading-6 text-[#6B6B60]">
                Free shows the top {FREE_VISIBLE_KEYWORDS} keywords in each report; paid plans show them all.
                Allowances refill every month: on your billing date on paid plans, on your signup date on Free.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
