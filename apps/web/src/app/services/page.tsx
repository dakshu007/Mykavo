import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  ChartLine,
  Code,
  Gauge,
  Link2Off,
  MousePointerClick,
  ReceiptText,
  RefreshCcw,
  ScanEye,
  SearchX,
  type LucideIcon,
} from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { BrandGlyph } from "@/components/landing/platform-marks";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { ServiceRequestForm } from "@/components/services/request-form";
import { withSocial } from "@/lib/social-metadata";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";
import {
  FIX_AREAS,
  HOW_STEPS,
  PLATFORMS,
  SERVICES_FAQS,
  WHY_POINTS,
  WORK_OPTIONS,
  type PlatformItem,
  type ServiceIconKey,
} from "@/lib/services/content";

export const metadata: Metadata = withSocial({
  title: "Website Fix Service - We Find It. We Fix It.",
  description:
    "MyKavo spots what broke on your website. If you don't have a developer, our team fixes it at a fixed price agreed before we start. Broken pages, lost tracking, SEO accidents and more.",
  keywords: [
    "website fix service",
    "fix broken website",
    "wordpress fix service",
    "shopify fix service",
    "website maintenance help",
    "website care plan",
  ],
  alternates: { canonical: "/services" },
});

const ICONS: Record<ServiceIconKey, LucideIcon> = {
  links: Link2Off,
  tracking: ChartLine,
  seo: SearchX,
  buttons: MousePointerClick,
  updates: RefreshCcw,
  speed: Gauge,
};

const WHY_ICONS: readonly LucideIcon[] = [ScanEye, BadgeCheck, ReceiptText];

function PlatformMark({ id }: { id: PlatformItem["id"] }) {
  if (id === "custom") return <Code className="size-6 text-[#151515]" aria-hidden />;
  return <BrandGlyph slug={id} className="size-6" />;
}

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-7 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2";
const secondaryButton =
  "inline-flex items-center justify-center gap-2 rounded-full border border-[#151515] bg-white px-7 py-3.5 text-sm font-semibold text-[#151515] transition-shadow hover:shadow-[3px_3px_0_#151515] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2";

