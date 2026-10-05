import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Code2,
  Eye,
  FileText,
  Gauge,
  Link2Off,
  Lock,
  MousePointerClick,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { AnswerCapsule } from "@/components/landing/answer-capsule";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { ChromeExtensionAnimation } from "@/components/landing/chrome-extension-animation";
import { ChromeMark, ChromeStoreButton } from "@/components/landing/chrome-store-button";
import { TrackOnView } from "@/components/track-on-view";
import { site } from "@/config/site";
import {
  CHROME_EXTENSION_PAGE_PATH,
  CHROME_EXTENSION_VERSION,
  CHROME_MIN_VERSION,
  CHROME_STORE_URL,
} from "@/config/chrome-extension";
import { ORGANIZATION_ID, breadcrumbList, faqPage, jsonLdScript, organizationNode } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Chrome Extension - Instant SEO Check + One-Click Website Monitoring",
  description:
    "The free MyKavo Chrome extension checks any page's SEO in one click, right in your browser, and connects the website to MyKavo monitoring with one more. Status, critical changes and scans, wherever you browse.",
  keywords: [
    "SEO checker Chrome extension",
    "website monitoring Chrome extension",
    "on-page SEO checker",
    "meta tag checker extension",
    "website change monitoring extension",
    "SEO extension for agencies",
  ],
  alternates: { canonical: CHROME_EXTENSION_PAGE_PATH },
  openGraph: {
    title: "MyKavo for Chrome - check any page, protect it in one click",
    description:
      "An instant on-page SEO check that runs in your browser, and one-click website monitoring with MyKavo. Free.",
    url: CHROME_EXTENSION_PAGE_PATH,
    images: [{ url: "/chrome/connect.webp", width: 2000, height: 1520 }],
  },
};

const stats = [
  { value: "1", label: "click for a full on-page SEO check" },
  { value: "0", label: "pages sent anywhere to check them" },
  { value: "1", label: "more click to protect the website" },
  { value: "24/7", label: "monitoring in the cloud, browser closed" },
];

const checks = [
  "Title tag",
  "Meta description",
  "Canonical",
  "Indexable (noindex)",
  "HTTPS",
  "Mixed content",
  "Meta refresh",
  "H1 heading",
  "Mobile viewport",
  "Language",
  "Favicon",
  "Open Graph",
  "Twitter card",
  "Structured data",
  "Image alt text",
  "Content depth",
  "Internal links",
];

const watches: Array<{ icon: typeof Zap; name: string; desc: string }> = [
  { icon: Zap, name: "Uptime", desc: "Down, 5xx and SSL checks every few minutes." },
  { icon: Search, name: "SEO", desc: "Titles, canonicals, noindex, redirects." },
  { icon: FileText, name: "Content", desc: "Text that changed, line by line." },
  { icon: Eye, name: "Visual", desc: "Before-and-after screenshots with a diff." },
  { icon: Link2Off, name: "Links", desc: "Internal links that start to 404." },
  { icon: Code2, name: "Scripts", desc: "Analytics, tag manager and payment scripts." },
  { icon: Gauge, name: "Performance", desc: "Page weight, requests, response time." },
  { icon: Target, name: "Conversion", desc: "Signup, cart and checkout buttons." },
];

const companion = [
  "A status the moment you open the extension on a protected site: Protected, Needs attention, Critical changes or Site down.",
  "Critical changes, 7-day uptime and this page's SEO score at a glance.",
  "Scan now after a deploy, and Open MyKavo for the before-and-after evidence. On-demand scans come with Pro and Agency.",
  "The toolbar badge lights up only when the site is down or has a critical change. No counts, no noise.",
  "Right-click any page and choose Monitor this page with MyKavo - handy when you look after many sites.",
];

const steps = [
  {
    step: "01",
    title: "Press Protect",
    desc: "On any website, open MyKavo and press Protect. MyKavo opens in a new tab with the website already filled in.",
  },
  {
    step: "02",
    title: "Sign in or sign up",
    desc: "Use your MyKavo login, Google, or create a free account in a minute. Already signed in? It's one click.",
  },
  {
    step: "03",
    title: "Monitoring starts",
    desc: "Pick the pages to watch - the one you were on comes first - and MyKavo takes the first baseline straight away.",
  },
];

const privacy = [
  "The SEO check runs entirely in your browser. The page's content, address and title never leave it for the check.",
  "MyKavo is contacted only when you ask: Protect, Scan now, Open MyKavo, or opening the extension on a site you connected.",
  "Connecting uses an OAuth-style approval with PKCE on mykavo.app. The extension never sees your password.",
  "It holds a key for each connected website that can show its status and start scans - nothing else. Disconnect any time from the menu.",
  "Anonymous usage counts (never a web address) help us improve it, and switch off in one click. No browsing history, ever.",
];

