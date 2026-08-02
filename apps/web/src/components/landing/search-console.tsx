import Link from "next/link";
import { BarChart3, CheckCircle2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { eyebrowOnDark, fontDisplay } from "./style";

/**
 * Search Console section - the correlation story told visually: a Search
 * Console metrics card and a Site Audit issues card stream gold packets into
 * the spark, which emits a "Priority Opportunity" verdict card. Pure CSS
 * animation (same keyframe language as the Android sync section), fully
 * paused for reduced-motion users. All numbers clearly illustrative.
 */

const GSC_BULLETS = [
  "One-click Google connect - read-only, tokens encrypted",
  "Clicks, queries, pages, countries synced daily with drop alerts",
  "Priority Opportunities: search traffic crossed with audit issues",
  "Sitemaps, URL inspection, and CSV exports built in",
];

function SourceCard({
  title,
  rows,
  accent,
}: {
  title: string;
  rows: [string, string][];
  accent?: boolean;
}) {
  return (
    <div className="w-56 shrink-0 overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[6px_6px_0_rgba(255,212,0,0.9)]">
      <div className="flex items-center justify-between border-b border-black/10 bg-[#F3F1E6] px-3.5 py-2">
        <span className="text-[11.5px] font-bold text-[#151515]">{title}</span>
        {accent && (
          <span className="size-2 rounded-full bg-[#1f9d55]" aria-hidden />
        )}
      </div>
      <div className="px-3.5 py-1">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex items-center justify-between gap-2 border-t border-black/[0.06] py-1.5 first:border-t-0"
          >
            <span className="truncate text-[11px] font-medium text-[#151515]/75">{label}</span>
            <span className="shrink-0 font-mono text-[10px] font-bold text-[#151515]">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchConsoleSection() {
  return (
    <section id="search-console" className="border-y border-[#151515] bg-[#151515]">
      <style>{`
        @keyframes sc-flow {
          from { stroke-dashoffset: 120; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes sc-pulse-kf {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes sc-ring {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        .sc-packet { animation: sc-flow 2.4s linear infinite; }
        .sc-packet-late { animation: sc-flow 2.4s linear infinite; animation-delay: 1.2s; }
        .sc-pulse { animation: sc-ring 2.4s ease-out infinite; }
        .sc-chip { animation: sc-pulse-kf 2.4s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .sc-packet, .sc-packet-late, .sc-pulse, .sc-chip { animation: none; }
          .sc-pulse { opacity: 0; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
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
              Connect Search Console and MyKavo crosses your clicks, impressions, and
              positions with its own Site Audit - so instead of two dashboards and a
              guess, you get one list: the pages where fixing an issue moves real traffic.
            </p>
            <ul className="mt-8 space-y-3.5">
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

          {/* Correlation diagram */}
          <div>
            {/* Sources */}
            <div className="flex flex-wrap justify-center gap-4">
              <SourceCard
                title="Search Console"
                accent
                rows={[
                  ["/pricing impressions", "12,442"],
                  ["Average position", "6.2"],
                  ["CTR", "1.1%"],
                ]}
              />
              <SourceCard
                title="Site Audit"
                rows={[
                  ["Missing meta description", "1"],
                  ["Slow server response", "3.8s"],
                  ["Schema", "none"],
                ]}
              />
            </div>

            {/* Converging rails into the spark */}
            <div className="relative mx-auto h-20 w-64" aria-hidden>
              <svg viewBox="0 0 256 80" className="absolute inset-0 size-full" fill="none">
                <path d="M 48 0 C 48 40 128 40 128 76" stroke="#E9EBDF" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 6" />
                <path d="M 208 0 C 208 40 128 40 128 76" stroke="#E9EBDF" strokeOpacity="0.25" strokeWidth="1.5" strokeDasharray="3 6" />
                <path d="M 48 0 C 48 40 128 40 128 76" className="sc-packet" stroke="#FFD400" strokeWidth="4" strokeLinecap="round" strokeDasharray="14 106" />
                <path d="M 208 0 C 208 40 128 40 128 76" className="sc-packet-late" stroke="#FFD400" strokeWidth="4" strokeLinecap="round" strokeDasharray="14 106" />
              </svg>
              <div className="absolute bottom-[-24px] left-1/2 -translate-x-1/2">
                <span className="sc-pulse absolute inset-0 rounded-full border-2 border-[#FFD400]" />
                <span className="relative flex size-12 items-center justify-center rounded-full border border-[#151515] bg-white shadow-[4px_4px_0_#FFD400]">
                  <LogoMark size={24} />
                </span>
              </div>
            </div>

            {/* The verdict */}
            <div className="mx-auto mt-9 max-w-md overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
              <div className="flex items-center justify-between gap-2 border-b border-black/10 bg-[#F3F1E6] px-4 py-2.5">
                <span className="text-[12px] font-bold text-[#151515]">Priority Opportunities</span>
                <span className="sc-chip rounded-full border border-black/20 bg-[#FFD400] px-2.5 py-0.5 font-mono text-[9.5px] font-bold uppercase tracking-wide text-[#151515]">
                  High priority
                </span>
              </div>
              <div className="px-4 py-3.5">
                <p className="font-mono text-[11px] text-[#6B6B60]">/pricing</p>
                <p className="mt-1 text-[13.5px] font-semibold leading-5 text-[#151515]">
                  12,442 impressions but no meta description - the snippet is left to chance.
                </p>
                <p className="mt-1.5 text-[12.5px] leading-5 text-[#6B6B60]">
                  → Write a 70-155 character description that sells the click.
                </p>
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9C9E93]">
              Illustrative correlation
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