export default function ServicesPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(SERVICES_FAQS)) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "Services", path: "/services" }])),
        }}
      />
      <LandingNav />
      <main className="mx-auto max-w-6xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        {/* 1. Hero */}
        <section aria-labelledby="services-hero" className="mx-auto max-w-3xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// mykavo services //"}</p>
          <h1
            id="services-hero"
            className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-6xl`}
          >
            We find it.
            <br />
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">We fix it.</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#6B6B60]">
            MyKavo spots what broke on your website. If you don&apos;t have a developer, our team
            fixes it for you, at a fixed price agreed before we start.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href="#request" className={primaryButton}>
              Request a fix
              <ArrowRight className="size-4" aria-hidden />
            </a>
            <a href="#what-we-fix" className={secondaryButton}>
              See what we fix
            </a>
          </div>
          <p className="mt-5 text-[13.5px] leading-6 text-[#6B6B60]">
            Fixed quote before any work. You approve first. No retainer needed.
          </p>
        </section>

        {/* 2. What we fix */}
        <section id="what-we-fix" aria-labelledby="what-we-fix-title" className="mt-28 scroll-mt-28">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className={`${eyebrow} mb-4`}>{"// what we fix //"}</p>
            <h2
              id="what-we-fix-title"
              className={`${fontDisplay} text-3xl leading-tight text-[#151515] sm:text-4xl`}
            >
              The things that quietly break.
            </h2>
            <p className="mt-4 text-[15px] leading-7 text-[#6B6B60]">
              The same problems MyKavo alerts on, fixed by the team that built it. Every job gets
              its own fixed quote.
            </p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FIX_AREAS.map((area) => {
              const Icon = ICONS[area.icon];
              return (
                <li key={area.title} className="flex flex-col rounded-2xl border border-black/10 bg-white p-6">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl bg-[#F3F1E6]">
                    <Icon className="size-5 text-[#151515]" aria-hidden />
                  </span>
                  <h3 className="mt-4 text-[18px] font-semibold leading-snug text-[#151515]">
                    {area.title}
                  </h3>
                  <p className="mt-2 flex-1 text-[14.5px] leading-6 text-[#6B6B60]">{area.body}</p>
                  <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="Examples">
                    {area.examples.map((example) => (
                      <li
                        key={example}
                        className="rounded-full border border-black/10 bg-[#FBFAF3] px-2.5 py-1 text-[12.5px] text-[#3d3d38]"
                      >
                        {example}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 border-t border-black/10 pt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#151515]">
                    Fixed quote
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        {/* 3. Two ways to work */}
        <section aria-labelledby="ways-title" className="mt-28">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className={`${eyebrow} mb-4`}>{"// two ways to work //"}</p>
            <h2
              id="ways-title"
              className={`${fontDisplay} text-3xl leading-tight text-[#151515] sm:text-4xl`}
            >
              Fix it once, or keep it looked after.
            </h2>
          </div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {WORK_OPTIONS.map((option) => {
              const featured = option.kind === "care_plan";
              return (
                <div
                  key={option.kind}
                  className={`flex flex-col rounded-2xl border p-8 ${
                    featured
                      ? "border-[#151515] bg-[#FFD400] shadow-[7px_7px_0_#151515]"
                      : "border-black/10 bg-white"
                  }`}
                >
                  <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#151515]/70">
                    {option.eyebrow}
                  </p>
                  <h3 className={`${fontDisplay} mt-2 text-2xl text-[#151515] sm:text-3xl`}>
                    {option.title}
                  </h3>
                  <p className="mt-3 text-[15px] leading-7 text-[#151515]/75">{option.body}</p>
                  <ul className="mt-6 flex-1 space-y-3">
                    {option.points.map((point) => (
                      <li key={point} className="flex items-start gap-2.5 text-[14px] leading-6">
                        <CheckCircle2 className="mt-1 size-4 shrink-0 text-[#151515]" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-6 text-[13px] font-semibold text-[#151515]">Fixed quote</p>
                  <Link
                    href={`/services?kind=${option.kind}#request`}
                    className="mt-3 rounded-full border border-[#151515] bg-[#151515] px-6 py-3.5 text-center text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#151515] focus-visible:ring-offset-2"
                  >
                    Get a quote
                    <span className="sr-only"> for a {option.eyebrow.toLowerCase()}</span>
                  </Link>
                </div>
              );
            })}
          </div>
        </section>

        {/* 4. How it works */}
        <section aria-labelledby="how-title" className="mt-28">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className={`${eyebrow} mb-4`}>{"// how it works //"}</p>
            <h2
              id="how-title"
              className={`${fontDisplay} text-3xl leading-tight text-[#151515] sm:text-4xl`}
            >
              Four steps, no surprises.
            </h2>
          </div>
          <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_STEPS.map((step, index) => (
              <li key={step.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <span
                  aria-hidden
                  className="inline-flex size-9 items-center justify-center rounded-full bg-[#FFD400] font-mono text-[13px] font-semibold text-[#151515]"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 text-[17px] font-semibold leading-snug text-[#151515]">
                  <span className="sr-only">Step {index + 1}: </span>
                  {step.title}
                </h3>
                <p className="mt-2 text-[14.5px] leading-6 text-[#6B6B60]">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* 5. Why us */}
        <section aria-labelledby="why-title" className="mt-28">
          <div className="rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-14 sm:px-12">
            <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// why us //"}</p>
            <h2
              id="why-title"
              className={`${fontDisplay} mx-auto max-w-xl text-center text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}
            >
              We already see <span className="text-[#FFD400]">what changed.</span>
            </h2>
            <ul className="mt-10 grid gap-6 md:grid-cols-3">
              {WHY_POINTS.map((point, index) => {
                const Icon = WHY_ICONS[index] ?? BadgeCheck;
                return (
                  <li key={point.title} className="rounded-2xl border border-white/10 p-6">
                    <Icon className="size-6 text-[#FFD400]" aria-hidden />
                    <h3 className="mt-4 text-[17px] font-semibold text-[#E9EBDF]">{point.title}</h3>
                    <p className="mt-2 text-[14.5px] leading-6 text-[#9C9E93]">{point.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* 6. Platforms */}
        <section aria-labelledby="platforms-title" className="mt-28">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className={`${eyebrow} mb-4`}>{"// platforms //"}</p>
            <h2
              id="platforms-title"
              className={`${fontDisplay} text-3xl leading-tight text-[#151515] sm:text-4xl`}
            >
              The platforms we work on.
            </h2>
          </div>
          <ul className="mx-auto grid max-w-4xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {PLATFORMS.map((platform) => (
              <li
                key={platform.id}
                className="flex items-start gap-3.5 rounded-2xl border border-black/10 bg-white p-5"
              >
                <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white">
                  <PlatformMark id={platform.id} />
                </span>
                <span>
                  <span className="block text-[15px] font-semibold text-[#151515]">{platform.name}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-[#6B6B60]">{platform.note}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mx-auto mt-5 max-w-2xl text-center text-[12.5px] leading-5 text-[#6B6B60]">
            WordPress, Shopify and Webflow are trademarks of their owners, shown only to say which
            platforms we work on.
          </p>
        </section>

        {/* 7. FAQ */}
        <section aria-labelledby="faq-title" className="mx-auto mt-28 max-w-2xl">
          <p className={`${eyebrow} mb-4 text-center`}>{"// faq //"}</p>
          <h2
            id="faq-title"
            className={`${fontDisplay} mb-8 text-center text-3xl text-[#151515] sm:text-4xl`}
          >
            Questions before you ask.
          </h2>
          <div className="space-y-3">
            {SERVICES_FAQS.map((f) => (
              <details
                key={f.q}
                className="group rounded-2xl border border-black/10 bg-white px-6 py-5 transition-colors open:border-[#151515] open:pb-6 open:shadow-[4px_4px_0_#FFD400]"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-semibold text-[#151515] [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    className="text-xl leading-none text-[#6B6B60] transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    aria-hidden
                  >
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-7 text-[#6B6B60]">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* 8. Request form */}
        <section id="request" aria-labelledby="request-title" className="mx-auto mt-28 max-w-3xl scroll-mt-28">
          <div className="mb-8 text-center">
            <p className={`${eyebrow} mb-4`}>{"// request a fix //"}</p>
            <h2
              id="request-title"
              className={`${fontDisplay} text-3xl leading-tight text-[#151515] sm:text-4xl`}
            >
              Tell us what broke.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-7 text-[#6B6B60]">
              A few details is enough. We reply with a fixed quote, usually within 1 to 2 business
              days, and nothing happens until you approve it.
            </p>
          </div>
          <ServiceRequestForm />
        </section>

        {/* 9. Final CTA */}
        <section aria-labelledby="final-cta-title" className="mt-28">
          <div className="relative mx-auto max-w-4xl overflow-hidden rounded-[28px] border border-[#151515] bg-[#151515] px-6 py-16 text-center shadow-[8px_8px_0_#FFD400,8px_8px_0_1px_#151515]">
            <h2
              id="final-cta-title"
              className={`${fontDisplay} mx-auto max-w-xl text-3xl leading-tight text-[#E9EBDF] sm:text-4xl`}
            >
              Something broke? <span className="text-[#FFD400]">Send it to us.</span>
            </h2>
            <p className="mx-auto mb-8 mt-3 max-w-md text-[15px] leading-7 text-[#9C9E93]">
              Fixed quote before any work. You approve first. No retainer needed.
            </p>
            <a
              href="#request"
              className="inline-flex items-center gap-2 rounded-full bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FFD400] focus-visible:ring-offset-2 focus-visible:ring-offset-[#151515]"
            >
              Request a fix
              <ArrowRight className="size-4" aria-hidden />
            </a>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
