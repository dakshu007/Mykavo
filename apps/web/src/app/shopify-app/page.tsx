import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CheckCircle2,
  Gauge,
  Lock,
  MousePointerClick,
  Search,
  ShieldCheck,
} from "lucide-react";
import { GoogleButton } from "@/components/landing/google-cta";
import { PartnerLockup } from "@/components/landing/partner-lockup";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { TrackOnView } from "@/components/track-on-view";
import { plans } from "@/config/plans";
import { site } from "@/config/site";
import { SHOPIFY_APP_PAGE_PATH, SHOPIFY_APP_STORE_URL } from "@/config/shopify-app";
import {
  ORGANIZATION_ID,
  breadcrumbList,
  faqPage,
  jsonLdScript,
  organizationNode,
} from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "Shopify App - Check Your Store After Every Theme Change",
  description:
    "MyKavo for Shopify checks your storefront every time your live theme is published or edited, and shows what changed with before-and-after screenshots inside your Shopify admin. Nothing added to your storefront.",
  keywords: [
    "Shopify theme update broke my store",
    "Shopify theme change monitoring",
    "Shopify visual regression app",
    "Shopify store monitoring app",
    "monitor Shopify add to cart button",
    "Shopify SEO change alerts",
  ],
  alternates: { canonical: SHOPIFY_APP_PAGE_PATH },
  openGraph: {
    title: "MyKavo for Shopify - change your theme without fear",
    description:
      "A check after every theme publish and edit, with before-and-after evidence in your Shopify admin. Zero storefront impact.",
    url: SHOPIFY_APP_PAGE_PATH,
    images: [{ url: "/shopify/theme-checks.webp", width: 1600, height: 900 }],
  },
};

const themePoints = [
  "Publishing a theme starts a check of your monitored pages against their approved baseline.",
  "Edits to the live theme are checked too, at most once every 15 minutes while you work in the theme editor. Draft themes are ignored.",
  "A plain verdict on every theme change: “Verified - nothing changed”, or “3 changes found after this change” with the evidence one click away.",
  "Every change found afterwards is labelled with the theme change it appeared after, so you know what to roll back.",
];

const features: Array<{ icon: typeof Bell; title: string; desc: string }> = [
  {
    icon: MousePointerClick,
    title: "Add to cart, watched",
    desc: "Mark your add-to-cart, buy-now and signup buttons as conversion elements. A missing or hidden button is a critical alert.",
  },
  {
    icon: Search,
    title: "Product and collection SEO",
    desc: "Titles, meta descriptions, canonicals, robots tags and headings on the pages you choose. An accidental noindex never goes unnoticed.",
  },
  {
    icon: ShieldCheck,
    title: "Store pages covered",
    desc: "The app shows whether your home page, all products, cart and search pages are monitored, and adds the missing ones in one click.",
  },
  {
    icon: Bell,
    title: "Alerts where you are",
    desc: "Important changes can reach you by email or Slack, grouped per scan rather than one message per change.",
  },
  {
    icon: Gauge,
    title: "Uptime, speed and SSL",
    desc: "Uptime over 24 hours and 7 days, average response time and days until your custom domain's certificate expires.",
  },
  {
    icon: Lock,
    title: "One permission",
    desc: "The app asks only to read your themes, so it can tell when the live one changes. It never reads orders or customers.",
  },
];

const steps = [
  {
    step: "01",
    title: "Install",
    desc: "Add MyKavo from the Shopify App Store. It opens inside your Shopify admin.",
  },
  {
    step: "02",
    title: "Connect",
    desc: "Press Connect to MyKavo. Sign in or create a free account, choose your store's website, approve.",
  },
  {
    step: "03",
    title: "Change your theme without fear",
    desc: "The next theme publish or edit is checked automatically, and the verdict shows right in the app.",
  },
];

const faqs = [
  {
    q: "When can I install the app?",
    a: "MyKavo for Shopify is built and coming soon to the Shopify App Store. Until it is listed, you can monitor any Shopify store from mykavo.app today - nothing to install - and the app will bring the same monitoring into your Shopify admin with automatic theme-change checks.",
  },
  {
    q: "Will the app slow down my store?",
    a: "No. It adds nothing to your storefront: no theme app extension, no script tags, no pixels. It runs only inside your Shopify admin, and the scanning happens on MyKavo's servers, the same way a shopper loads your pages.",
  },
  {
    q: "Is the app free?",
    a: "The app is free to install. It connects to a MyKavo account, which has a free plan: one website, five monitored pages and weekly scans, with no card required. Automatic checks after theme changes are part of the Pro and Agency plans, billed by MyKavo, not through Shopify.",
  },
  {
    q: "What permissions does it need?",
    a: "Only read_themes. Shopify tells the app when a theme is published or edited, and the app checks whether it was your live theme. It cannot change your theme, and it never sees orders, products, customers or payments.",
  },
  {
    q: "What does the app store about my store?",
    a: "Your store's name, its myshopify.com address and primary domain, an access token Shopify issues to the app (encrypted at rest), and the names of themes that were published or edited. Nothing about your customers. Everything is deleted when Shopify asks us to after you uninstall.",
  },
  {
    q: "Can I use MyKavo on Shopify without the app?",
    a: "Yes. MyKavo checks your public pages from the outside, so you can monitor any storefront from mykavo.app. The app adds the theme-change checks and brings everything into your Shopify admin.",
  },
  {
    q: "Does it work with headless or custom themes?",
    a: "Monitoring works with any storefront a browser can load, including heavily customized Liquid themes and headless front ends. Theme-change checks apply to Online Store themes, since those are what Shopify reports publishes and edits for.",
  },
];

const appJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    organizationNode(),
    {
      "@type": "SoftwareApplication",
      "@id": `${site.url}${SHOPIFY_APP_PAGE_PATH}#app`,
      name: "MyKavo for Shopify",
      applicationCategory: "BusinessApplication",
      applicationSubCategory: "Shopify app",
      operatingSystem: "Shopify",
      url: `${site.url}${SHOPIFY_APP_PAGE_PATH}`,
      description: metadata.description,
      screenshot: `${site.url}/shopify/theme-checks.webp`,
      featureList: [...themePoints, ...features.map((f) => `${f.title}: ${f.desc}`)],
      ...(SHOPIFY_APP_STORE_URL ? { installUrl: SHOPIFY_APP_STORE_URL } : { releaseNotes: "Coming soon to the Shopify App Store." }),
      publisher: { "@id": ORGANIZATION_ID },
      offers: plans.map((plan) => ({
        "@type": "Offer",
        name: plan.name,
        price: String(plan.priceMonthlyUsd),
        priceCurrency: "USD",
        url: `${site.url}/pricing`,
      })),
    },
  ],
};

function Shot({
  src,
  alt,
  priority = false,
  className = "",
}: {
  src: string;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div className={`overflow-hidden rounded-2xl border border-[#151515] bg-white ${className}`}>
      <div className="flex items-center gap-1.5 border-b border-black/10 bg-[#F3F1E6] px-3 py-2" aria-hidden>
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="size-2 rounded-full bg-[#151515]/20" />
        <span className="ml-2 truncate rounded-full bg-white px-2.5 py-0.5 font-mono text-[10px] text-[#6B6B60]">
          admin.shopify.com/store/your-store/apps/mykavo
        </span>
      </div>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={900}
        priority={priority}
        sizes="(min-width: 1024px) 60vw, 100vw"
        className="h-auto w-full"
      />
    </div>
  );
}

