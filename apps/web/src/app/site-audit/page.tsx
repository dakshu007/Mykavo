import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Download, Gauge, ListOrdered, MapPin, Radar, SearchCheck } from "lucide-react";
import {
  AUDIT_CATEGORY_COUNT,
  AUDIT_CHECK_COUNT,
  AUDIT_CHECKS,
  type AuditCategory,
  type AuditSeverity,
} from "@mykavo/seo-audit";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { SiteAuditReportMock } from "@/components/landing/site-audit";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { plans } from "@/config/plans";
import { site } from "@/config/site";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

const PATH = "/site-audit";

export const metadata: Metadata = {
  title: "Site Audit - Technical SEO Crawl With 89 Checks",
  description: `MyKavo Site Audit crawls your whole site and checks every page against ${AUDIT_CHECK_COUNT} technical SEO checks in ${AUDIT_CATEGORY_COUNT} categories - broken pages and links, redirect chains, noindex mistakes, duplicate titles, schema, security and speed - sorted by severity, with fix guidance and CSV export.`,
  keywords: [
    "site audit tool",
    "technical SEO audit",
    "website SEO crawler",
    "free site audit",
    "broken link checker",
    "SEO audit checklist",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    title: "MyKavo Site Audit - every technical issue, found and sorted",
    description: `${AUDIT_CHECK_COUNT} checks across ${AUDIT_CATEGORY_COUNT} categories, sorted by severity, with fix guidance for every issue.`,
    url: PATH,
  },
};

const SEVERITY_STYLE: Record<AuditSeverity, { label: string; dot: string }> = {
  ERROR: { label: "Error", dot: "#e5484d" },
  WARNING: { label: "Warning", dot: "#f97316" },
  NOTICE: { label: "Notice", dot: "#3556f4" },
};

/** Every check in the registry, grouped by category - the page can never drift from what the crawler runs. */
function checksByCategory(): Array<{ category: AuditCategory; checks: Array<{ title: string; severity: AuditSeverity }> }> {
  const groups = new Map<AuditCategory, Array<{ title: string; severity: AuditSeverity }>>();
  for (const check of Object.values(AUDIT_CHECKS)) {
    const list = groups.get(check.category) ?? [];
    list.push({ title: check.title, severity: check.severity });
    groups.set(check.category, list);
  }
  const order: Record<AuditSeverity, number> = { ERROR: 0, WARNING: 1, NOTICE: 2 };
  return [...groups.entries()]
    .map(([category, checks]) => ({
      category,
      checks: checks.sort((a, b) => order[a.severity] - order[b.severity]),
    }))
    .sort((a, b) => b.checks.length - a.checks.length);
}

const steps = [
  {
    icon: Radar,
    title: "Crawl",
    desc: "MyKavo reads robots.txt and your sitemaps, then follows internal links page by page - the way a search engine discovers your site. robots.txt rules are obeyed.",
  },
  {
    icon: SearchCheck,
    title: "Check",
    desc: `Every page is checked against ${AUDIT_CHECK_COUNT} rules: status codes, redirects, indexability, titles, headings, links, images, schema, security, speed and more.`,
  },
  {
    icon: ListOrdered,
    title: "Sort",
    desc: "Issues are grouped and ranked - errors first, then warnings, then notices - with a health score, so the report reads as a to-do list.",
  },
  {
    icon: MapPin,
    title: "Fix",
    desc: "Each issue explains what it means, why it matters and how to fix it, and lists the exact URLs it was found on. Export everything as CSV.",
  },
];

const features = [
  {
    icon: Gauge,
    title: "A health score you can track",
    desc: "One number for the whole site, re-scored on every audit, so you can see whether fixes are landing.",
  },
  {
    icon: MapPin,
    title: "Found on, not just found",
    desc: "Every issue lists the pages it appears on and where the problem came from - down to the page that links to a broken URL.",
  },
  {
    icon: Download,
    title: "CSV export",
    desc: "Hand the full issue list to a developer or a client, or sort it your own way in a spreadsheet.",
  },
  {
    icon: SearchCheck,
    title: "Joined up with Search Console",
    desc: "Connect Google Search Console and MyKavo ranks audit issues by the traffic they touch - noindex pages with impressions, errors on pages that earn clicks.",
  },
];