const faqs = [
  {
    q: "Is the MyKavo Chrome extension free?",
    a: "Yes. The extension is free, and so is the on-page SEO check - no account needed. Connecting a website uses your MyKavo plan, and MyKavo has a free plan: one website, five monitored pages and weekly scans, with no card required. On-demand scans from the extension come with Pro and Agency.",
  },
  {
    q: "Does the extension send the pages I check anywhere?",
    a: "No. The SEO check runs inside your browser on the page you're looking at, and nothing about that page is sent to MyKavo or anyone else. MyKavo is only contacted when you press Protect, Scan now or Open MyKavo, or open the extension on a website you've connected.",
  },
  {
    q: "Do I need to keep Chrome open for monitoring to work?",
    a: "No. Monitoring runs on MyKavo's servers around the clock. The extension is a shortcut to it: it shows the status when you visit, and alerts arrive by email (and Slack, Discord or webhooks if you set them up) whether Chrome is open or not.",
  },
  {
    q: "Is it a full SEO crawler?",
    a: "No - and it doesn't pretend to be. The extension checks the page you're on, instantly. Site-wide monitoring, page discovery and before-and-after comparisons happen in MyKavo once you protect the website. For a crawl of the whole site, MyKavo also has a Site Audit.",
  },
  {
    q: "What permissions does it need, and why?",
    a: "activeTab and scripting to read the page you click the icon on (only then), storage to remember the websites you connected, contextMenus for the one right-click action, and access to mykavo.app to talk to your MyKavo account. It does not ask to read every website you visit.",
  },
  {
    q: "Does it work in Edge, Brave or Arc?",
    a: `It is built for Chrome ${CHROME_MIN_VERSION} and newer. Browsers built on Chromium, such as Edge, Brave and Arc, can install extensions from the Chrome Web Store too.`,
  },
  {
    q: "How do I disconnect a website?",
    a: "Open the extension on that website, open the menu (the three dots) and choose Disconnect. The website stays monitored in MyKavo; only this browser's connection is removed.",
  },
];

const extensionJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "SoftwareApplication",
      "@id": `${site.url}${CHROME_EXTENSION_PAGE_PATH}#extension`,
      name: "MyKavo - SEO & Website Monitor",
      applicationCategory: "BrowserApplication",
      applicationSubCategory: "Chrome extension",
      operatingSystem: `Chrome ${CHROME_MIN_VERSION}+`,
      softwareVersion: CHROME_EXTENSION_VERSION,
      ...(CHROME_STORE_URL ? { installUrl: CHROME_STORE_URL, sameAs: [CHROME_STORE_URL] } : {}),
      url: `${site.url}${CHROME_EXTENSION_PAGE_PATH}`,
      description: metadata.description,
      screenshot: `${site.url}/chrome/connect.webp`,
      publisher: { "@id": ORGANIZATION_ID },
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
  ],
};

function Check({ children, dark = false }: { children: React.ReactNode; dark?: boolean }) {
  return (
    <li className={`flex items-start gap-3 text-[15px] leading-7 ${dark ? "text-[#E9EBDF]" : "text-[#151515]/90"}`}>
      <CheckCircle2 className="mt-1 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function Popup({ src, alt, w, h, className = "" }: { src: string; alt: string; w: number; h: number; className?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={w}
      height={h}
      sizes="(min-width: 1024px) 360px, 80vw"
      className={`h-auto w-full max-w-[360px] rounded-[14px] border border-[#151515] ${className}`}
    />
  );
}

