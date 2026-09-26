import type { Metadata } from "next";
import Link from "next/link";
import { AnswerCapsule } from "@/components/landing/answer-capsule";
import {
  Apple,
  ArrowRight,
  Bell,
  BellOff,
  CalendarClock,
  Fingerprint,
  Gauge,
  Globe,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  Moon,
  MousePointerClick,
  PlusCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { AppSyncAnimation } from "@/components/landing/app-sync-animation";
import { AndroidTabsShowcase } from "@/components/landing/android-tabs-showcase";
import { PhoneMock, PhoneMockStyles } from "@/components/landing/app-download";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { RequestAppButton } from "@/components/landing/request-app-dialog";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { LogoMark } from "@/components/brand/logo";
import { TrackOnView } from "@/components/track-on-view";
import { ANDROID_APP_PAGE_PATH, ANDROID_MIN_VERSION } from "@/config/android-app";
import { site } from "@/config/site";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Android App - Website Monitoring in Your Pocket",
  description:
    "The MyKavo Android app mirrors your dashboard live: push alerts for critical changes, triage and approve changes, run scans and add websites from your phone. Free on every plan.",
  keywords: [
    "website monitoring app Android",
    "website change alerts on phone",
    "website monitoring push notifications",
    "monitor websites from phone",
    "SEO change alerts app",
    "uptime and change monitoring Android",
  ],
  alternates: { canonical: ANDROID_APP_PAGE_PATH },
  openGraph: {
    title: "MyKavo for Android - your websites, in your pocket",
    description:
      "Push alerts, one-tap triage and live sync with the web dashboard. Know what changed and fix what matters, from anywhere.",
    url: ANDROID_APP_PAGE_PATH,
  },
};

const stats = [
  { value: "5", label: "tabs - the whole dashboard, rebuilt for your thumb" },
  { value: "3s", label: "refresh while a scan runs, on web and phone alike" },
  { value: "0", label: "extra accounts - the same login, 2FA included" },
  { value: "$0", label: "for the app, on every MyKavo plan" },
];

const features: Array<{ icon: typeof Bell; title: string; desc: string; wide?: boolean }> = [
  {
    icon: Bell,
    title: "Push alerts that matter",
    desc: "Critical and high-severity changes reach your lock screen the moment a scan finds them. Tap the notification and you land on the change itself.",
    wide: true,
  },
  {
    icon: MousePointerClick,
    title: "One-tap decisions",
    desc: "Approve, approve and update the baseline, mark reviewed, resolve, ignore or reopen - the same actions as the web.",
  },
  {
    icon: ScanLine,
    title: "Run a scan anywhere",
    desc: "Start a scan from the site's page and watch it progress live. Approve an entire scan when every change was expected.",
  },
  {
    icon: PlusCircle,
    title: "Add a website",
    desc: "Paste an address, MyKavo finds the pages, you choose which to monitor. No laptop needed.",
  },
  {
    icon: BellOff,
    title: "Mute or pause",
    desc: "Mute a site's alerts for 1, 8 or 24 hours during a deploy, or pause monitoring altogether.",
  },
  {
    icon: CalendarClock,
    title: "Domain expiry and stack",
    desc: "When each domain expires, how urgent it is, and the technologies each site runs on.",
  },
  {
    icon: Gauge,
    title: "Uptime, speed and SSL",
    desc: "Uptime over 24 hours and 7 days, average response time, and how many days each certificate has left.",
  },
  {
    icon: LineChart,
    title: "Search Console on the go",
    desc: "Clicks, impressions, CTR and average position for your connected Search Console properties, a tap away in Settings.",
    wide: true,
  },
  {
    icon: Moon,
    title: "Built to feel native",
    desc: "Swipe between tabs, pull to refresh, light and dark mode that follows your phone - or not.",
    wide: true,
  },
];

const syncPoints = [
  {
    icon: KeyRound,
    title: "One account",
    desc: "Sign in with the same account as mykavo.app, including two-factor authentication. Your websites, plan and settings are already there.",
  },
  {
    icon: RefreshCw,
    title: "Live in both directions",
    desc: "Resolve a change on your phone and the dashboard follows. Start a scan on the web and the app shows it running. Every action goes through the same routes the web uses.",
  },
  {
    icon: Layers,
    title: "Nothing to reconcile",
    desc: "There is no separate phone copy of your data. The app reads your workspace directly, refreshing when you open it and every few seconds while a scan runs.",
  },
];

