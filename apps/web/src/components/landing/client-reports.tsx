import Link from "next/link";
import { CalendarClock, CheckCircle2, FileDown, Link2, Palette } from "lucide-react";
import { plans } from "@/config/plans";
import { eyebrow, fontDisplay } from "./style";

/**
 * Client reports on the home page: what an agency hands its client. The card
 * mirrors the real report at /r/[token] - the same sections in the same
 * order - with illustrative numbers under an invented agency brand, labelled
 * as such (no fake customer data - house rule).
 */

const POINTS = [
  "A live report link for every website: uptime, response time, changes caught, SSL and Lighthouse scores for the last 30 days",
  "Save it as a PDF in one click - it is laid out for print",
  "Your brand, not ours: agency name, logo and accent color replace MyKavo",
  "Emailed to up to five client addresses every week or month, automatically",
  "Regenerate the link any time and the old one stops working; reports are never indexed by search engines",
];

const STATS = [
  { label: "Uptime", value: "99.98%", sub: "1 incident · 4m" },
  { label: "Avg response", value: "412 ms", sub: "Last 30 days" },
  { label: "Changes caught", value: "7", sub: "2 important" },
  { label: "Scans run", value: "30", sub: "12 pages monitored" },
];

const SCORES = [
  { label: "Performance", score: 91 },
  { label: "Accessibility", score: 98 },
  { label: "Best practices", score: 100 },
  { label: "SEO", score: 96 },
];

const ACCENT = "#2F6FEB";

export function ClientReportsSection() {
  const agency = plans.find((p) => p.id === "agency");
  return (
    <section id="client-reports" className="bg-[#FBFAF3]">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Copy */}
          <div>
            <p className={`${eyebrow} mb-4`}>{"// client reports //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Prove the retainer.
              <br />
              <span className="relative inline-block">
                <span aria-hidden className="absolute inset-x-[-6px] bottom-[8%] top-[10%] -rotate-1 rounded-md bg-[#FFD400]" />
                <span className="relative">Every month.</span>
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
              Clients rarely see the work that keeps their site healthy. A MyKavo client report shows
              it - what was checked, what was caught, and how the site performed - in a page they
              can read in a minute.
            </p>
            <ul className="mt-8 space-y-3.5">
              {POINTS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
                  <CheckCircle2 className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[14px] leading-6 text-[#6B6B60]">
              Report links come with every plan. White-label branding and automatic client emails are
              part of the Agency plan
              {agency ? ` - ${agency.limits.websites} client websites for $${agency.priceMonthlyUsd}/month` : ""}.{" "}
              <Link href="/pricing" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                Compare plans
              </Link>
            </p>
          </div>

          {/* Report mock */}
          <div>
            <div className="relative">
              <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
                <div className="h-1.5" style={{ backgroundColor: ACCENT }} aria-hidden />
                <div className="flex items-start justify-between gap-3 border-b border-black/10 px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="flex size-9 items-center justify-center rounded-lg text-[13px] font-bold text-white"
                      style={{ backgroundColor: ACCENT }}
                      aria-hidden
                    >
                      NS
                    </span>
                    <div>
                      <p className="text-[14px] font-semibold text-[#151515]">Northstar Studio</p>
                      <p className="text-[12px] text-[#6B6B60]">aurora-outdoor.com · last 30 days</p>
                    </div>
                  </div>
                  <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-black/15 px-3 py-1.5 text-[12px] font-semibold text-[#151515]">
                    <FileDown className="size-3.5" aria-hidden />
                    Save as PDF
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 p-4">
                  {STATS.map((s) => (
                    <div key={s.label} className="rounded-xl border border-black/10 bg-[#FBFAF3] p-3">
                      <p className="font-mono text-[9.5px] font-semibold uppercase tracking-[0.12em] text-[#6B6B60]">{s.label}</p>
                      <p className="mt-1 text-[20px] font-semibold tracking-tight text-[#151515]">{s.value}</p>
                      <p className="text-[11.5px] text-[#6B6B60]">{s.sub}</p>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-black/10 px-5 py-3 text-[13px]">
                  <span className="text-[#6B6B60]">SSL certificate</span>
                  <span className="font-semibold text-[#067647]">Valid · 71 days left</span>
                </div>
                <div className="grid grid-cols-4 gap-2 border-t border-black/10 px-4 py-4">
                  {SCORES.map((a) => (
                    <div key={a.label} className="text-center">
                      <span className="mx-auto flex size-11 items-center justify-center rounded-full border-[3px] border-[#1f9d55] text-[14px] font-bold text-[#151515]">
                        {a.score}
                      </span>
                      <p className="mt-1.5 text-[10.5px] leading-tight text-[#6B6B60]">{a.label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Delivery chip, like the dashboard's scheduled-email setting */}
              <div className="mx-auto mt-6 flex w-fit items-center gap-2.5 rounded-xl border border-[#151515] bg-[#151515] px-4 py-3 text-[12.5px] text-[#E9EBDF] shadow-[4px_4px_0_#FFD400]">
                <CalendarClock className="size-4 text-[#FFD400]" aria-hidden />
                Emailed to the client every week
              </div>
            </div>
            <p className="mt-6 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              Illustrative report · invented agency and numbers
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-[12px] text-[#6B6B60]">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1">
                <Link2 className="size-3.5" aria-hidden /> Live share link
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1">
                <Palette className="size-3.5" aria-hidden /> Your logo and color
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1">
                <FileDown className="size-3.5" aria-hidden /> PDF-ready
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
