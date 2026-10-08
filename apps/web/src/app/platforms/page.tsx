import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight, ArrowUpRight, BellRing, CheckCircle2, Globe, KeyRound, Rocket, ShieldCheck, Sparkles } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { ChromeMark } from "@/components/landing/chrome-store-button";
import { BRANDED_PLATFORM_MARK, BrandGlyph, isBrandedPlatform } from "@/components/landing/platform-marks";
import { PlatformsOrbitAnimation } from "@/components/landing/platforms-orbit-animation";
import { PlatformsRelayAnimation } from "@/components/landing/platforms-relay-animation";
import { TrackOnView } from "@/components/track-on-view";
import { site } from "@/config/site";
import { PLATFORMS, PLATFORMS_PAGE_PATH, STATUS_LABEL, platformsByStatus, type Platform } from "@/config/platforms";
import { WP_PLUGIN_DIRECTORY_URL } from "@/config/wordpress-plugin";
import { WEBSITE_ID, breadcrumbList, faqPage, jsonLdScript, organizationNode } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Platforms - Where MyKavo Works: Web, WordPress, Chrome, Android, AI Assistants",
  description:
    "MyKavo website monitoring works where you do: the web app, a WordPress plugin, a Chrome extension, an MCP server for AI assistants, deploy hooks for CI, an Android app by request, and a Shopify app coming soon.",
  keywords: [
    "website monitoring platforms",
    "WordPress website monitoring plugin",
    "website monitoring Chrome extension",
    "website monitoring MCP server",
    "website monitoring Android app",
    "Shopify website monitoring",
    "post-deploy website check",
  ],
  alternates: { canonical: PLATFORMS_PAGE_PATH },
  openGraph: {
    title: "MyKavo platforms - one monitor, everywhere you work",
    description:
      "Web, WordPress, Chrome, AI assistants and deploy pipelines today. Android by request. Shopify coming soon. One MyKavo account behind all of them.",
    url: PLATFORMS_PAGE_PATH,
  },
};

const liveCount = platformsByStatus("live").length;
const requestCount = platformsByStatus("request").length;
const soonCount = platformsByStatus("soon").length;

const stats = [
  { value: String(liveCount), label: "platforms live today" },
  { value: String(requestCount), label: "available by request" },
  { value: String(soonCount), label: "coming soon, built and in review" },
  { value: "1", label: "MyKavo account behind all of them" },
];

const marquee = PLATFORMS.map((p) => `${p.name} · ${STATUS_LABEL[p.status]}`);

const picks: Array<{ who: string; use: string; why: string; href: string; icon: Platform["id"] }> = [
  {
    who: "I look after client WordPress sites",
    use: "WordPress plugin",
    why: "A check after every plugin, theme and core update, naming the one that broke something.",
    href: "/wordpress-plugin",
    icon: "wordpress",
  },
  {
    who: "I am auditing a page right now",
    use: "Chrome extension",
    why: "An instant on-page SEO check in your browser, then one click to protect the site.",
    href: "/chrome-extension",
    icon: "chrome",
  },
  {
    who: "I want alerts on my phone",
    use: "Android app",
    why: "Push notifications and your changes in your pocket. Access is by request.",
    href: "/android-app",
    icon: "android",
  },
  {
    who: "I ship through CI or a host",
    use: "Deploy pipelines",
    why: "Call a deploy hook after a release and get a verdict from a fresh scan.",
    href: "/pricing",
    icon: "deploy",
  },
  {
    who: "I live in an AI assistant",
    use: "AI assistants",
    why: "Ask Claude, Cursor or any MCP client which site needs attention. Read-only.",
    href: "/signup",
    icon: "ai",
  },
  {
    who: "I run a Shopify store",
    use: "The web app, today",
    why: "Monitor any Shopify store from mykavo.app now. The Shopify app is coming soon.",
    href: "/website-monitoring-for-shopify",
    icon: "shopify",
  },
];

const principles = [
  {
    icon: KeyRound,
    title: "One account, every surface",
    body: "The plugin and the extension connect with an approval on mykavo.app, the Android app signs in with the same account, and assistants use a per-workspace key you can revoke.",
  },
  {
    icon: BellRing,
    title: "The same quiet alerts",
    body: "Changes are grouped, ranked by severity and sent where you chose. A platform adds a way in, never extra noise.",
  },
  {
    icon: ShieldCheck,
    title: "Plans per workspace",
    body: "There is no per-platform fee. Start on the free plan with one website, then add websites and daily scans when you need them.",
  },
];

