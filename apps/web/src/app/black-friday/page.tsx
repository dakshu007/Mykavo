import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BellRing, CreditCard, MousePointerClick, UserPlus } from "lucide-react";
import { withSocial } from "@/lib/social-metadata";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { fontDisplay, fontSans } from "@/components/landing/style";
import { LogoTile } from "@/components/brand/logo";
import { getPlan } from "@/config/plans";
import { SEASONAL_CAMPAIGNS } from "@/config/campaign";
import { yearlyBillingEnabled } from "@/lib/billing/config";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";
import {
  BfHeroStatus,
  BfPricing,
  PriceSlash,
  Reveal,
  ScratchCode,
  TiltTicket,
  type BfPlan,
} from "@/components/black-friday/bf-client";

const PATH = "/black-friday";
const BF = SEASONAL_CAMPAIGNS.find((c) => c.key === "black-friday")!;
const PRO = getPlan("pro");
const OFFER = Math.round(PRO.priceMonthlyUsd * (100 - BF.percent)) / 100;
const CLAIM_HREF = `/signup?next=${encodeURIComponent("/dashboard/billing")}&from=black-friday%3Ahero`;

export const metadata: Metadata = withSocial({
  title: `Black Friday: ${BF.percent}% Off MyKavo Pro Website Monitoring`,
  description: `MyKavo Black Friday sale: Pro website monitoring for $${OFFER}/month for your first ${BF.cycles} months with code ${BF.code}. Visual, SEO, uptime and script changes on 8 websites, checked daily. Until December 15.`,
  keywords: [
    "website monitoring black friday",
    "black friday saas deals",
    "website monitoring deal",
    "mykavo black friday",
    "seo monitoring black friday",
  ],
  alternates: { canonical: PATH },
  // Its own share card: the site-wide default would otherwise win.
  openGraph: { images: [{ url: "/black-friday/og.png", width: 1200, height: 630, alt: "MyKavo Black Friday: 50% off Pro" }] },
  twitter: { images: [{ url: "/black-friday/og.png", width: 1200, height: 630, alt: "MyKavo Black Friday: 50% off Pro" }] },
});

const bfPlan = (id: "starter" | "pro" | "agency"): BfPlan => {
  const p = getPlan(id);
  return { id, name: p.name, headline: p.headline, monthly: p.priceMonthlyUsd, yearly: p.priceYearlyUsd, features: p.features };
};

const showcase = [
  {
    img: "/black-friday/visual.webp",
    w: 1200,
    h: 760,
    title: "See exactly what moved",
    body: "Before and after screenshots with the change outlined, so a missing buy button is obvious in a second.",
  },
  {
    img: "/black-friday/alerts.webp",
    w: 1000,
    h: 760,
    title: "Alerts that matter",
    body: "Critical, high or medium, grouped per scan. Email, Slack or your phone.",
  },
  {
    img: "/black-friday/seo.webp",
    w: 1000,
    h: 660,
    title: "SEO tags that slip",
    body: "A noindex, a lost canonical or a changed title, caught before rankings drop.",
  },
  {
    img: "/black-friday/uptime.webp",
    w: 1000,
    h: 690,
    title: "Uptime, SSL and domains",
    body: "Checked every five minutes, with reminders before a certificate or domain expires.",
  },
];

const steps = [
  { icon: UserPlus, title: "Create your account", body: "Free, with Google or email. Add your first website in a minute." },
  { icon: MousePointerClick, title: "Choose Pro, monthly", body: "Open Billing and pick Pro. The Black Friday price is already there." },
  { icon: CreditCard, title: "Pay half for 3 months", body: `${BF.code} is applied at checkout. $${OFFER}/month, then $${PRO.priceMonthlyUsd}. Cancel anytime.` },
];

