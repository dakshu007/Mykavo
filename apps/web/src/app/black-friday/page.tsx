import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, PenLine } from "lucide-react";
import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { withSocial } from "@/lib/social-metadata";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { fontDisplay, fontSans } from "@/components/landing/style";
import { getPlan } from "@/config/plans";
import { SEASONAL_CAMPAIGNS } from "@/config/campaign";
import {
  breadcrumbList,
  faqPage,
  jsonLdScript,
} from "@/lib/seo/structured-data";
import {
  BfCopyCode,
  BfFaqItem,
  BfHeroStatus,
  BfLink,
  BfSectionTracker,
  Reveal,
} from "@/components/black-friday/bf-client";

const PATH = "/black-friday";
const BF = SEASONAL_CAMPAIGNS.find((c) => c.key === "black-friday")!;
const PRO = getPlan("pro");
const OFFER = Math.round(PRO.priceMonthlyUsd * (100 - BF.percent)) / 100;
const SAVED = Math.round((PRO.priceMonthlyUsd - OFFER) * BF.cycles);
const SITES = PRO.limits.websites;
const POSTS = AGENT_LIMITS.pro.posts;
const money = (n: number) =>
  Number.isInteger(n) ? `$${n}` : `$${n.toFixed(2)}`;

export const metadata: Metadata = withSocial({
  title: `Black Friday: ${BF.percent}% Off MyKavo Pro Website Monitoring`,
  description: `MyKavo Black Friday sale: Pro website monitoring and the AI Blog Writer for ${money(OFFER)}/month for your first ${BF.cycles} months with code ${BF.code}. Visual, SEO, uptime and script changes on ${SITES} websites, checked daily. Until December 15.`,
  keywords: [
    "website monitoring black friday",
    "black friday saas deals",
    "website monitoring deal",
    "mykavo black friday",
    "seo monitoring black friday",
  ],
  alternates: { canonical: PATH },
  // Its own share card: the site-wide default would otherwise win.
  openGraph: {
    images: [
      {
        url: "/black-friday/og.png",
        width: 1200,
        height: 630,
        alt: "MyKavo Black Friday: 50% off Pro",
      },
    ],
  },
  twitter: {
    images: [
      {
        url: "/black-friday/og.png",
        width: 1200,
        height: 630,
        alt: "MyKavo Black Friday: 50% off Pro",
      },
    ],
  },
});

const faqs = [
  {
    q: "What is the MyKavo Black Friday deal?",
    a: `${BF.percent}% off MyKavo Pro for your first ${BF.cycles} months: ${money(OFFER)} a month instead of ${money(PRO.priceMonthlyUsd)}, then the regular price. It runs until December 15.`,
  },
  {
    q: "Do I need to type the code?",
    a: `No. When you check out Pro on monthly billing during the sale, ${BF.code} is applied for you. The code is on this page in case you want it.`,
  },
  {
    q: "Does the deal include Starter or Agency?",
    a: "No, Black Friday is a Pro deal. Starter and Agency stay at their regular prices, and every plan can also be paid yearly for 12 months at the price of 10.",
  },
  {
    q: "Can I combine it with yearly billing?",
    a: `The ${BF.percent}% code applies to monthly Pro. Yearly Pro is already discounted: ${money(PRO.priceYearlyUsd)} for 12 months, two months free.`,
  },
  {
    q: "I'm on the Free plan. Can I still get it?",
    a: `Yes. Upgrade to Pro from Billing during the sale and the Black Friday price applies. Pro unlocks all ${SITES} websites and ${POSTS} AI blog posts a month.`,
  },
  {
    q: `What happens after ${BF.cycles} months?`,
    a: `Pro continues at ${money(PRO.priceMonthlyUsd)}/month. You can switch plans or cancel anytime from Billing, and you'll get a reminder before each renewal.`,
  },
];

const TAPE = [
  `${BF.percent}% OFF PRO`,
  BF.code,
  `${money(OFFER)}/MO FOR ${BF.cycles} MONTHS`,
  "ENDS DEC 15",
  `${SITES} WEBSITES`,
  `${POSTS} AI POSTS A MONTH`,
];

const steps = [
  {
    title: "Create your account",
    body: "Free, with Google or email. Add your first website in a minute.",
  },
  {
    title: "Pick Pro, monthly",
    body: "Open Billing. The Black Friday price is already waiting there.",
  },
  {
    title: `Pay ${money(OFFER)}, not ${money(PRO.priceMonthlyUsd)}`,
    body: `For your first ${BF.cycles} months. Then ${money(PRO.priceMonthlyUsd)}. Cancel anytime.`,
  },
];

