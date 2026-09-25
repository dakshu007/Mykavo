import Link from "next/link";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { SearchConsoleAnimation } from "./search-console-animation";
import { eyebrowOnDark, fontDisplay } from "./style";

/**
 * Search Console section - the correlation story, animated: connect, sync,
 * a clicks drop, MyKavo's change history explaining it, then Priority
 * Opportunities. The copy sits above so the animation gets the full width
 * of the dark band. All data in the animation is illustrative.
 */

const GSC_BULLETS = [
  "One-click Google connect - read-only, tokens encrypted",
  "Clicks, queries, pages, countries synced daily with drop alerts",
  "Priority Opportunities: search traffic crossed with audit issues",
  "Sitemaps, URL inspection, and CSV exports built in",
];

export function SearchConsoleSection() {
  return (
    <section id="search-console" className="border-y border-[#151515] bg-[#151515]">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-end gap-10 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          {/* Copy */}
          <div>
            <p className={`${eyebrowOnDark} mb-4`}>{"// search console, correlated //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Google tells you what ranks.
              <br />
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute inset-x-[-6px] bottom-[8%] top-[10%] -rotate-1 rounded-md bg-[#FFD400]"
                />
                <span className="relative text-[#151515]">MyKavo tells you why.</span>
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              Connect Search Console and MyKavo lays your clicks, impressions, and
              positions over its own change history and Site Audit - so when traffic
              drops, you see what changed on the page before it, and which fix wins the
              most back.
            </p>
          </div>
          <div>
            <ul className="space-y-3.5">
              {GSC_BULLETS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#E9EBDF]/90">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]"
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex items-center gap-2.5 rounded-full border border-black/25 bg-[#FFD400] px-7 py-3.5 text-[15px] font-semibold text-[#151515] shadow-[0_14px_40px_-10px_rgba(255,212,0,0.55)] transition-colors hover:bg-[#ffe14d]"
            >
              <BarChart3 className="size-4.5" aria-hidden />
              Connect Search Console free
            </Link>
          </div>
        </div>

        <div className="mt-14 lg:mt-16">
          <SearchConsoleAnimation />
          <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9C9E93]">
            Illustrative data · example store
          </p>
        </div>
      </div>
    </section>
  );
}