const faqs = [
  {
    q: "What does a site audit check?",
    a: `MyKavo runs ${AUDIT_CHECK_COUNT} checks across ${AUDIT_CATEGORY_COUNT} categories: HTTP status codes, crawlability and redirects, indexability, titles, meta descriptions, headings, content, images, internal and external links, URLs, sitemaps, robots.txt, structured data, social tags, security, performance, mobile, international (hreflang and lang), accessibility basics, trust signals and HTML hygiene. The full list is on this page.`,
  },
  {
    q: "Is the site audit free?",
    a: "Yes. Every plan includes Site Audit. The free plan crawls up to 150 pages once a day with no card required; Pro crawls up to 1,500 pages ten times a day, and Agency up to 2,000 pages 25 times a day.",
  },
  {
    q: "How is this different from website monitoring?",
    a: "A site audit is a full crawl that finds technical issues across every page, on demand. Monitoring watches the pages that matter against an approved baseline and alerts you when something changes. MyKavo does both in one account: audit to find what to fix, monitor so it stays fixed.",
  },
  {
    q: "Does the crawler respect robots.txt?",
    a: "Yes. The crawler obeys robots.txt, only fetches public pages, never logs in, and stops at the plan's page limit or after ten minutes. Every URL passes the same network safety checks as MyKavo's scanner.",
  },
  {
    q: "Can I audit a client's site or a competitor's?",
    a: "You can audit any public site you have a legitimate reason to check, such as your own or a client's. For watching competitors over time, the Competitor Analysis tool is the better fit.",
  },
];