const steps = [
  {
    step: "01",
    title: "Create your free account",
    desc: "Continue with Google or use an email address. The download lives in your dashboard, so you need an account first.",
  },
  {
    step: "02",
    title: "Request the app",
    desc: "Ask with the same email address as your account - approval is tied to it. We approve testers in batches while the app is in review.",
  },
  {
    step: "03",
    title: "Install and sign in",
    desc: "When you are approved we email you a link, and the download appears in your dashboard. Install it, sign in, done.",
  },
];

const trust = [
  {
    icon: ShieldCheck,
    title: "Official signed build",
    desc: "Built and signed by our release pipeline and served over HTTPS. Always the latest version.",
  },
  {
    icon: Lock,
    title: "Secure storage",
    desc: "Your session is kept in Android's encrypted secure storage, never in plain files.",
  },
  {
    icon: Fingerprint,
    title: "Same protected login",
    desc: "The same sign-in as the web, two-factor authentication and trusted devices included.",
  },
  {
    icon: Smartphone,
    title: `Android ${ANDROID_MIN_VERSION}+`,
    desc: "Installs in under a minute on nearly every Android phone in use today.",
  },
];

const faqs = [
  {
    q: "Is the MyKavo Android app free?",
    a: "Yes. The app is free on every MyKavo plan, including the free plan. Your plan decides what you monitor - how many websites and pages, and how often they are scanned - not whether you can use the app.",
  },
  {
    q: "Why do I have to request it?",
    a: "The app is not on Google Play yet. While it is in review we approve testers in batches, which keeps downloads fast and lets us look after every early user. Request it with the same email address as your MyKavo account; when you are approved you get an email, and the download appears in your dashboard.",
  },
  {
    q: "Which notifications will I get?",
    a: "Push alerts for critical and high-severity changes, as soon as a scan finds them. You turn them on per device in the app's Settings, where you can also send a test notification. Email and Slack alerts keep working as they do today.",
  },
  {
    q: "Can I do everything the web dashboard does?",
    a: "Most of what you do day to day: review and act on changes, run and approve scans, add websites, mute alerts, pause monitoring, and check uptime, domain expiry and Search Console. Billing and the deeper settings stay on mykavo.app, and the app links you there.",
  },
  {
    q: "Is there an iPhone app?",
    a: "Not yet. The app is built so it can run on iPhone too, and an iOS version is coming. Until then the web dashboard works well in a phone browser.",
  },
  {
    q: "Does it work with two-factor authentication?",
    a: "Yes. The app uses the same sign-in as mykavo.app, including two-factor codes and trusted devices.",
  },
];

const appJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "MobileApplication",
      "@id": `${site.url}${ANDROID_APP_PAGE_PATH}#app`,
      name: "MyKavo for Android",
      applicationCategory: "BusinessApplication",
      operatingSystem: `Android ${ANDROID_MIN_VERSION}+`,
      url: `${site.url}${ANDROID_APP_PAGE_PATH}`,
      description: metadata.description,
      featureList: features.map((f) => `${f.title}: ${f.desc}`),
      publisher: { "@id": ORGANIZATION_ID },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

/** Both hero actions, side by side: request the app, or start with an account. */
function HeroActions({ placement }: { placement: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
        <RequestAppButton source={`android_page_${placement}`} />
        <GoogleButton onDark />
      </div>
      <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9C9E93]">
        <span>Free on every plan</span>
        <span aria-hidden>·</span>
        <span>Android {ANDROID_MIN_VERSION}+</span>
        <span aria-hidden>·</span>
        <span className="inline-flex items-center gap-1.5">
          <Apple className="size-3.5" aria-hidden />
          iOS coming soon
        </span>
      </p>
    </div>
  );
}