const faqs = [
  {
    q: "Where is MyKavo available?",
    a: "In your browser at mykavo.app, as a WordPress plugin on WordPress.org, as a Chrome extension on the Chrome Web Store, as an MCP server for AI assistants, and as a deploy hook for CI. The Android app is available by request, and the Shopify app is coming soon.",
  },
  {
    q: "Do I need to install anything to use MyKavo?",
    a: "No. Everything starts at mykavo.app, and any website can be monitored from there. The WordPress plugin and Chrome extension are optional shortcuts that add things a website alone cannot, such as a check after each WordPress update or an instant SEO check on the page you are viewing.",
  },
  {
    q: "Do the platforms share one account?",
    a: "Yes. The WordPress plugin and Chrome extension connect to your MyKavo account through an approval on mykavo.app, so there is no separate login. The Android app uses the same account, and AI assistants connect with a per-workspace API key you can revoke at any time.",
  },
  {
    q: "Can I get the Android app today?",
    a: "Access is by request. Ask for it on the Android app page, and once it is approved the download appears in your MyKavo dashboard.",
  },
  {
    q: "When will the Shopify app be available?",
    a: "It is built and waiting for Shopify's App Store review, so there is no date to promise. You can monitor any Shopify store from mykavo.app today with nothing to install.",
  },
  {
    q: "Does using more platforms cost extra?",
    a: "No. Plans are per workspace, not per platform. The free plan covers one website, five monitored pages and weekly scans, and the paid plans add more websites and daily scans. A few features, such as deploy hooks, come with the paid plans.",
  },
  {
    q: "Can an AI assistant change anything in my account?",
    a: "No. The MyKavo MCP server is read-only. An assistant can tell you what changed, which website needs attention and what the latest audit says, but it cannot edit, scan or delete anything.",
  },
];

const pageJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "CollectionPage",
      "@id": `${site.url}${PLATFORMS_PAGE_PATH}#page`,
      name: "MyKavo platforms",
      url: `${site.url}${PLATFORMS_PAGE_PATH}`,
      description: metadata.description,
      isPartOf: { "@id": WEBSITE_ID },
      mainEntity: {
        "@type": "ItemList",
        itemListElement: PLATFORMS.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${p.name} (${STATUS_LABEL[p.status]})`,
          url: `${site.url}${p.href}`,
        })),
      },
    },
  ],
};

const FOCUS = "focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#FFD400]";

function PlatformIcon({ id, className = "size-5" }: { id: Platform["id"]; className?: string }) {
  if (isBrandedPlatform(id)) return <BrandGlyph slug={BRANDED_PLATFORM_MARK[id]} className={className} />;
  switch (id) {
    case "web":
      return <Globe className={className} aria-hidden />;
    case "chrome":
      return <ChromeMark className={className} />;
    case "ai":
      return <Sparkles className={className} aria-hidden />;
    case "deploy":
      return <Rocket className={className} aria-hidden />;
    default:
      return null;
  }
}

/** Real marks sit on a white tile in their own colours; MyKavo's own icons stay on gold. */
function tileClass(id: Platform["id"]) {
  return isBrandedPlatform(id) ? "bg-white" : "bg-[#FFD400] text-[#151515]";
}

function StatusChip({ status }: { status: Platform["status"] }) {
  if (status === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD400] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#151515]">
        <span className="relative flex size-1.5">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#151515] opacity-50 motion-reduce:animate-none" />
          <span className="relative inline-flex size-1.5 rounded-full bg-[#151515]" />
        </span>
        {STATUS_LABEL.live}
      </span>
    );
  }
  if (status === "request") {
    return (
      <span className="inline-flex items-center rounded-full border border-[#FFD400] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#FFD400]">
        {STATUS_LABEL.request}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-dashed border-[#9C9E93] px-2.5 py-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.1em] text-[#C9CBBE]">
      {STATUS_LABEL.soon}
    </span>
  );
}

function PlatformCard({ p, index, wide = false }: { p: Platform; index: number; wide?: boolean }) {
  const soon = p.status === "soon";
  return (
    <article
      id={p.id}
      className={`group relative flex scroll-mt-28 flex-col rounded-3xl border p-6 transition-all duration-200 sm:p-7 ${
        soon
          ? "border-dashed border-white/25 bg-[#11110F] hover:border-[#FFD400]"
          : "border-white/14 bg-[#161614] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:border-[#FFD400] hover:shadow-[6px_6px_0_#FFD400]"
      } ${wide ? "lg:col-span-2" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex size-12 items-center justify-center rounded-2xl border border-[#FFD400]/70 ${tileClass(p.id)}`}>
          <PlatformIcon id={p.id} className="size-6" />
        </span>
        <div className="flex flex-col items-end gap-2">
          <StatusChip status={p.status} />
          <span className="font-mono text-[11px] tracking-[0.14em] text-[#9C9E93]">{String(index + 1).padStart(2, "0")}</span>
        </div>
      </div>
      <p className="mt-6 font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#FFD400]">{p.chip}</p>
      <h3 className={`${fontDisplay} mt-2 text-[26px] leading-tight text-[#F2F2EA] sm:text-[30px]`}>{p.name}</h3>
      <p className="mt-2 text-[15px] leading-6 text-[#A3A397]">{p.tagline}</p>
      <ul className={`mt-5 gap-x-8 gap-y-2.5 ${wide ? "grid sm:grid-cols-2" : "space-y-2.5"}`}>
        {p.points.map((pt) => (
          <li key={pt} className="flex items-start gap-3 text-[14.5px] leading-6 text-[#E9EBDF]">
            <CheckCircle2 className="mt-0.5 size-[18px] shrink-0 text-[#FFD400]" aria-hidden />
            <span>{pt}</span>
          </li>
        ))}
      </ul>
      <Link
        href={p.href}
        className={`mt-7 inline-flex w-fit items-center gap-2 border-b-2 border-[#FFD400] pb-0.5 text-[14px] font-semibold text-[#FFD400] transition-colors hover:text-[#fff3b0] ${FOCUS}`}
      >
        {p.cta}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
      </Link>
    </article>
  );
}

function SectionHead({ eyebrow, children, sub }: { eyebrow: string; children: ReactNode; sub?: string }) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className={`${eyebrowOnDark} mb-4`}>{`// ${eyebrow} //`}</p>
      <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#F2F2EA] sm:text-5xl`}>{children}</h2>
      {sub && <p className="mx-auto mt-5 max-w-2xl text-[15px] leading-7 text-[#A3A397]">{sub}</p>}
    </div>
  );
}

