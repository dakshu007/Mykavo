import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CalendarCheck,
  CheckCircle2,
  Lock,
  Radar,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";
import { withSocial } from "@/lib/social-metadata";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { AiInsightsAnimation } from "@/components/landing/ai-insights-animation";
import { AI_INSIGHTS_PATH } from "@/components/landing/ai-insights";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { getPlan, plans } from "@/config/plans";
import { site } from "@/config/site";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

const PATH = AI_INSIGHTS_PATH;
const FREE_EXPLANATIONS = getPlan("free").limits.aiExplanationsPerMonth;

export const metadata: Metadata = withSocial({
  title: "AI Website Insights - Every Website Change Explained by AI",
  description:
    "MyKavo AI Website Insights explains every detected website change in plain English: what changed, why it matters and step-by-step fixes for WordPress, Shopify, Webflow and more. Plus an AI status note for every website, every week. Free plan included.",
  keywords: [
    "ai website monitoring",
    "ai website insights",
    "ai website analyzer",
    "ai seo monitoring",
    "website change detection ai",
    "ai website audit",
    "website monitoring with ai",
  ],
  alternates: { canonical: PATH },
  openGraph: {
    title: "MyKavo AI Website Insights - every change, explained",
    description:
      "AI that reads every alert and tells you what happened, what it costs you and how to fix it on your platform.",
    url: PATH,
  },
});

const numbers = [
  { value: "3", label: "questions answered on every alert: what, why, how to fix" },
  { value: "1-5", label: "fix steps, written for the platform your site runs on" },
  { value: String(FREE_EXPLANATIONS), label: "AI explanations a month on the free plan" },
  { value: "0", label: "alerts invented by AI: detection stays rule-based" },
];

const steps = [
  {
    icon: Radar,
    title: "Detect",
    desc: "MyKavo scans your pages and compares them with an approved baseline using fixed rules: status codes, SEO tags, pixels, scripts, links. No AI guesswork decides what is an alert.",
  },
  {
    icon: Brain,
    title: "Explain",
    desc: "MyKavo AI reads the change - before and after values, page, severity, your platform - and writes what happened and why it matters, in plain English.",
  },
  {
    icon: Wrench,
    title: "Fix",
    desc: "One to five concrete steps, using your platform's own menus: WordPress settings, Shopify theme editor, Webflow page settings. Or one click to approve it as intended.",
  },
  {
    icon: CheckCircle2,
    title: "Confirm",
    desc: "Run a scan after the fix. MyKavo checks the page against the baseline again and the alert resolves, or approve the new state as your baseline.",
  },
];

const PLATFORMS = ["WordPress", "WooCommerce", "Shopify", "Webflow", "Wix", "Squarespace", "Next.js", "Framer"];

const faqs = [
  {
    q: "What is AI Website Insights?",
    a: "AI Website Insights is MyKavo's AI layer on top of website change monitoring. When MyKavo detects a change on one of your pages, its AI explains it in plain English: what changed, why it matters for visitors, search rankings or sales, and step-by-step fixes for your platform, with an urgency call. It also writes a short status note for each website covering the last 7 days.",
  },
  {
    q: "Does AI decide what counts as a change?",
    a: "No. Detection is deterministic: previous value versus current value, normalized page structure and pixel comparison, scored by fixed severity rules. The same page always gives the same result. AI only explains changes that the rules already found, so it can never invent an alert or hide one.",
  },
  {
    q: "Is it free?",
    a: `Yes. Every plan includes AI Website Insights. The free plan includes ${FREE_EXPLANATIONS} change explanations a month, Pro ${getPlan("pro").limits.aiExplanationsPerMonth} and Agency ${getPlan("agency").limits.aiExplanationsPerMonth}. Weekly website notes are included on every plan. Each explanation is written once and kept, so opening it again never counts twice.`,
  },
  {
    q: "Which platforms does it give fix steps for?",
    a: "MyKavo detects what each page is built with - WordPress, WooCommerce, Shopify, Webflow, Wix, Squarespace, Next.js and many more - and the AI writes its fix steps in that platform's own terms. When the platform is unknown, the steps stay general.",
  },
  {
    q: "What data does the AI see?",
    a: "Only the details of the detected change: the page address, the change type and severity, and the before and after values, plus status counts for weekly notes. It never sees passwords or your dashboard. Requests go to Anthropic's Claude API, which does not train its models on this data.",
  },
  {
    q: "Which AI model does MyKavo use?",
    a: "MyKavo AI runs on Anthropic's Claude. Answers are structured (headline, what changed, why it matters, fix steps, urgency) so they read the same way every time.",
  },
];

