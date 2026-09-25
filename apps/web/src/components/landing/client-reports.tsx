import Link from "next/link";
import { CheckCircle2, FileDown, Link2, Palette } from "lucide-react";
import { ClientReportAnimation } from "./client-report-animation";
import { plans } from "@/config/plans";
import { eyebrow, fontDisplay } from "./style";

/**
 * Client reports on the home page: what an agency hands its client. The
 * animation (client-report-animation.tsx) builds the report with the same
 * sections as the real one at /r/[token], white-labels it, and delivers it
 * the way the scheduled email does - illustrative numbers under an invented
 * agency brand, labelled as such (no fake customer data - house rule).
 */

const POINTS = [
  "A live report link for every website: uptime, response time, changes caught, SSL and Lighthouse scores for the last 30 days",
  "Save it as a PDF in one click - it is laid out for print",
  "Your brand, not ours: agency name, logo and accent color replace MyKavo",
  "Emailed to up to five client addresses every week or month, automatically",
  "Regenerate the link any time and the old one stops working; reports are never indexed by search engines",
];

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

          {/* Report animation: build, brand, deliver */}
          <div>
            <ClientReportAnimation />
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