function Check({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-7 text-[#151515]/90">
      <CheckCircle2 className="mt-1 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function PrimaryCta({ onDark = false }: { onDark?: boolean }) {
  const className =
    "inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 py-3.5 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-transform hover:-translate-y-0.5";
  if (SHOPIFY_APP_STORE_URL) {
    return (
      <a href={SHOPIFY_APP_STORE_URL} className={className} rel="noopener">
        Add to Shopify
        <ArrowRight className="size-4" aria-hidden />
      </a>
    );
  }
  return <GoogleButton onDark={onDark} />;
}

export default function ShopifyAppPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(appJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Shopify app", path: SHOPIFY_APP_PAGE_PATH }])),
        }}
      />
      <TrackOnView event="shopify_app_viewed" />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div>
              <PartnerLockup partner="shopify" className="mb-7" />
            </div>
            {!SHOPIFY_APP_STORE_URL && (
              <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-4 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#151515] shadow-[2px_2px_0_#151515]">
                <span className="size-1.5 rounded-full bg-[#151515] motion-safe:animate-pulse" aria-hidden />
                Coming soon
              </p>
            )}
            <p className={`${eyebrow} mb-4`}>{"// mykavo for shopify //"}</p>
            <h1 className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}>
              Change your theme
              <br />
              <span className="relative inline-block whitespace-nowrap">
                <span
                  aria-hidden
                  className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
                />
                <span className="relative">without fear.</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#6B6B60]">
              MyKavo for Shopify checks your store every time your live theme is published or edited,
              then tells you whether anything broke - a missing add-to-cart button, a product page
              gone noindex, a changed title - with before-and-after screenshots, right inside your
              Shopify admin.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaryCta />
              <Link
                href="/website-monitoring-for-shopify"
                className="inline-flex items-center gap-2 rounded-full border border-[#151515] bg-white px-6 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#F3F1E6]"
              >
                What MyKavo watches
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
              {SHOPIFY_APP_STORE_URL
                ? "Free to install · Runs in your Shopify admin · Read themes only"
                : "Coming to the Shopify App Store · Monitor any store from mykavo.app today"}
            </p>
          </div>
          <div className="mx-auto mt-14 max-w-5xl">
            <Shot
              src="/shopify/overview.webp"
              alt="MyKavo inside the Shopify admin: store status, uptime, response time, SSL, the changes that need attention first, and which store pages are monitored"
              priority
              className="shadow-[10px_10px_0_#FFD400,10px_10px_0_1px_#151515]"
            />
          </div>
        </section>

        {/* Zero storefront cost */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-16 lg:px-8">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// built to never slow your store down //"}</p>
            <h2 className={`${fontDisplay} text-center text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}>
              Most apps add weight to your storefront.
              <br />
              <span className="text-[#FFD400]">This one adds nothing.</span>
            </h2>
            <div className="mt-12 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              {[
                { value: "0", label: "scripts, pixels or app blocks on your storefront" },
                { value: "0", label: "theme files changed" },
                { value: "1", label: "permission: read themes" },
                { value: "0", label: "customer or order data read" },
              ].map((z) => (
                <div key={z.label} className="rounded-2xl border border-white/12 bg-white/[0.04] p-4 sm:p-6">
                  <p className={`${fontDisplay} text-4xl text-[#FFD400] sm:text-5xl`}>{z.value}</p>
                  <p className="mt-2 text-[13px] leading-5 text-[#E9EBDF] sm:text-[14px] sm:leading-6">{z.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Theme checks */}
        <section id="theme-checks" className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// theme checks //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
                Know which change
                <br />
                <span className="text-[#6B6B60]">broke your store.</span>
              </h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Theme updates and editor tweaks are the most common way a store quietly breaks. The
                store stays up, so nothing else notices. MyKavo checks right after the change.
              </p>
              <ul className="mt-8 space-y-3.5">
                {themePoints.map((p) => (
                  <Check key={p}>{p}</Check>
                ))}
              </ul>
              <p className="mt-7 text-sm text-[#6B6B60]">
                Automatic theme checks come with Pro and Agency. On Free, every theme change is still
                listed.
              </p>
            </div>
            <Shot
              src="/shopify/theme-checks.webp"
              alt="Theme checks history in the Shopify admin: each theme publish and edit with a verdict such as Verified - nothing changed, or 3 changes found after this change"
              className="shadow-[8px_8px_0_#151515]"
            />
          </div>
        </section>

        {/* Evidence */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
            <p className={`${eyebrow} mb-4 text-center`}>{"// the evidence //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              See exactly what changed.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#6B6B60]">
              Every change is ranked Critical to Info, with the old and new version side by side.
              Approve an intentional change as the new baseline, mark it fixed, or ignore it, without
              leaving Shopify.
            </p>
            <div className="mx-auto mt-14 max-w-5xl">
              <Shot
                src="/shopify/change.webp"
                alt="A change in the Shopify admin: title tag changed after a theme publish, with the old and new title side by side and buttons to approve, mark reviewed, fixed or ignore"
                className="shadow-[8px_8px_0_#151515]"
              />
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
          <p className={`${eyebrow} mb-4 text-center`}>{"// in the app //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
            Built for the parts that make money.
          </h2>
          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <f.icon className="size-9 rounded-xl border border-[#151515] bg-[#FFD400] p-2 text-[#151515]" aria-hidden />
                <h3 className="mt-4 text-[17px] font-semibold text-[#151515]">{f.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="border-y border-black/10 bg-white">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-24">
            <p className={`${eyebrow} mb-4 text-center`}>{"// set up in two minutes //"}</p>
            <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515] sm:text-5xl`}>
              {SHOPIFY_APP_STORE_URL ? "Install, connect, done." : "Install, connect, done. Soon."}
            </h2>
            <ol className="mt-14 grid gap-4 md:grid-cols-3">
              {steps.map((s) => (
                <li key={s.step} className="rounded-2xl border border-black/10 bg-[#FBFAF3] p-6">
                  <p className="font-mono text-[12px] font-semibold text-[#6B6B60]">{s.step}</p>
                  <h3 className="mt-2 text-[18px] font-semibold text-[#151515]">{s.title}</h3>
                  <p className="mt-2 text-[14px] leading-6 text-[#6B6B60]">{s.desc}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl px-5 py-20 lg:px-8 lg:py-24">
          <p className={`${eyebrow} mb-4 text-center`}>{"// questions //"}</p>
          <h2 className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#151515]`}>FAQ</h2>
          <div className="mt-10 divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
            {faqs.map((f) => (
              <details key={f.q} className="group px-6 py-5">
                <summary className="cursor-pointer list-none text-[15px] font-semibold text-[#151515] marker:hidden focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#151515]">
                  {f.q}
                </summary>
                <p className="mt-3 text-[14px] leading-6 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
            {!SHOPIFY_APP_STORE_URL && (
              <p className={`${eyebrowOnDark} mb-4`}>{"// coming soon to the shopify app store //"}</p>
            )}
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Your next theme change,
              <br />
              <span className="text-[#FFD400]">checked.</span>
            </h2>
            <div className="mt-9 flex justify-center">
              <PrimaryCta onDark />
            </div>
            <p className="mt-6 text-sm text-[#E9EBDF]/70">
              On WordPress? See the <Link href="/wordpress-plugin" className="underline decoration-[#FFD400] underline-offset-4">MyKavo WordPress plugin</Link>.
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
