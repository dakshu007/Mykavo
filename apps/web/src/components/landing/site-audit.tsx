import Link from "next/link";
import { CheckCircle2, SearchCheck } from "lucide-react";
import { eyebrow, fontDisplay } from "./style";

/**
 * Site Audit section - split layout: pitch + proof bullets on the left, a
 * CSS-drawn audit report card on the right (health gauge, severity chips,
 * issue rows) in the v4 gold language. All numbers are clearly illustrative
 * (no fake customer data - house rule).
 */

const AUDIT_BULLETS = [
  "75+ technical checks - crawlability, titles, links, schema, security",
  "Every issue explains itself: what it means and exactly how to fix it",
  "Health score and severity triage - errors first, notices last",
  "Crawls up to 1,500 pages per audit on Pro - 3× Screaming Frog's free cap",
];

const MOCK_ISSUES: { severity: "err" | "warn" | "note"; label: string; count: number }[] = [
  { severity: "err", label: "4XX page", count: 7 },
  { severity: "err", label: "Broken internal link", count: 12 },
  { severity: "warn", label: "Missing meta description", count: 23 },
  { severity: "warn", label: "Duplicate title", count: 9 },
  { severity: "note", label: "Title too long", count: 31 },
];

const SEVERITY_DOT: Record<string, string> = {
  err: "#e5484d",
  warn: "#f97316",
  note: "#3556f4",
};

/** Mini half-gauge, gold on paper - the report page's gauge in miniature. */
function MockGauge() {
  const circumference = Math.PI * 52;
  const filled = 0.94 * circumference;
  return (
    <svg viewBox="0 0 128 76" className="w-32" aria-hidden>
      <path d="M 12 70 A 52 52 0 0 1 116 70" fill="none" stroke="#15151522" strokeWidth="11" strokeLinecap="round" />
      <path
        d="M 12 70 A 52 52 0 0 1 116 70"
        fill="none"
        stroke="#1f9d55"
        strokeWidth="11"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
      />
      <text x="64" y="62" textAnchor="middle" style={{ fontSize: "27px", fontWeight: 700, fill: "#151515", letterSpacing: "-0.02em" }}>
        94
      </text>
    </svg>
  );
}

export function SiteAuditSection() {
  return (
    <section id="site-audit" className="border-y border-black/10 bg-[#F3F1E6]">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Report mock - leading on desktop so the "product shot" hits first */}
          <div className="order-2 lg:order-1">
            <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
              <div className="flex items-center justify-between gap-3 border-b border-black/10 bg-[#FBFAF3] px-5 py-3">
                <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#151515]">
                  <SearchCheck className="size-4" aria-hidden />
                  Site Audit
                </span>
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#6B6B60]">
                  1,247 pages crawled
                </span>
              </div>
              <div className="grid gap-4 p-5 sm:grid-cols-[auto_1fr] sm:items-center">
                <div className="flex flex-col items-center">
                  <MockGauge />
                  <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1f9d55]">
                    Health score
                  </p>
                </div>
                <div className="flex flex-wrap content-center gap-2">
                  {[
                    { label: "19 errors", bg: "#FDE5E5", fg: "#b42318" },
                    { label: "32 warnings", bg: "#FDF3E0", fg: "#b45309" },
                    { label: "72 notices", bg: "#E8ECFD", fg: "#3556f4" },
                  ].map((chip) => (
                    <span
                      key={chip.label}
                      className="rounded-full border border-black/10 px-3 py-1.5 text-[12px] font-bold"
                      style={{ backgroundColor: chip.bg, color: chip.fg }}
                    >
                      {chip.label}
                    </span>
                  ))}
                </div>
              </div>
              <div className="border-t border-black/10">
                {MOCK_ISSUES.map((issue) => (
                  <div
                    key={issue.label}
                    className="flex items-center justify-between gap-3 border-b border-black/[0.06] px-5 py-2.5 last:border-b-0"
                  >
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: SEVERITY_DOT[issue.severity] }}
                        aria-hidden
                      />
                      <span className="truncate text-[13px] font-medium text-[#151515]/85">{issue.label}</span>
                      <span
                        className="hidden shrink-0 rounded-full border border-black/15 bg-[#FBFAF3] px-2 py-0.5 font-mono text-[9.5px] font-semibold text-[#6B6B60] sm:inline"
                        title="Every issue ships with fix guidance"
                      >
                        how to fix ?
                      </span>
                    </span>
                    <span className="shrink-0 font-mono text-[12px] font-bold text-[#151515]">{issue.count}</span>
                  </div>
                ))}
              </div>
            </div>
            <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
              Illustrative audit report
            </p>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className={`${eyebrow} mb-4`}>{"// site audit //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Audits like the big tools.
              <br />
              <span className="relative inline-block">
                <span
                  aria-hidden
                  className="absolute inset-x-[-6px] bottom-[8%] top-[10%] -rotate-1 rounded-md bg-[#FFD400]"
                />
                <span className="relative">Priced like neither.</span>
              </span>
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
              Crawl any site you manage and get the full technical picture - broken pages,
              duplicate titles, missing schema, mixed content, slow responses - triaged by
              severity, with plain-English fix steps on every single issue.
            </p>
            <ul className="mt-8 space-y-3.5">
              {AUDIT_BULLETS.map((t) => (
                <li key={t} className="flex items-start gap-3 text-[15px] text-[#151515]/90">
                  <CheckCircle2
                    className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]"
                    aria-hidden
                  />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[14px] leading-6 text-[#6B6B60]">
              Included in every plan - free accounts audit 150 pages a day, Pro runs ten
              1,500-page audits daily for <span className="font-semibold text-[#151515]">$20/mo</span>,
              monitoring included. The dedicated audit tools start at $129/mo.
            </p>
            <Link
              href="/signup"
              className="mt-7 inline-flex items-center gap-2.5 rounded-full border border-black/25 bg-[#FFD400] px-7 py-3.5 text-[15px] font-semibold text-[#151515] shadow-[0_14px_40px_-10px_rgba(255,212,0,0.55)] transition-colors hover:bg-[#ffe14d]"
            >
              <SearchCheck className="size-4.5" aria-hidden />
              Audit your site free
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