export default function SiteAuditPage() {
  const categories = checksByCategory();
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebPage",
        "@id": `${site.url}${PATH}#page`,
        url: `${site.url}${PATH}`,
        name: "MyKavo Site Audit",
        description: metadata.description,
        about: {
          "@type": "SoftwareApplication",
          name: "MyKavo Site Audit",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          publisher: { "@id": ORGANIZATION_ID },
          featureList: categories.map((c) => `${c.category}: ${c.checks.map((x) => x.title).join(", ")}`),
          offers: plans.map((plan) => ({
            "@type": "Offer",
            name: plan.name,
            price: String(plan.priceMonthlyUsd),
            priceCurrency: "USD",
            url: `${site.url}/pricing`,
          })),
        },
      },
    ],
  };

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Site Audit", path: PATH }])) }}
      />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// site audit //"}</p>
              <h1 className={`${fontDisplay} text-4xl leading-[1.05] sm:text-5xl`}>
                Every technical issue.
                <br />
                <span className="relative inline-block whitespace-nowrap">
                  <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                  <span className="relative">Found and sorted.</span>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-7 text-[#6B6B60]">
                MyKavo Site Audit crawls your whole site and checks every page against{" "}
                <strong className="text-[#151515]">{AUDIT_CHECK_COUNT} technical SEO checks</strong> in{" "}
                {AUDIT_CATEGORY_COUNT} categories. Broken pages and links, redirect chains, noindex mistakes,
                duplicate titles, missing schema, mixed content and slow responses - ranked by severity, with
                a fix for every issue.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleButton />
                <Link href="/signup" className="text-[13px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]">
                  or sign up with email
                </Link>
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
                Free on every plan · No card · Results in minutes
              </p>
            </div>
            <div>
              <SiteAuditReportMock />
              <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative audit report
              </p>
            </div>
          </div>
        </section>

        {/* Numbers band */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 py-14 sm:gap-4 lg:grid-cols-4 lg:px-8">
            {[
              { value: String(AUDIT_CHECK_COUNT), label: "checks on every page" },
              { value: String(AUDIT_CATEGORY_COUNT), label: "categories, from HTTP status to hreflang" },
              { value: "3", label: "severity levels: error, warning, notice" },
              { value: "$0", label: "to run your first audit" },
            ].map((z) => (
              <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// how it works //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>Crawl. Check. Sort. Fix.</h2>
          <ol className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <div className="flex items-center justify-between">
                  <s.icon className="size-9 rounded-xl border border-[#151515] bg-[#FFD400] p-2" aria-hidden />
                  <span className="font-mono text-[12px] font-semibold text-[#6B6B60]">0{i + 1}</span>
                </div>
                <h3 className="mt-4 text-[17px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{s.desc}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Every check */}
        <section id="checks" className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrow} mb-4 text-center`}>{"// every check //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>
              All {AUDIT_CHECK_COUNT} checks, in the open.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
              The complete list the crawler runs, by category. Nothing hidden behind a paid tier - every plan
              runs every check.
            </p>
            <div className="mt-6 flex justify-center gap-4 text-[12.5px] text-[#6B6B60]">
              {(Object.keys(SEVERITY_STYLE) as AuditSeverity[]).map((sev) => (
                <span key={sev} className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full" style={{ backgroundColor: SEVERITY_STYLE[sev].dot }} aria-hidden />
                  {SEVERITY_STYLE[sev].label}
                </span>
              ))}
            </div>
            <div className="mt-12 columns-1 gap-4 sm:columns-2 lg:columns-3">
              {categories.map((c) => (
                <div key={c.category} className="mb-4 break-inside-avoid rounded-2xl border border-black/10 bg-white p-5">
                  <h3 className="flex items-center justify-between text-[15px] font-semibold">
                    {c.category}
                    <span className="font-mono text-[11px] text-[#6B6B60]">{c.checks.length}</span>
                  </h3>
                  <ul className="mt-3 space-y-1.5">
                    {c.checks.map((check) => (
                      <li key={check.title} className="flex items-start gap-2 text-[13.5px] leading-5 text-[#151515]/85">
                        <span
                          className="mt-1.5 size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: SEVERITY_STYLE[check.severity].dot }}
                          aria-label={SEVERITY_STYLE[check.severity].label}
                        />
                        {check.title}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// in the report //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>A to-do list, not a data dump.</h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2">
            {features.map((f) => (
              <div key={f.title} className="flex gap-4 rounded-2xl border border-black/10 bg-white p-6">
                <f.icon className="size-10 shrink-0 rounded-xl border border-[#151515] bg-[#FFD400] p-2" aria-hidden />
                <div>
                  <h3 className="text-[17px] font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[14px] leading-6 text-[#6B6B60]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Plans */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
            <p className={`${eyebrow} mb-4 text-center`}>{"// on every plan //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>Audits like the big tools, priced like neither.</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-black/15">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-black/15 bg-[#F3F1E6]">
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Pages per audit</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Audits per day</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-black/10 last:border-b-0">
                      <td className="px-4 py-3 font-medium">{plan.name}</td>
                      <td className="px-4 py-3 text-[#6B6B60]">${plan.priceMonthlyUsd}/month</td>
                      <td className="px-4 py-3 text-[#6B6B60]">{plan.limits.siteAuditPages.toLocaleString("en-US")}</td>
                      <td className="px-4 py-3 text-[#6B6B60]">{plan.limits.siteAuditsPerDay}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-center text-[14px] text-[#6B6B60]">
              Every plan also includes website change monitoring.{" "}
              <Link href="/pricing" className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                Compare plans
              </Link>
            </p>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
          <p className={`${eyebrow} mb-4 text-center`}>{"// questions //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06]`}>FAQ</h2>
          <div className="mt-10 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]">
                  {f.q}
                </summary>
                <p className="mt-3 text-[14px] leading-6 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
          <ul className="mt-8 space-y-2 text-[14px]">
            {[
              { href: "/seo-monitoring", label: "SEO monitoring: keep it fixed after the audit" },
              { href: "/compare/seo-crawlers", label: "MyKavo vs technical SEO crawlers" },
              { href: "/tools/meta-tag-checker", label: "Free Meta Tag Checker" },
            ].map((l) => (
              <li key={l.href} className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-[#151515]" aria-hidden />
                <Link href={l.href} className="font-medium underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
            <p className={`${eyebrowOnDark} mb-4`}>{"// audit your site free //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Find every issue.
              <br />
              <span className="text-[#FFD400]">Fix what matters.</span>
            </h2>
            <div className="mt-9 flex flex-col items-center gap-3">
              <GoogleButton onDark />
              <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
                or sign up with email
              </Link>
            </div>
            <p className="mt-6 inline-flex items-center gap-1 text-sm text-[#E9EBDF]/70">
              Then keep it fixed with{" "}
              <Link href="/#how-it-works" className="inline-flex items-center gap-1 underline decoration-[#FFD400] underline-offset-4">
                website monitoring <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