const faqs = [
  {
    q: "What is the MyKavo Black Friday deal?",
    a: `${BF.percent}% off MyKavo Pro for your first ${BF.cycles} months: $${OFFER} a month instead of $${PRO.priceMonthlyUsd}, then the regular price. It runs from November 20 until December 15.`,
  },
  {
    q: "Do I need to enter the code?",
    a: `No. When you check out Pro on monthly billing during the sale, ${BF.code} is applied for you. The code is on this page in case you want it.`,
  },
  {
    q: "Does the deal include Starter or Agency?",
    a: "No, Black Friday is a Pro deal. Starter and Agency stay at their regular prices, and every plan can also be paid yearly for 12 months at the price of 10.",
  },
  {
    q: "Can I combine it with yearly billing?",
    a: `The ${BF.percent}% code applies to monthly Pro. Yearly Pro is already discounted: $${PRO.priceYearlyUsd} for 12 months, two months free.`,
  },
  {
    q: "I'm on the free trial. Can I still get it?",
    a: "Yes. Upgrade to Pro from Billing during the sale and the Black Friday price applies. Paying ends the trial and unlocks all 8 websites.",
  },
  {
    q: "What happens after 3 months?",
    a: `Pro continues at $${PRO.priceMonthlyUsd}/month. You can switch plans or cancel anytime from Billing, and you'll get a reminder before each renewal.`,
  },
];

/** Decorative falling tags in the hero, placed deterministically. */
const FALLING = Array.from({ length: 16 }, (_, i) => ({
  text: ["%", "$10", "50%", "OFF", "$", "-50%"][i % 6],
  left: `${(i * 61) % 100}%`,
  dur: `${9 + (i % 5) * 2.2}s`,
  delay: `${-i * 1.3}s`,
  dx: `${((i % 3) - 1) * 60}px`,
  spin: `${(i % 2 ? 1 : -1) * (120 + (i % 4) * 60)}deg`,
  size: 14 + (i % 4) * 6,
  gold: i % 3 !== 1,
}));

const TAPE = ["50% OFF PRO", BF.code, `$${OFFER}/MO FOR ${BF.cycles} MONTHS`, "UNTIL DEC 15", "8 WEBSITES · DAILY SCANS"];