export default function ChromeExtensionPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(extensionJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Chrome extension", path: CHROME_EXTENSION_PAGE_PATH }])),
        }}
      />
      <TrackOnView event="chrome_extension_viewed" />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#151515] bg-white py-1.5 pl-1.5 pr-4 shadow-[3px_3px_0_#151515]">
              <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#151515] text-[#FFD400]">
                <ChromeMark className="size-4.5" />
              </span>
              <span className="text-[13px] font-semibold">MyKavo for Chrome</span>
              <span className="rounded-full bg-[#FFD400] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.1em]">
                New
              </span>
            </div>
            <p className={`${eyebrow} mb-4`}>{"// seo & website monitor //"}</p>
            <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}>
              Check any page.
              <br />
              <span className="relative inline-block whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                <span className="relative">Protect it in one click.</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#6B6B60]">
              The MyKavo extension checks the SEO of any page the moment you click it - right in your
              browser - then connects the website to MyKavo monitoring with one more click. No URLs to
              copy, nothing to configure.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ChromeStoreButton placement="hero" />
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#F3F1E6]"
              >
                Create a free account
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
              Free · Chrome {CHROME_MIN_VERSION}+ · Checks run locally · v{CHROME_EXTENSION_VERSION}
            </p>
          </div>

          <div className="mx-auto mt-16 max-w-6xl">
            <ChromeExtensionAnimation />
            <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#6B6B60]">
              Illustrative walkthrough · the screens and wording are the extension&apos;s own
            </p>
          </div>
        </section>

        <AnswerCapsule
          className="mx-auto max-w-4xl px-5 pb-16 lg:px-8"
          question="What is the MyKavo Chrome extension?"
          answer="MyKavo - SEO & Website Monitor is a free Chrome extension that runs an instant on-page SEO check on any page, locally in your browser, and connects that website to MyKavo website monitoring in one click. Once connected, it shows the site's monitoring status, critical changes and uptime whenever you visit, and can start a scan. The monitoring itself runs in the cloud, so Chrome doesn't need to stay open."
          facts={[
            { label: "Price", value: "Free extension, and a free MyKavo plan" },
            { label: "Page check", value: "17 on-page checks, run locally" },
            { label: "Connect", value: "One click, with the site filled in" },
            { label: "Works in", value: `Chrome ${CHROME_MIN_VERSION}+ and Chromium browsers` },
          ]}
        />

        {/* Stats band */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// the shortest path to a monitored website //"}</p>
            <h2 className={`${fontDisplay} text-center text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              From &ldquo;is this page OK?&rdquo;
              <br />
              <span className="text-[#FFD400]">to &ldquo;tell me if it ever isn&apos;t.&rdquo;</span>
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {stats.map((z) => (
                <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                  <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                  <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Instant check */}
        <section id="instant-check" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// the instant check //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                A score in one click.
                <br />
                <span className="text-[#6B6B60]">A fix for every result.</span>
              </h2>
              <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#6B6B60]">
                Click MyKavo on any page for an SEO health score out of 100. Issues come first, then
                warnings, with passed checks folded away - and every result says exactly what to fix,
                with the real value shown.
              </p>
              <ul className="mt-8 flex flex-wrap gap-2" aria-label="The 17 on-page checks">
                {checks.map((c) => (
                  <li
                    key={c}
                    className="rounded-full border border-[#151515]/15 bg-white px-3 py-1.5 text-[13px] font-medium text-[#151515]"
                  >
                    {c}
                  </li>
                ))}
              </ul>
              <p className="mt-6 flex items-center gap-2 text-sm text-[#6B6B60]">
                <Lock className="size-4 text-[#151515]" aria-hidden />
                Runs in your browser. No account needed, nothing sent anywhere.
              </p>
            </div>
            <div className="flex justify-center gap-5">
              <Popup
                src="/chrome/popup-ready.webp"
                alt="The MyKavo extension on a page: SEO health 94, Looking excellent, 15 passed and 2 warnings, with a Protect this website card"
                w={800}
                h={1200}
                className="shadow-[10px_10px_0_#FFD400,10px_10px_0_1px_#151515]"
              />
            </div>
          </div>
        </section>

        {/* Protect flow */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// one-click protect //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              No copying URLs. No setup.
              <br />
              <span className="text-[#6B6B60]">Just Protect.</span>
            </h2>
            <div className="relative mt-16 grid gap-x-8 gap-y-12 sm:grid-cols-3">
              <div aria-hidden className="absolute left-0 right-0 top-[22px] hidden border-t-2 border-dashed border-[#151515]/15 sm:block" />
              {steps.map((s) => (
                <div key={s.step} className="relative">
                  <span className="relative inline-flex items-center justify-center rounded-full border border-[#151515] bg-[#FFD400] px-4 py-2 font-mono text-[13px] font-semibold shadow-[3px_3px_0_#151515]">
                    {s.step}
                  </span>
                  <h3 className={`${fontDisplay} mt-5 text-[22px] leading-snug text-[#151515]`}>{s.title}</h3>
                  <p className="mt-2.5 text-[14px] leading-6.5 text-[#6B6B60]">{s.desc}</p>
                </div>
              ))}
            </div>
            <div className="mx-auto mt-14 max-w-4xl overflow-hidden rounded-2xl border border-[#151515] bg-white shadow-[8px_8px_0_#151515]">
              <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#F3F1E6] px-3 py-2" aria-hidden>
                <span className="size-2 rounded-full bg-[#151515]/20" />
                <span className="size-2 rounded-full bg-[#151515]/20" />
                <span className="size-2 rounded-full bg-[#151515]/20" />
                <span className="ml-2 truncate rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] text-[#6B6B60]">
                  mykavo.app/connect/chrome
                </span>
              </div>
              <Image
                src="/chrome/connect.webp"
                alt="The MyKavo connect page opened by the extension: Protect example.org, with what the extension will be able to do and an Add and protect button"
                width={2000}
                height={1520}
                sizes="(min-width: 1024px) 896px, 100vw"
                className="h-auto w-full"
              />
            </div>
          </div>
        </section>

        {/* Companion */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div className="order-2 grid grid-cols-2 items-start gap-4 lg:order-1">
              <Popup
                src="/chrome/popup-protected.webp"
                alt="A protected website in the extension: Protected, 0 critical, 100% uptime over 7 days, SEO 91, with Open MyKavo and Scan now"
                w={800}
                h={1022}
                className="shadow-[6px_6px_0_#151515]"
              />
              <Popup
                src="/chrome/popup-critical.webp"
                alt="The same website after a critical change: Critical changes, 1 critical of 2 open"
                w={800}
                h={1022}
                className="mt-10 shadow-[6px_6px_0_#E5484D,6px_6px_0_1px_#151515]"
              />
            </div>
            <div className="order-1 lg:order-2">
              <p className={`${eyebrow} mb-4`}>{"// wherever you browse //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                Your site&apos;s status,
                <br />
                <span className="text-[#6B6B60]">one click away.</span>
              </h2>
              <ul className="mt-8 space-y-3.5">
                {companion.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* What MyKavo watches */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// once protected //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              Everything MyKavo watches,
              <br />
              <span className="text-[#6B6B60]">around the clock.</span>
            </h2>
            <div className="mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-black/10 bg-black/10 lg:grid-cols-4">
              {watches.map((w) => (
                <div key={w.name} className="bg-white p-6 sm:p-7">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-[#151515] bg-[#FFD400]">
                    <w.icon className="size-5 text-[#151515]" aria-hidden />
                  </span>
                  <h3 className={`${fontDisplay} mt-5 text-[19px] text-[#151515]`}>{w.name}</h3>
                  <p className="mt-1.5 text-[14px] leading-6 text-[#6B6B60]">{w.desc}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-center text-sm text-[#6B6B60]">
              Alerts by email, Slack, Discord or webhook - grouped, ranked by severity, and built to stay quiet.
            </p>
          </div>
        </section>

        {/* Privacy */}
        <section className="border-b border-[#151515] bg-[#151515]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
            <div>
              <p className={`${eyebrowOnDark} mb-4`}>{"// private by design //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
                It reads one page.
                <br />
                <span className="text-[#FFD400]">Only when you click.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#A3A397]">
                No access to every site you visit, no browsing history, no page content sent anywhere.
                Read exactly what it handles in the{" "}
                <Link href="/privacy#chrome-extension" className="font-semibold text-[#E9EBDF] underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  privacy policy
                </Link>
                .
              </p>
            </div>
            <ul className="space-y-3.5">
              {privacy.map((p) => (
                <Check key={p} dark>
                  {p}
                </Check>
              ))}
            </ul>
          </div>
        </section>

        {/* Shortcuts row */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { icon: MousePointerClick, title: "Right-click to monitor", desc: "“Monitor this page with MyKavo” on any page, for agencies adding client sites." },
              { icon: RefreshCw, title: "Scan after a deploy", desc: "Press Scan now and open the running scan in MyKavo (Pro and Agency)." },
              { icon: Bell, title: "A badge that means it", desc: "The toolbar icon only flags a site that's down or has a critical change." },
            ].map((c) => (
              <div key={c.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <c.icon className="size-5 text-[#151515]" aria-hidden />
                <h3 className={`${fontDisplay} mt-4 text-[18px] text-[#151515]`}>{c.title}</h3>
                <p className="mt-1.5 text-[14px] leading-6 text-[#6B6B60]">{c.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-5 pb-20 lg:pb-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}>Extension questions.</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-black/10 bg-white px-6 py-5 transition-colors open:border-[#151515] open:pb-6 open:shadow-[4px_4px_0_#151515]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-[#6B6B60] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-[#151515] bg-[#FFD400] px-6 py-14 text-center shadow-[10px_10px_0_#151515] sm:px-12">
            <ShieldCheck className="mx-auto size-10 text-[#151515]" aria-hidden />
            <h2 className={`${fontDisplay} mt-5 text-3xl leading-tight text-[#151515] sm:text-5xl`}>
              Know what changed.
              <br />
              Fix what matters.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#151515]/75">
              Check your next page in one click, and protect the websites you care about in one more.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <ChromeStoreButton placement="footer" variant="ink" />
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
              >
                Start monitoring free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}