const eyebrow =
  "font-mono text-[12px] font-bold uppercase tracking-[0.24em] text-[#FFCF00]";
const h2 = `${fontDisplay} text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.03em] sm:text-[3.75rem]`;
const card =
  "rounded-[32px] border border-[#222] bg-[#0B0B0B] transition-[transform,border-color] duration-300 hover:-translate-y-1 hover:border-[#FFCF00]/45 motion-reduce:transition-none";

export default function BlackFridayPage() {
  return (
    <div
      className={`${fontSans} min-h-svh bg-[#050505] text-[#F5F2E8] antialiased`}
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(
            breadcrumbList([{ name: "Black Friday", path: PATH }]),
          ),
        }}
      />
      <BfSectionTracker />
      <LandingNav />

      <main className="overflow-x-clip">
        {/* ------------------------------------------------------------ hero */}
        <section
          id="hero"
          data-bf-section="hero"
          className="scroll-mt-24 px-5 pb-10 pt-32 lg:px-8 lg:pt-40"
        >
          <div className="mx-auto grid max-w-[1200px] items-center gap-10 lg:grid-cols-2">
            <div className="relative z-10">
              <p className="bfp-rise inline-flex items-center gap-2.5 rounded-full border border-[#FFCF00]/35 bg-[#FFCF00]/[0.08] py-2 pl-3 pr-3.5 font-mono text-[12px] font-bold uppercase tracking-[0.2em] text-[#FFCF00]">
                <span className="relative inline-flex size-2">
                  <span className="bfp-ping absolute inset-0 rounded-full bg-[#FFCF00]" />
                  <span className="relative size-2 rounded-full bg-[#FFCF00]" />
                </span>
                Black Friday · ends Dec 15
              </p>
              <h1
                className={`${fontDisplay} bfp-rise mt-6 text-[4rem] font-bold leading-[0.92] tracking-[-0.045em] [animation-delay:120ms] min-[420px]:text-[4.6rem] sm:text-[6.4rem] lg:text-[6rem] xl:text-[7rem]`}
              >
                <span className="bfp-gold block whitespace-nowrap">Half price.</span>
                <span className="block whitespace-nowrap">Full watch.</span>
              </h1>
              <p className="bfp-rise mt-7 max-w-[520px] text-[18px] leading-[1.6] text-[#B9B4A6] [animation-delay:240ms] sm:text-[19px]">
                MyKavo Pro watches up to {SITES} websites every day, alerts you
                the moment something breaks, and writes your next blog post.{" "}
                <strong className="text-[#F5F2E8]">
                  {money(OFFER)} a month for your first {BF.cycles} months.
                </strong>
              </p>
              <div className="bfp-rise mt-9 [animation-delay:360ms]">
                <BfHeroStatus />
              </div>
            </div>

            <div className="bfp-rise relative min-h-[360px] [animation-delay:300ms] sm:min-h-[520px]">
              <div
                aria-hidden
                className="bfp-glow absolute inset-[8%_6%] rounded-full bg-[radial-gradient(closest-side,rgba(255,207,0,0.32),transparent)]"
              />
              <Image
                src="/black-friday/bag.webp"
                alt="A black shopping bag overflowing with gold: a magnifying glass, a radar dish, a browser window and coins"
                width={840}
                height={720}
                priority
                sizes="(min-width: 1024px) 600px, 100vw"
                className="bfp-img bfp-float relative mx-auto h-auto w-full max-w-[640px]"
              />
              <div
                className="bfp-float absolute left-0 top-[12%] rounded-[20px] border border-[#FFCF00]/35 bg-[#141414]/75 px-4 py-3 backdrop-blur-md sm:px-5 sm:py-3.5"
                style={{
                  ["--r" as string]: "-8deg",
                  ["--float" as string]: "7s",
                  ["--float-delay" as string]: "-2s",
                }}
              >
                <p className="font-mono text-[10.5px] tracking-[0.16em] text-[#8C877A]">
                  PRO, MONTHLY
                </p>
                <p
                  className={`${fontDisplay} mt-1 text-[28px] font-bold leading-none sm:text-[34px]`}
                >
                  <span className="text-[20px] text-[#6E6A60] line-through decoration-[#FF5A4E] decoration-2 sm:text-[22px]">
                    {money(PRO.priceMonthlyUsd)}
                  </span>{" "}
                  <span className="bfp-gold">{money(OFFER)}</span>
                </p>
              </div>
              <div
                className="bfp-float absolute bottom-[10%] right-[2%] flex size-[96px] flex-col items-center justify-center rounded-full bg-[#FFCF00] text-[#0A0A0A] shadow-[0_20px_50px_rgba(255,207,0,0.35)] sm:size-[112px]"
                style={{
                  ["--r" as string]: "7deg",
                  ["--float" as string]: "5s",
                  ["--float-delay" as string]: "-1s",
                }}
              >
                <span
                  className={`${fontDisplay} text-[30px] font-bold leading-none sm:text-[34px]`}
                >
                  {BF.percent}%
                </span>
                <span className="font-mono text-[11px] font-bold tracking-[0.2em]">
                  OFF
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ tape */}
        <section
          id="tape"
          data-bf-section="tape"
          aria-label={`${BF.percent}% off Pro with ${BF.code}, until December 15`}
          className="relative my-10 h-24"
        >
          <div className="absolute inset-x-[-4%] top-6 -rotate-2 bg-[#FFCF00] py-4 text-[#0A0A0A]">
            <div
              aria-hidden
              className="bfp-marquee flex w-max gap-10 whitespace-nowrap font-mono text-[16px] font-bold uppercase tracking-[0.16em] sm:text-[18px]"
            >
              {[...TAPE, ...TAPE, ...TAPE, ...TAPE].map((w, k) => (
                <span key={k} className="flex items-center gap-10">
                  {w}
                  <span>✦</span>
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ math */}
        <section
          id="math"
          data-bf-section="math"
          className="scroll-mt-24 px-5 py-24 lg:px-8"
        >
          <div className="mx-auto grid max-w-[1200px] items-center gap-16 lg:grid-cols-2">
            <div>
              <p className={eyebrow}>The math</p>
              <h2 className={`${h2} mt-4`}>
                Same Pro.
                <br />
                Half the bill.
              </h2>
              <p className="mt-6 max-w-[460px] text-[18px] leading-[1.6] text-[#B9B4A6]">
                Nothing is cut from the plan. You get every Pro feature for{" "}
                {money(OFFER)} a month for {BF.cycles} months, then the regular{" "}
                {money(PRO.priceMonthlyUsd)}. Cancel anytime from Billing.
              </p>
              <dl className="mt-9 grid max-w-[500px] grid-cols-3 gap-3">
                {[
                  {
                    v: money(SAVED),
                    l: `saved over ${BF.cycles} months`,
                    gold: true,
                  },
                  { v: String(SITES), l: "websites watched" },
                  { v: String(POSTS), l: "AI posts a month" },
                ].map((s) => (
                  <div
                    key={s.l}
                    className="rounded-[20px] border border-[#222] bg-[#0C0C0C] p-4 sm:p-5"
                  >
                    <dt className="sr-only">{s.l}</dt>
                    <dd
                      className={`${fontDisplay} text-[28px] font-bold sm:text-[34px] ${s.gold ? "bfp-gold" : ""}`}
                    >
                      {s.v}
                    </dd>
                    <p
                      aria-hidden
                      className="mt-1 text-[12.5px] leading-snug text-[#8C877A] sm:text-[13px]"
                    >
                      {s.l}
                    </p>
                  </div>
                ))}
              </dl>
              <BfLink
                section="math"
                label="claim"
                className="mt-9 inline-flex h-[54px] items-center gap-2 rounded-full bg-[#FFCF00] px-6 text-[16px] font-bold text-[#0A0A0A] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
              >
                Pay {money(OFFER)} a month{" "}
                <ArrowRight
                  className="size-[18px]"
                  strokeWidth={2.6}
                  aria-hidden
                />
              </BfLink>
            </div>

            <div className="flex justify-center">
              <div
                className="bfp-float w-[380px] max-w-full"
                style={{ ["--r" as string]: "3deg" }}
              >
                <div className="bfp-receipt bg-[#F7F3E8] px-8 pb-9 pt-10 font-mono text-[#141414] shadow-[0_40px_80px_rgba(0,0,0,0.6)]">
                  <p className="text-center text-[15px] font-bold tracking-[0.3em]">
                    MYKAVO
                  </p>
                  <p className="mt-1 text-center text-[11px] text-[#5E5A4E]">
                    BLACK FRIDAY RECEIPT
                  </p>
                  <div className="my-5 border-t-2 border-dashed border-[#CFC9B8]" />
                  {[
                    ["Pro plan, monthly", `$${PRO.priceMonthlyUsd.toFixed(2)}`],
                    [`${SITES} websites, daily`, "incl."],
                    [`AI Writer, ${POSTS} posts`, "incl."],
                  ].map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between py-1.5 text-[14px]"
                    >
                      <span>{k}</span>
                      <span>{v}</span>
                    </div>
                  ))}
                  <div className="flex justify-between py-1.5 text-[14px] text-[#B3261E]">
                    <span>{BF.code}</span>
                    <span>-${(PRO.priceMonthlyUsd - OFFER).toFixed(2)}</span>
                  </div>
                  <div className="my-4 border-t-2 border-dashed border-[#CFC9B8]" />
                  <div className="flex items-baseline justify-between">
                    <span className="text-[14px] font-bold">YOU PAY</span>
                    <span className={`${fontDisplay} text-[40px] font-bold`}>
                      {money(OFFER)}
                    </span>
                  </div>
                  <p className="text-right text-[11px] text-[#5E5A4E]">
                    per month, first {BF.cycles} months
                  </p>
                  <div
                    aria-hidden
                    className="mx-auto mt-6 h-[46px] w-[82%] bg-[repeating-linear-gradient(90deg,#141414_0_2px,transparent_2px_5px,#141414_5px_6px,transparent_6px_9px,#141414_9px_12px,transparent_12px_14px)]"
                  />
                  <p className="mt-2.5 text-center text-[11px] tracking-[0.2em] text-[#5E5A4E]">
                    THANK YOU · VALID TO DEC 15
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ---------------------------------------------------------- inside */}
        <section
          id="inside"
          data-bf-section="inside"
          className="scroll-mt-24 px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-[1200px]">
            <p className={eyebrow}>What {money(OFFER)} a month gets you</p>
            <h2 className={`${h2} mt-4 max-w-[760px]`}>
              A golden watchdog for every site you run.
            </h2>

            <div className="mt-12 grid gap-[18px] md:grid-cols-2 lg:grid-cols-3">
              <Reveal className="md:col-span-2 lg:col-span-3">
                <article
                  className={`${card} grid items-center gap-3 bg-[radial-gradient(120%_120%_at_100%_0%,rgba(255,207,0,0.10),transparent_55%),#0B0B0B] p-7 sm:p-9 lg:grid-cols-2`}
                >
                  <div>
                    <p className="inline-block rounded-full bg-[#FFCF00]/[0.12] px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.16em] text-[#FFCF00]">
                      DAILY SCANS
                    </p>
                    <h3
                      className={`${fontDisplay} mt-5 text-[30px] font-semibold leading-[1.1] tracking-[-0.02em] sm:text-[36px]`}
                    >
                      It notices what you don&apos;t.
                    </h3>
                    <p className="mt-4 max-w-[460px] text-[17px] leading-[1.65] text-[#B9B4A6]">
                      Every day MyKavo checks your pages against an approved
                      baseline: a missing buy button, a page that went noindex,
                      a broken link or a slow load. You see the before and
                      after, and decide.
                    </p>
                    <ul className="mt-6 flex flex-wrap gap-2">
                      {[
                        "Visual changes",
                        "SEO tags",
                        "Broken links",
                        "Scripts",
                        "Buttons and forms",
                      ].map((t) => (
                        <li
                          key={t}
                          className="rounded-full border border-[#2A2A2A] px-3.5 py-2 text-[13.5px]"
                        >
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <Image
                    src="/black-friday/watchdog.webp"
                    alt="A golden robot dog with a radar antenna watching three website windows, one with a red warning"
                    width={940}
                    height={720}
                    sizes="(min-width: 1024px) 560px, 100vw"
                    className="bfp-img h-auto w-full"
                  />
                </article>
              </Reveal>

              <Reveal delay={80}>
                <article className={`${card} flex h-full flex-col p-7`}>
                  <Image
                    src="/black-friday/bell.webp"
                    alt="A golden bell with a lightning bolt, circled by alert cards"
                    width={840}
                    height={720}
                    sizes="360px"
                    className="bfp-img mx-auto -mt-2 h-auto w-full max-w-[360px]"
                  />
                  <h3
                    className={`${fontDisplay} mt-1 text-[24px] font-semibold`}
                  >
                    Alerts that matter
                  </h3>
                  <p className="mt-2.5 text-[15.5px] leading-[1.6] text-[#B9B4A6]">
                    Critical and high changes reach you by email, Slack or your
                    phone. Grouped per scan, never one email per tiny tweak.
                  </p>
                </article>
              </Reveal>

              <Reveal delay={160}>
                <article className={`${card} flex h-full flex-col gap-4 p-7`}>
                  <div className="rounded-[22px] border border-[#262626] bg-[#141414] p-[18px]">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-[34px] place-items-center rounded-full bg-[#FFCF00]">
                        <PenLine
                          className="size-4 text-[#0A0A0A]"
                          strokeWidth={2.4}
                          aria-hidden
                        />
                      </span>
                      <div>
                        <p className="text-[14px] font-bold">
                          best espresso beans for home
                        </p>
                        <p className="text-[12px] text-[#8C877A]">
                          High demand · you rank #14
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#262626]">
                      <div className="h-2 w-[72%] rounded-full bg-[#FFCF00]" />
                    </div>
                    <p className="mt-2.5 font-mono text-[12px] text-[#FFCF00]">
                      Writing... My-Kaa-Vooo!
                    </p>
                  </div>
                  <h3 className={`${fontDisplay} text-[24px] font-semibold`}>
                    {POSTS} AI blog posts a month
                  </h3>
                  <p className="text-[15.5px] leading-[1.6] text-[#B9B4A6]">
                    Keyword ideas from your own search data, posts written for
                    them, saved straight to your WordPress drafts.
                  </p>
                  <Link
                    href="/ai-blog-writer"
                    className="mt-auto text-[14px] font-semibold text-[#FFCF00] underline-offset-4 hover:underline"
                  >
                    See the AI Blog Writer
                  </Link>
                </article>
              </Reveal>

              <Reveal delay={240}>
                <article className={`${card} flex h-full flex-col gap-3.5 p-7`}>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      ["Uptime", "every 5 min"],
                      ["SSL", "expiry alerts"],
                      ["Domain", "renewal alerts"],
                      ["Speed", "page weight"],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="rounded-[18px] border border-[#262626] bg-[#141414] p-4"
                      >
                        <p className="font-mono text-[11px] uppercase text-[#8C877A]">
                          {k}
                        </p>
                        <p className="mt-1.5 text-[15px] font-bold">{v}</p>
                      </div>
                    ))}
                  </div>
                  <h3 className={`${fontDisplay} text-[24px] font-semibold`}>
                    Uptime, SSL and domains
                  </h3>
                  <p className="text-[15.5px] leading-[1.6] text-[#B9B4A6]">
                    Checked every five minutes, with a reminder before a
                    certificate or domain runs out.
                  </p>
                </article>
              </Reveal>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------ code */}
        <section
          id="code"
          data-bf-section="code"
          className="scroll-mt-24 px-5 py-16 lg:px-8"
        >
          <div className="mx-auto grid max-w-[1200px] items-center gap-6 overflow-hidden rounded-[40px] border border-[#FFCF00]/30 bg-[radial-gradient(80%_120%_at_0%_50%,rgba(255,207,0,0.16),transparent_60%),#0A0A0A] p-7 sm:p-12 lg:grid-cols-2">
            <Image
              src="/black-friday/gift.webp"
              alt="An open black gift box with gold light and a golden ticket rising out of it"
              width={760}
              height={720}
              sizes="(min-width: 1024px) 460px, 100vw"
              className="bfp-img bfp-float mx-auto h-auto w-full max-w-[460px]"
            />
            <div>
              <p className={eyebrow}>Your golden ticket</p>
              <h2
                className={`${fontDisplay} mt-4 text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[3.25rem]`}
              >
                One code. Half off.
              </h2>
              <p className="mt-4 max-w-[440px] text-[17px] leading-[1.6] text-[#B9B4A6]">
                It is applied for you when you pick Pro, monthly, at checkout.
                Here it is anyway.
              </p>
              <div className="mt-7">
                <BfCopyCode code={BF.code} />
              </div>
              <BfLink
                section="code"
                label="claim"
                className="mt-6 inline-flex items-center gap-1.5 text-[15px] font-semibold text-[#F5F2E8] underline decoration-[#FFCF00] decoration-2 underline-offset-4"
              >
                Use it now <ArrowRight className="size-4" aria-hidden />
              </BfLink>
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- steps */}
        <section
          id="steps"
          data-bf-section="steps"
          className="scroll-mt-24 px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-[1200px]">
            <h2
              className={`${fontDisplay} text-center text-[2.25rem] font-semibold tracking-[-0.03em] sm:text-[3.25rem]`}
            >
              Claim it in three steps.
            </h2>
            <ol className="mt-12 grid gap-[18px] md:grid-cols-3">
              {steps.map((s, i) => (
                <li key={s.title}>
                  <Reveal delay={i * 100} className="h-full">
                    <div
                      className={`h-full rounded-[28px] border p-7 ${
                        i === 2
                          ? "border-[#FFCF00]/40 bg-[linear-gradient(160deg,rgba(255,207,0,0.12),#0B0B0B_60%)]"
                          : "border-[#222] bg-[#0B0B0B]"
                      }`}
                    >
                      <span
                        className={`${fontDisplay} bfp-gold text-[56px] font-bold leading-none`}
                      >
                        0{i + 1}
                      </span>
                      <p className="mt-5 text-[20px] font-bold">{s.title}</p>
                      <p className="mt-2 text-[15px] leading-[1.6] text-[#B9B4A6]">
                        {s.body}
                      </p>
                    </div>
                  </Reveal>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex justify-center">
              <BfLink
                section="steps"
                label="claim"
                className="bfp-shine inline-flex h-[56px] items-center gap-2 rounded-full bg-[#FFCF00] px-7 text-[16px] font-bold text-[#0A0A0A]"
              >
                Start step 1, it&apos;s free{" "}
                <ArrowRight
                  className="size-[18px]"
                  strokeWidth={2.6}
                  aria-hidden
                />
              </BfLink>
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- faq */}
        <section
          id="faq"
          data-bf-section="faq"
          className="scroll-mt-24 px-5 py-20 lg:px-8"
        >
          <div className="mx-auto max-w-[880px]">
            <h2
              className={`${fontDisplay} text-[2.25rem] font-semibold tracking-[-0.03em] sm:text-[3.25rem]`}
            >
              Questions, answered.
            </h2>
            <div className="mt-8 flex flex-col gap-2.5">
              {faqs.map((f, i) => (
                <BfFaqItem key={f.q} q={f.q} a={f.a} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------------- claim */}
        <section
          id="claim"
          data-bf-section="claim"
          className="relative scroll-mt-24 overflow-hidden px-5 pb-28 pt-12 text-center lg:px-8"
        >
          <div
            aria-hidden
            className="bfp-glow absolute bottom-[-200px] left-1/2 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,207,0,0.28),transparent)]"
          />
          <div className="relative mx-auto flex max-w-[1040px] flex-col items-center">
            <Image
              src="/black-friday/bag.webp"
              alt=""
              width={840}
              height={720}
              sizes="300px"
              className="bfp-img bfp-float h-auto w-[260px] sm:w-[300px]"
              style={{ ["--float" as string]: "7s" }}
            />
            <h2
              className={`${fontDisplay} mt-2 text-[3rem] font-bold leading-[0.98] tracking-[-0.04em] sm:text-[4.5rem] lg:text-[5.5rem]`}
            >
              Know what changed.
              <br />
              <span className="bfp-gold">Pay half.</span>
            </h2>
            <BfLink
              section="claim"
              label="claim"
              className="bfp-shine mt-9 inline-flex h-[62px] items-center gap-2.5 rounded-full bg-[#FFCF00] px-8 text-[18px] font-bold text-[#0A0A0A] shadow-[0_18px_50px_rgba(255,207,0,0.3)]"
            >
              Start monitoring for {money(OFFER)}{" "}
              <ArrowRight
                className="size-[18px]"
                strokeWidth={2.6}
                aria-hidden
              />
            </BfLink>
            <p className="mt-6 inline-flex items-center gap-2 text-[13.5px] text-[#8C877A]">
              <BellRing className="size-4" aria-hidden /> Pro only, monthly
              billing. Regular price after {BF.cycles} months. Ends December 15.
            </p>
            <Link
              href="/pricing"
              className="mt-3 inline-flex items-center gap-1 text-[13px] text-[#B9B4A6] underline underline-offset-4 hover:text-[#F5F2E8]"
            >
              All plans and yearly pricing{" "}
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