function ExplanationMock() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#FBFAF3] px-5 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#FFD400]">
          <Sparkles className="size-4" aria-hidden />
        </span>
        <span className="text-[14px] font-semibold">Explain this change</span>
        <span className="ml-auto rounded-full bg-[#FDF3E0] px-2.5 py-0.5 text-[12px] font-bold text-[#b45309]">Check this week</span>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-[16px] font-semibold leading-6">Your Meta Pixel stopped loading on /checkout.</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">What changed</p>
            <p className="mt-1 text-[13.5px] leading-6 text-[#151515]/85">
              The script from connect.facebook.net was on the page at baseline and is gone in the last two scans.
            </p>
          </div>
          <div>
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">Why it matters</p>
            <p className="mt-1 text-[13.5px] leading-6 text-[#151515]/85">
              Purchases from Facebook and Instagram ads will stop being counted, so ad spend looks like it is not working.
            </p>
          </div>
        </div>
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">How to fix it</p>
          <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[13.5px] leading-6 text-[#151515]/85 marker:text-[#6B6B60]">
            <li>In Shopify, open Settings → Customer events and check the Facebook &amp; Instagram pixel is connected.</li>
            <li>If you edited the theme recently, look for a removed pixel snippet in theme.liquid.</li>
            <li>Run a manual scan in MyKavo to confirm the pixel is back.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

function WeeklyNoteMock() {
  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
      <div className="flex items-center gap-2 border-b border-black/10 bg-[#FBFAF3] px-5 py-3">
        <span className="inline-flex size-7 items-center justify-center rounded-lg bg-[#FFD400]">
          <CalendarCheck className="size-4" aria-hidden />
        </span>
        <span className="text-[14px] font-semibold">Your site this week</span>
        <span className="ml-auto rounded-full bg-[#E5F6EC] px-2.5 py-0.5 text-[12px] font-bold text-[#166534]">Healthy</span>
      </div>
      <div className="space-y-3 p-5">
        <p className="text-[16px] font-semibold leading-6">A calm week: everything important held steady.</p>
        <p className="text-[13.5px] leading-6 text-[#151515]/85">
          All 7 daily scans finished and the site was up for 99.98% of checks. The one high-severity change, a removed
          canonical tag on /blog, was fixed on Tuesday.
        </p>
        <ul className="space-y-1.5 text-[13.5px] leading-6 text-[#151515]/85">
          {[
            { dot: "#1f9d55", text: "Uptime 99.98% with a 420 ms average response" },
            { dot: "#f97316", text: "2 medium changes on /pricing still open" },
            { dot: "#1f9d55", text: "SSL certificate valid for 61 more days" },
          ].map((h) => (
            <li key={h.text} className="flex items-start gap-2.5">
              <span className="mt-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: h.dot }} aria-hidden />
              {h.text}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function AiWebsiteInsightsPage() {
  const pageJsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebPage",
        "@id": `${site.url}${PATH}#page`,
        url: `${site.url}${PATH}`,
        name: "MyKavo AI Website Insights",
        description: metadata.description,
        about: {
          "@type": "SoftwareApplication",
          name: "MyKavo AI Website Insights",
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          publisher: { "@id": ORGANIZATION_ID },
          featureList: [
            "AI explanation of every detected website change",
            "Platform-specific fix steps (WordPress, Shopify, Webflow and more)",
            "Urgency rating for every alert",
            "AI weekly status summary for every website",
          ],
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
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "AI Website Insights", path: PATH }])) }}
      />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#15151514_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div>
              <p className={`${eyebrow} mb-4 flex items-center gap-2`}>
                <span className="rounded-full bg-[#151515] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#FFD400]">New</span>
                {"// ai website insights //"}
              </p>
              <h1 className={`${fontDisplay} text-[2.4rem] leading-[1.04] min-[360px]:text-5xl sm:text-6xl`}>
                AI Website Insights.
                <br />
                <span className="relative inline-block">
                  <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                  <span className="relative">Every change, explained.</span>
                </span>
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-7 text-[#6B6B60]">
                MyKavo watches your pages around the clock. When something changes, its AI tells you{" "}
                <strong className="text-[#151515]">what happened, what it costs you and exactly how to fix it</strong> -
                in plain English, with steps for WordPress, Shopify, Webflow or whatever your site runs on.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleButton />
                <Link href="/signup" className="text-[13px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]">
                  or sign up with email
                </Link>
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
                Included free · {FREE_EXPLANATIONS} AI explanations a month · No card
              </p>
            </div>
            <div className="rounded-3xl border border-black/10 bg-[#F3F1E6] p-3 sm:p-5">
              <AiInsightsAnimation />
              <p className="mt-2 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative alert and AI answer
              </p>
            </div>
          </div>
        </section>

        {/* Numbers band */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-3 px-5 py-14 sm:gap-4 lg:grid-cols-4 lg:px-8">
            {numbers.map((z) => (
              <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Feature 1: Explain this change */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// explain this change //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>
                From &ldquo;something changed&rdquo; to &ldquo;here&apos;s the fix&rdquo;.
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Every alert gets a card that answers the three questions you would otherwise ask a developer.
                One click on any alert writes it, and it is kept with the alert for the whole team.
              </p>
              <ul className="mt-7 space-y-3">
                {[
                  "A one-line headline anyone on the team understands",
                  "Why it matters: traffic, rankings, tracking or sales",
                  "Fix steps in your platform's own menus and terms",
                  "Act now, check this week, or probably fine",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[15px]">
                    <CheckCircle2 className="mt-0.5 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <ExplanationMock />
              <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                Illustrative explanation
              </p>
            </div>
          </div>
        </section>

        {/* Feature 2: Your site this week */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="order-2 lg:order-1">
                <WeeklyNoteMock />
                <p className="mt-4 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#6B6B60]">
                  Illustrative weekly note
                </p>
              </div>
              <div className="order-1 lg:order-2">
                <p className={`${eyebrow} mb-4`}>{"// your site this week //"}</p>
                <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>
                  The status update, written for you.
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                  Open your dashboard and the first thing you read is a short note on each website&apos;s last 7 days:
                  scans, changes, uptime and certificates, with what needs you first. It is rewritten after every
                  scan and every review, so it always matches what you see below it.
                </p>
                <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                  <span className="font-semibold text-[#151515]">For agencies:</span> it is the paragraph you were going to
                  write for the client anyway.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// how it works //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>Detect. Explain. Fix. Confirm.</h2>
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
          <div className="mt-12 text-center">
            <p className="text-[14px] text-[#6B6B60]">Fix steps written for the platform each page runs on, including</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {PLATFORMS.map((p) => (
                <span key={p} className="rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-[13px] font-medium">
                  {p}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Trust */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// ai you can trust //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Rules find it. <span className="text-[#FFD400]">AI explains it.</span>
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {[
                {
                  icon: ShieldCheck,
                  title: "No invented alerts",
                  desc: "What counts as a change is decided by fixed rules, the same way every time. AI cannot raise an alert, hide one or change its severity.",
                },
                {
                  icon: Lock,
                  title: "Only the change, nothing more",
                  desc: "The AI sees the change details: page address, before and after values, severity. Never passwords, never your dashboard. Not used to train AI models.",
                },
                {
                  icon: Sparkles,
                  title: "Written once, kept",
                  desc: "Each explanation is saved with the alert, so your team reads the same answer and opening it again never uses up your allowance.",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-white/12 bg-white/[0.04] p-6">
                  <c.icon className="size-9 rounded-xl bg-[#FFD400] p-2 text-[#151515]" aria-hidden />
                  <h3 className="mt-4 text-[17px] font-semibold text-[#E9EBDF]">{c.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#9C9E93]">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="bg-white">
          <div className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
            <p className={`${eyebrow} mb-4 text-center`}>{"// on every plan //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] sm:text-5xl`}>AI included. No add-on.</h2>
            <div className="mt-10 overflow-x-auto rounded-2xl border border-black/15">
              <table className="w-full min-w-[520px] border-collapse text-left text-[14px]">
                <thead>
                  <tr className="border-b border-black/15 bg-[#F3F1E6]">
                    <th scope="col" className="px-4 py-3 font-semibold">Plan</th>
                    <th scope="col" className="px-4 py-3 font-semibold">Price</th>
                    <th scope="col" className="px-4 py-3 font-semibold">AI change explanations</th>
                    <th scope="col" className="px-4 py-3 font-semibold">AI weekly notes</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b border-black/10 last:border-b-0">
                      <td className="px-4 py-3 font-medium">{plan.name}</td>
                      <td className="px-4 py-3 text-[#6B6B60]">${plan.priceMonthlyUsd}/month</td>
                      <td className="px-4 py-3 text-[#6B6B60]">
                        {plan.limits.aiExplanationsPerMonth.toLocaleString("en-US")} a month
                      </td>
                      <td className="px-4 py-3 text-[#6B6B60]">Every website</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-5 text-center text-[14px] text-[#6B6B60]">
              Every plan also includes website change monitoring and Site Audit.{" "}
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
              { href: "/#how-it-works", label: "How MyKavo website monitoring works" },
              { href: "/seo-monitoring", label: "SEO monitoring: know when important tags change" },
              { href: "/site-audit", label: "Site Audit: every technical issue, found and sorted" },
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
            <p className={`${eyebrowOnDark} mb-4`}>{"// try it free //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Know what changed.
              <br />
              <span className="text-[#FFD400]">Let AI tell you how to fix it.</span>
            </h2>
            <div className="mt-9 flex flex-col items-center gap-3">
              <GoogleButton onDark />
              <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
                or sign up with email
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#E9EBDF]/70">
              {FREE_EXPLANATIONS} AI explanations a month on the free plan.{" "}
              <Link href="/pricing" className="inline-flex items-center gap-1 underline decoration-[#FFD400] underline-offset-4">
                See plans <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