function Strip() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {marquee.map((m) => (
        <span key={m} className="flex items-center whitespace-nowrap">
          <span className="px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-[#151515]">{m}</span>
          <span className="size-1.5 rounded-full bg-[#151515]" />
        </span>
      ))}
    </div>
  );
}

export default function PlatformsPage() {
  const web = PLATFORMS.find((p) => p.id === "web")!;
  const rest = PLATFORMS.filter((p) => p.id !== "web");
  return (
    <div className={`${fontSans} min-h-svh overflow-x-clip bg-[#0C0C0B] text-[#F2F2EA] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(pageJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Platforms", path: PLATFORMS_PAGE_PATH }])) }}
      />
      <TrackOnView event="platforms_viewed" />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-60 [background-image:linear-gradient(rgba(255,212,0,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,212,0,0.07)_1px,transparent_1px)] [background-size:56px_56px] [mask-image:radial-gradient(ellipse_at_50%_30%,black,transparent_72%)]"
          />
          <div aria-hidden className="platforms-scan pointer-events-none absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-[#FFD400] to-transparent" />
          <div className="mx-auto max-w-6xl px-5 pb-12 pt-32 sm:pt-36 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <div className="mb-7 inline-flex items-center gap-3 rounded-full border border-[#FFD400]/60 bg-[#161614] py-1.5 pl-1.5 pr-4 shadow-[3px_3px_0_#FFD400]">
                <span className="inline-flex size-8 items-center justify-center rounded-full bg-[#FFD400] text-[#151515]">
                  <Globe className="size-4" aria-hidden />
                </span>
                <span className="text-[13px] font-semibold">
                  Live on {liveCount} platforms
                  <span className="text-[#9C9E93]"> · {requestCount} by request · {soonCount} coming soon</span>
                </span>
              </div>
              <p className={`${eyebrowOnDark} mb-4`}>{"// platforms //"}</p>
              <h1 className={`${fontDisplay} text-[34px] leading-[1.08] text-[#F2F2EA] sm:text-5xl lg:text-6xl`}>
                One monitor.
                <br />
                <span className="relative inline-block">
                  <span aria-hidden className="absolute inset-x-[-6px] bottom-[6%] top-[12%] -rotate-1 rounded-md bg-[#FFD400]" />
                  <span className="relative text-[#151515]">Everywhere you work.</span>
                </span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#A3A397]">
                MyKavo watches your websites for what changed and what broke. Use it from the web, inside WordPress, from
                Chrome, through your AI assistant, in your deploy pipeline and on your phone - one account, the same
                quiet alerts.
              </p>
              <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link
                  href="/signup"
                  className={`inline-flex items-center gap-2 rounded-full border border-[#FFD400] bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] shadow-[4px_4px_0_#F2F2EA] transition-colors hover:bg-[#ffe14d] ${FOCUS}`}
                >
                  Start monitoring free
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
                <a
                  href="#lineup"
                  className={`inline-flex items-center gap-2 rounded-full border border-white/30 px-6 py-3.5 text-sm font-semibold text-[#F2F2EA] transition-colors hover:border-[#FFD400] hover:text-[#FFD400] ${FOCUS}`}
                >
                  See every platform
                </a>
              </div>
              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9C9E93]">
                Free plan · 1 website · no card required
              </p>
            </div>

            <div className="mx-auto mt-14 max-w-4xl">
              <PlatformsOrbitAnimation />
              <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#9C9E93]">
                Illustrative · each platform pings MyKavo, MyKavo alerts you
              </p>
            </div>
          </div>
        </section>

        {/* In short */}
        <section aria-label="In short" className="mx-auto max-w-4xl px-5 pb-16 lg:px-8">
          <div className="relative overflow-hidden rounded-2xl border-2 border-[#FFD400] bg-[#161614] p-6 shadow-[6px_6px_0_#FFD400] sm:p-8">
            <span aria-hidden className="absolute inset-y-0 left-0 w-1.5 bg-[#FFD400]" />
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-[#FFD400]">In short</p>
            <h2 className={`${fontDisplay} mt-2 text-2xl leading-tight text-[#F2F2EA] sm:text-[28px]`}>
              Where can I use MyKavo?
            </h2>
            <p className="mt-3 text-[16px] leading-7 text-[#E9EBDF]">
              MyKavo is a website change and regression monitor you can use from the web app at mykavo.app, a WordPress
              plugin, a Chrome extension, an MCP server for AI assistants and deploy hooks for CI. An Android app is
              available by request and a Shopify app is coming soon. Every platform uses the same MyKavo account, and the
              free plan covers one website.
            </p>
            <dl className="mt-5 grid gap-x-6 gap-y-3 border-t border-white/12 pt-5 sm:grid-cols-2">
              {[
                { label: "Live today", value: "Web app, WordPress plugin, Chrome extension, AI assistants, deploy hooks" },
                { label: "By request", value: "Android app" },
                { label: "Coming soon", value: "Shopify app" },
                { label: "Price", value: "Free plan, then Pro and Agency per workspace" },
              ].map((f) => (
                <div key={f.label} className="flex flex-col gap-0.5">
                  <dt className="font-mono text-[10.5px] font-bold uppercase tracking-[0.12em] text-[#9C9E93]">{f.label}</dt>
                  <dd className="text-[14.5px] font-medium leading-6 text-[#F2F2EA]">{f.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Marquee */}
        <section aria-label="Every MyKavo platform and its status" className="py-6">
          <div className="platforms-marquee relative flex -rotate-[0.8deg] overflow-hidden border-y border-[#FFD400] bg-[#FFD400] py-3.5">
            <div className="platforms-marquee-track flex">
              <Strip />
              <Strip />
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="rounded-2xl border border-white/14 bg-white/[0.03] p-4 sm:p-6">
                <p className={`${fontDisplay} text-5xl text-[#FFD400] sm:text-6xl`}>{s.value}</p>
                <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{s.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* The lineup */}
        <section id="lineup" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 pt-6 lg:px-8 lg:pb-28">
          <SectionHead eyebrow="the lineup" sub="Every platform, what it does today, and how to start. Statuses are exact: live means you can use it now.">
            Seven ways in.
            <br />
            <span className="text-[#FFD400]">One MyKavo underneath.</span>
          </SectionHead>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <PlatformCard p={web} index={0} wide />
            {rest.map((p, i) => (
              <PlatformCard key={p.id} p={p} index={i + 1} wide={p.id === "shopify"} />
            ))}
          </div>
          <p className="mt-8 text-center text-sm text-[#A3A397]">
            Installing the WordPress plugin? It lives in the{" "}
            <a
              href={WP_PLUGIN_DIRECTORY_URL}
              target="_blank"
              rel="noopener"
              className={`inline-flex items-center gap-1 font-semibold text-[#F2F2EA] underline decoration-[#FFD400] decoration-2 underline-offset-4 ${FOCUS}`}
            >
              WordPress.org directory
              <ArrowUpRight className="size-3.5" aria-hidden />
            </a>
            .
          </p>
          <p className="mx-auto mt-3 max-w-2xl text-center text-xs leading-5 text-[#9C9E93]">
            WordPress, Shopify, Android, Slack, Discord and other names and logos are trademarks of their owners. They
            are shown only to say what MyKavo works with, not as endorsements.
          </p>
        </section>

        {/* Relay */}
        <section className="border-y border-white/12 bg-[#121210]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <SectionHead
              eyebrow="one change, everywhere"
              sub="MyKavo catches a change once. You choose where you hear about it, and every platform shows the same result."
            >
              Detected once.
              <br />
              <span className="text-[#FFD400]">Delivered where you chose.</span>
            </SectionHead>
            <div className="mx-auto mt-14 max-w-4xl">
              <PlatformsRelayAnimation />
              <p className="mt-6 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[#9C9E93]">
                Illustrative example · the Chrome badge only lights for a site that is down or critical
              </p>
            </div>
          </div>
        </section>

        {/* Pick your start */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <SectionHead eyebrow="pick your start" sub="Not sure where to begin? Start with how you work.">
            Start where
            <br />
            <span className="text-[#FFD400]">you already are.</span>
          </SectionHead>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {picks.map((p) => (
              <Link
                key={p.who}
                href={p.href}
                className={`group flex flex-col rounded-2xl border border-white/14 bg-[#161614] p-6 transition-all hover:-translate-y-0.5 hover:border-[#FFD400] hover:shadow-[5px_5px_0_#FFD400] ${FOCUS}`}
              >
                <span className={`inline-flex size-10 items-center justify-center rounded-xl ${tileClass(p.icon)}`}>
                  <PlatformIcon id={p.icon} className="size-5" />
                </span>
                <p className="mt-5 text-[13px] font-medium italic leading-5 text-[#A3A397]">&ldquo;{p.who}&rdquo;</p>
                <h3 className={`${fontDisplay} mt-2 text-[22px] leading-snug text-[#F2F2EA]`}>{p.use}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#A3A397]">{p.why}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#FFD400]">
                  Take me there
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section className="border-y border-[#FFD400] bg-[#FFD400] text-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8 lg:py-20">
            <p className="mb-4 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#151515]/70">
              {"// the same underneath //"}
            </p>
            <h2 className={`${fontDisplay} text-center text-3xl leading-tight sm:text-4xl`}>
              A platform is a way in.
              <br />
              The monitoring is the same.
            </h2>
            <div className="mt-12 grid gap-4 md:grid-cols-3">
              {principles.map((p) => (
                <div key={p.title} className="rounded-2xl border border-[#151515] bg-[#151515] p-6 text-[#F2F2EA] shadow-[6px_6px_0_#F2F2EA]">
                  <p.icon className="size-6 text-[#FFD400]" aria-hidden />
                  <h3 className={`${fontDisplay} mt-4 text-[20px] leading-snug`}>{p.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#C9CBBE]">{p.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-2xl px-5 py-20 lg:py-28">
          <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// faq //"}</p>
          <h2 className={`${fontDisplay} mb-8 text-center text-3xl text-[#F2F2EA] sm:text-4xl`}>Platform questions.</h2>
          <div className="space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-white/14 bg-[#161614] px-6 py-5 transition-colors open:border-[#FFD400] open:pb-6 open:shadow-[4px_4px_0_#FFD400]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#F2F2EA] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span className="text-xl leading-none text-[#FFD400] transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#A3A397]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-5 pb-24 lg:px-8">
          <div className="mx-auto max-w-5xl rounded-[28px] border border-[#151515] bg-[#FFD400] px-6 py-14 text-center text-[#151515] shadow-[10px_10px_0_#F2F2EA] sm:px-12">
            <ShieldCheck className="mx-auto size-10" aria-hidden />
            <h2 className={`${fontDisplay} mt-5 text-3xl leading-tight sm:text-5xl`}>
              Know what changed.
              <br />
              Fix what matters.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#151515]/75">
              Start on the web in a minute, then add the platforms you work in. The free plan covers one website.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]"
              >
                Start monitoring free
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/pricing"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#151515]/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]"
              >
                Compare plans
              </Link>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />

      {/* Scoped motion - motion-safe only */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .platforms-marquee-track { animation: platforms-marquee-scroll 40s linear infinite; }
          @keyframes platforms-marquee-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
          .platforms-scan { animation: platforms-scan-sweep 7s ease-in-out infinite; }
          @keyframes platforms-scan-sweep {
            0% { transform: translateY(0); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(720px); opacity: 0; }
          }
        }
      `}</style>
    </div>
  );
}