export default function BlackFridayPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#0B0B0B] text-white antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Black Friday", path: PATH }])) }}
      />
      <LandingNav />

      <main className="overflow-x-clip">
        {/* ------------------------------------------------------------ hero */}
        <section className="relative isolate min-h-[100svh] overflow-hidden px-5 pb-24 pt-36 lg:px-8">
          {/* Dot grid, a radar sweep, a moving grid floor and falling tags. */}
          <div aria-hidden className="absolute inset-0 -z-10 [background-image:radial-gradient(rgba(255,207,0,0.14)_1.2px,transparent_1.4px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_80%_70%_at_50%_30%,black,transparent)]" />
          <div aria-hidden className="absolute right-[-20%] top-[-10%] -z-10 size-[1100px] rounded-full bg-[radial-gradient(circle,rgba(255,207,0,0.22),transparent_60%)]" />
          <div aria-hidden className="absolute right-[2%] top-[18%] -z-10 hidden size-[720px] lg:block">
            <div className="bfp-sweep absolute inset-0 rounded-full bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,207,0,0.28)_40deg,transparent_70deg)] [mask-image:radial-gradient(circle,black_30%,transparent_70%)]" />
            <div className="absolute inset-[18%] rounded-full border border-[#FFCF00]/15" />
            <div className="absolute inset-[34%] rounded-full border border-[#FFCF00]/10" />
          </div>
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-10 h-[38vh] [perspective:600px]">
            <div className="bfp-floor absolute inset-x-[-50%] bottom-0 h-[200%] origin-bottom [transform:rotateX(62deg)] [background-image:linear-gradient(rgba(255,207,0,0.35)_1px,transparent_1px),linear-gradient(90deg,rgba(255,207,0,0.35)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_top,black,transparent_70%)]" />
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            {FALLING.map((f, i) => (
              <span
                key={i}
                className={`bfp-fall absolute top-0 font-mono font-black ${f.gold ? "text-[#FFCF00]/70" : "text-white/25"}`}
                style={{
                  left: f.left,
                  fontSize: f.size,
                  ["--dur" as string]: f.dur,
                  ["--delay" as string]: f.delay,
                  ["--dx" as string]: f.dx,
                  ["--spin" as string]: f.spin,
                }}
              >
                {f.text}
              </span>
            ))}
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <p className="bfp-rise flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.32em] text-[#FFCF00]">
                <span className="relative inline-flex size-2.5">
                  <span className="bfp-ping absolute inset-0 rounded-full bg-[#FFCF00]" />
                  <span className="relative size-2.5 rounded-full bg-[#FFCF00]" />
                </span>
                MyKavo Black Friday
              </p>
              <h1
                className={`${fontDisplay} bfp-rise mt-6 text-[3.4rem] leading-[0.92] tracking-[-0.05em] [animation-delay:120ms] min-[400px]:text-[4.2rem] sm:text-[6.2rem] lg:text-[7.2rem]`}
              >
                <span className="block text-transparent [-webkit-text-stroke:2px_#FFCF00]">Black</span>
                <span className="block text-transparent [-webkit-text-stroke:2px_#FFCF00]">Friday.</span>
                <span className="block text-white">
                  Half <span className="text-[#FFCF00]">price.</span>
                </span>
              </h1>
              <p className="bfp-rise mt-7 max-w-xl text-[17px] leading-8 text-white/70 [animation-delay:240ms]">
                MyKavo Pro watches up to 8 websites every day for visual, SEO, uptime, script and conversion changes.
                This Black Friday it&apos;s{" "}
                <strong className="text-white">
                  ${OFFER}/month for your first {BF.cycles} months
                </strong>
                , not ${PRO.priceMonthlyUsd}.
              </p>
              <div className="bfp-rise mt-9 [animation-delay:360ms]">
                <BfHeroStatus claimHref={CLAIM_HREF} />
              </div>
            </div>
            <div className="bfp-rise relative [animation-delay:300ms]">
              <TiltTicket />
            </div>
          </div>
        </section>

        {/* ----------------------------------------------------- crossing tapes */}
        <section aria-hidden className="relative h-56 overflow-hidden">
          {[
            { cls: "rotate-[-4deg] bg-[#FFCF00] text-[#0B0B0B]", speed: "30s", top: "top-12" },
            { cls: "rotate-[3deg] border-y border-[#FFCF00]/50 bg-[#0B0B0B] text-[#FFCF00]", speed: "38s", top: "top-28" },
          ].map((t, i) => (
            <div key={i} className={`absolute inset-x-[-10%] ${t.top} ${t.cls} py-3.5`}>
              <div className="bfp-marquee flex w-max gap-10 whitespace-nowrap font-mono text-[18px] font-black uppercase tracking-[0.18em]" style={{ ["--speed" as string]: t.speed }}>
                {[...TAPE, ...TAPE, ...TAPE, ...TAPE].map((w, k) => (
                  <span key={k} className="flex items-center gap-10">
                    {w}
                    <span>✦</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* ------------------------------------------------------- price slash */}
        <section className="px-5 py-24 text-center lg:px-8">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-[#FFCF00]">The price, cut in half</p>
          <h2 className={`${fontDisplay} mx-auto mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-6xl`}>
            Same Pro. Same 8 websites. Half the bill.
          </h2>
          <div className="mt-14">
            <PriceSlash regular={PRO.priceMonthlyUsd} offer={OFFER} />
          </div>
          <p className="mt-8 text-[16px] text-white/60">
            per month, for your first {BF.cycles} months. Then ${PRO.priceMonthlyUsd}. Cancel anytime.
          </p>
        </section>

        {/* ----------------------------------------------------------- showcase */}
        <section className="mx-auto max-w-7xl px-5 py-20 lg:px-8">
          <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-[#FFCF00]">What ${OFFER} a month watches</p>
          <h2 className={`${fontDisplay} mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-5xl`}>
            Know what changed on every site, before your clients do.
          </h2>
          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {showcase.map((c, i) => (
              <Reveal key={c.img} delay={i * 90}>
                <figure className="group h-full overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.01))] p-5 transition-colors hover:border-[#FFCF00]/50">
                  <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl bg-black/30">
                    <Image
                      src={c.img}
                      alt={c.title}
                      width={c.w}
                      height={c.h}
                      className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03] motion-reduce:transition-none"
                    />
                  </div>
                  <figcaption className="px-2 pb-1 pt-5">
                    <p className="text-[19px] font-semibold text-white">{c.title}</p>
                    <p className="mt-1.5 text-[14.5px] leading-6 text-white/60">{c.body}</p>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </section>

        {/* -------------------------------------------------------------- deal */}
        <section id="deal" className="scroll-mt-24 relative px-5 py-24 lg:px-8">
          <div aria-hidden className="absolute inset-x-0 top-0 -z-10 h-[60%] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,207,0,0.14),transparent)]" />
          <div className="mx-auto max-w-6xl">
            <div className="mb-12 text-center">
              <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-[#FFCF00]">Pick your deal</p>
              <h2 className={`${fontDisplay} mx-auto mt-4 max-w-3xl text-4xl leading-[1.05] sm:text-6xl`}>
                Half price monthly, or two months free yearly.
              </h2>
            </div>
            <BfPricing
              pro={bfPlan("pro")}
              others={[bfPlan("starter"), bfPlan("agency")]}
              yearlyEnabled={yearlyBillingEnabled}
            />
            <p className="mt-8 text-center text-[14px] text-white/50">
              Comparing every feature?{" "}
              <Link href="/pricing" className="font-semibold text-white underline decoration-[#FFCF00] decoration-2 underline-offset-4">
                See all plans
              </Link>
            </p>
          </div>
        </section>

        {/* ------------------------------------------------------------- code */}
        <section className="px-5 py-20 lg:px-8">
          <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-white/[0.03] p-8 text-center sm:p-12">
            <p className="font-mono text-[12px] font-bold uppercase tracking-[0.3em] text-[#FFCF00]">Scratch for your code</p>
            <h2 className={`${fontDisplay} mt-4 text-3xl leading-tight sm:text-4xl`}>A little gold, under the foil.</h2>
            <div className="mt-8">
              <ScratchCode code={BF.code} />
            </div>
          </div>
        </section>

        {/* ------------------------------------------------------------- steps */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.05] sm:text-5xl`}>Claim it in three steps.</h2>
          <ol className="mt-12 grid gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <Reveal key={s.title} delay={i * 120}>
                <li className="relative h-full rounded-[28px] border border-white/10 bg-white/[0.03] p-7">
                  <span className="absolute right-6 top-5 font-mono text-[44px] font-black text-white/[0.06]">0{i + 1}</span>
                  <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-[#FFCF00] text-[#0B0B0B]">
                    <s.icon className="size-6" aria-hidden />
                  </span>
                  <p className="mt-5 text-[19px] font-semibold">{s.title}</p>
                  <p className="mt-2 text-[14.5px] leading-6 text-white/60">{s.body}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* --------------------------------------------------------------- faq */}
        <section className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
          <h2 className={`${fontDisplay} text-4xl leading-[1.05] sm:text-5xl`}>Questions, answered.</h2>
          <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                  {f.q}
                  <span
                    aria-hidden
                    className="grid size-7 shrink-0 place-items-center rounded-full border border-white/20 text-[16px] transition-transform group-open:rotate-45 motion-reduce:transition-none"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[15px] leading-7 text-white/65">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* --------------------------------------------------------------- end */}
        <section className="relative overflow-hidden px-5 pb-28 pt-16 text-center lg:px-8">
          <div aria-hidden className="absolute inset-x-0 bottom-0 -z-0 h-80 bg-[radial-gradient(60%_80%_at_50%_100%,rgba(255,207,0,0.25),transparent)]" />
          <div className="relative mx-auto flex max-w-3xl flex-col items-center">
            <LogoTile size={84} className="bfp-float [--r:0deg]" />
            <h2 className={`${fontDisplay} mt-8 text-5xl leading-[1.02] sm:text-7xl`}>
              Know what changed.
              <br />
              <span className="text-[#FFCF00]">Pay half.</span>
            </h2>
            <div className="mt-10 flex justify-center">
              <BfHeroStatus claimHref={CLAIM_HREF} />
            </div>
            <p className="mt-8 inline-flex items-center gap-2 text-[13px] text-white/50">
              <BellRing className="size-4" aria-hidden /> Pro only, monthly billing. Regular price after {BF.cycles} months.
            </p>
            <Link href="/pricing" className="mt-3 inline-flex items-center gap-1 text-[13px] text-white/60 underline underline-offset-4 hover:text-white">
              Regular pricing <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