export default function AndroidAppPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Android app", path: ANDROID_APP_PAGE_PATH }])),
        }}
      />
      <TrackOnView event="android_app_viewed" />
      <PhoneMockStyles />
      <LandingNav />

      <main>
        {/* Hero - ink, with the web <-> phone animation */}
        <section className="relative overflow-hidden bg-[#151515]">
          <div
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[900px] max-w-[140vw] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,212,0,0.13),transparent)]"
          />
          <div className="relative mx-auto max-w-6xl px-5 pb-20 pt-32 sm:pt-40 lg:px-8 lg:pb-24">
            <div className="mx-auto max-w-3xl text-center">
              <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-1.5 text-[12px] font-medium text-[#E9EBDF]">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full rounded-full bg-[#FFD400] opacity-70 motion-safe:animate-ping" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#FFD400]" />
                </span>
                MyKavo for Android · early access
              </p>
              <h1 className={`${fontDisplay} text-[42px] leading-[1.03] text-[#E9EBDF] sm:text-6xl lg:text-7xl`}>
                Your websites,
                <br />
                <span className="relative inline-block whitespace-nowrap">
                  <span
                    aria-hidden
                    className="absolute inset-x-[-8px] bottom-[6%] top-[12%] -rotate-1 rounded-md bg-[#FFD400]"
                  />
                  <span className="relative text-[#151515]">in your pocket.</span>
                </span>
              </h1>
              <p className="mx-auto mt-7 max-w-2xl text-[16px] leading-7 text-[#9C9E93] sm:text-[17px] sm:leading-8">
                The MyKavo app mirrors your dashboard live. Get a push the moment something
                important breaks, see exactly what changed, and fix what matters - from the
                couch, the train or the client meeting.
              </p>
            </div>

            {/* Tablet and desktop: the sync animation. Phones: the phone mock,
                because the full scene shrinks past readable. */}
            <div className="mx-auto mt-14 hidden max-w-5xl md:block">
              <AppSyncAnimation />
            </div>
            <div className="mt-12 flex flex-col items-center gap-6 md:hidden">
              <div className="relative" aria-hidden>
                <span className="ad-pulse absolute inset-0 rounded-full border-2 border-[#FFD400]" />
                <span className="relative flex size-12 items-center justify-center rounded-full border border-[#151515] bg-white shadow-[4px_4px_0_#FFD400]">
                  <LogoMark size={24} />
                </span>
              </div>
              <PhoneMock />
            </div>

            <div className="mt-12">
              <HeroActions placement="hero" />
            </div>
          </div>

          {/* Stats */}
          <div className="relative border-t border-white/10">
            <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4">
              {stats.map((s, i) => (
                <div
                  key={s.label}
                  className={`px-5 py-8 lg:px-8 ${i % 2 === 1 ? "border-l border-white/10" : ""} ${
                    i >= 2 ? "border-t border-white/10 lg:border-t-0" : ""
                  } ${i === 2 ? "lg:border-l" : ""}`}
                >
                  <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{s.value}</p>
                  <p className="mt-2 text-[13px] leading-5 text-[#9C9E93]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <AnswerCapsule
          className="mx-auto max-w-4xl px-5 pt-16 lg:px-8 lg:pt-20"
          question="What is the MyKavo Android app?"
          answer="The MyKavo Android app puts your website monitoring on your phone: push alerts for critical and high-severity changes, plus the tools to review changes, run and approve scans, add websites and pause monitoring. It is free on every MyKavo plan, including Free, and available by request while it is in Google Play review."
          facts={[
            { label: "Price", value: "Free on every plan" },
            { label: "Alerts", value: "Push for critical and high-severity changes" },
            { label: "Availability", value: "By request - Google Play listing coming" },
            { label: "iPhone", value: "Coming later; the web dashboard works on phones" },
          ]}
        />

        {/* Tour of the five tabs */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="mb-14 max-w-2xl">
            <p className={`${eyebrow} mb-4`}>{"// a tour of the app //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              The whole dashboard.
              <br />
              <span className="text-[#6B6B60]">Rebuilt for your thumb.</span>
            </h2>
            <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
              Five tabs in a floating bar at the bottom of the screen - swipe between them or tap.
              Pick one to see it.
            </p>
          </div>
          <AndroidTabsShowcase />
        </section>

        {/* Feature bento */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// what you can do //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Everything you need <span className="text-[#6B6B60]">between desks.</span>
            </h2>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.title}
                  className={`group rounded-2xl border border-black/10 bg-white p-6 transition-all hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[5px_5px_0_#151515] ${
                    f.wide ? "lg:col-span-2" : ""
                  }`}
                >
                  <span className="inline-flex size-11 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400] shadow-[2px_2px_0_#151515]">
                    <f.icon className="size-5 text-[#151515]" aria-hidden />
                  </span>
                  <h3 className="mt-5 text-[17px] font-semibold text-[#151515]">{f.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sync, explained */}
        <section className="relative overflow-hidden bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <div className="grid items-center gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
              <div>
                <p className={`${eyebrowOnDark} mb-4`}>{"// always in sync //"}</p>
                <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
                  Not a companion app.
                  <br />
                  <span className="text-[#FFD400]">The same dashboard.</span>
                </h2>
                <p className="mt-5 max-w-md text-[15px] leading-7 text-[#9C9E93]">
                  Whatever you do on one screen is already done on the other. Start on your laptop,
                  finish on your phone - nothing to sync, nothing to reconcile.
                </p>
              </div>
              <div className="space-y-3">
                {syncPoints.map((p, i) => (
                  <div key={p.title} className="flex gap-5 rounded-2xl border border-white/10 bg-white/[0.04] p-5 sm:p-6">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FFD400]">
                      <p.icon className="size-5 text-[#151515]" aria-hidden />
                    </span>
                    <div>
                      <p className="flex items-baseline gap-2.5">
                        <span className="font-mono text-[10px] font-semibold text-[#9C9E93]">0{i + 1}</span>
                        <span className="text-[16px] font-semibold text-[#E9EBDF]">{p.title}</span>
                      </p>
                      <p className="mt-1.5 text-[14px] leading-6 text-[#9C9E93]">{p.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* How to get it */}
        <section id="get-the-app" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// get the app //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
            Three steps. <span className="text-[#6B6B60]">About two minutes.</span>
          </h2>
          <div className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-3">
            <div aria-hidden className="absolute left-0 right-0 top-[22px] hidden border-t-2 border-dashed border-[#151515]/15 sm:block" />
            {steps.map((s) => (
              <div key={s.step} className="relative">
                <span className="relative inline-flex items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] px-4 py-2 font-mono text-[13px] font-bold text-[#151515] shadow-[3px_3px_0_#151515]">
                  {s.step}
                </span>
                <h3 className={`${fontDisplay} mt-5 text-[22px] leading-snug text-[#151515]`}>{s.title}</h3>
                <p className="mt-2.5 text-[14px] leading-6.5 text-[#6B6B60]">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-14 flex max-w-3xl flex-col items-center gap-4 rounded-[24px] border border-[#151515] bg-[#151515] px-6 py-10 shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <HeroActions placement="steps" />
          </div>
        </section>

        {/* Security */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrow} mb-4 text-center`}>{"// safe and secured //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Built like the web app. <span className="text-[#6B6B60]">Locked down like it too.</span>
            </h2>
            <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map((t) => (
                <div key={t.title} className="rounded-2xl border border-black/10 bg-[#FBFAF3] p-6">
                  <t.icon className="size-6 text-[#151515]" aria-hidden />
                  <p className="mt-4 text-[16px] font-semibold text-[#151515]">{t.title}</p>
                  <p className="mt-1.5 text-[14px] leading-6 text-[#6B6B60]">{t.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-5 py-20 lg:py-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <h2 className={`${fontDisplay} mb-10 text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
            Questions, answered.
          </h2>
          <div className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden
                    className="flex size-6 shrink-0 items-center justify-center rounded-full border border-black/15 text-[14px] transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-[14px] leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 lg:px-8">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-16 text-center shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <div
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-0 h-72 w-[640px] max-w-[160%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,212,0,0.16),transparent)]"
            />
            <span className="relative mx-auto flex size-14 items-center justify-center rounded-2xl border border-white/15 bg-white">
              <LogoMark size={30} />
            </span>
            <h2 className={`${fontDisplay} relative mx-auto mt-6 max-w-xl text-3xl leading-tight text-[#E9EBDF] sm:text-5xl`}>
              Know what changed. <span className="text-[#FFD400]">Wherever you are.</span>
            </h2>
            <p className="relative mx-auto mb-9 mt-4 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              Request the app, and start monitoring on the web today - it will all be waiting on
              your phone.
            </p>
            <div className="relative">
              <HeroActions placement="final" />
            </div>
            <p className="relative mt-8 text-[13px] text-[#9C9E93]">
              <Link href="/" className="inline-flex items-center gap-1.5 underline decoration-[#FFD400] decoration-2 underline-offset-4 hover:text-[#E9EBDF]">
                <Globe className="size-3.5" aria-hidden />
                See everything MyKavo monitors
                <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
