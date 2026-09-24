import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { CHANGELOG, CHANGELOG_PATH, type ChangeKind } from "@/config/changelog";
import { breadcrumbList, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = {
  title: "What's New on MyKavo - Release Notes and Updates",
  description:
    "Every new feature, improvement and fix in MyKavo, newest first: the WordPress plugin, Supabase integration, Agency plan, Add to Slack, Android app and more.",
  alternates: { canonical: CHANGELOG_PATH },
};

const KIND_STYLE: Record<ChangeKind, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FFD400] text-[#151515]" },
  improved: { label: "Improved", className: "bg-[#151515] text-[#FFD400]" },
  fixed: { label: "Fixed", className: "border border-black/20 bg-white text-[#151515]" },
};

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function WhatsNewPage() {
  const [latest] = CHANGELOG;
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(breadcrumbList([{ name: "What's new", path: CHANGELOG_PATH }])),
        }}
      />
      <LandingNav />
      <main className="mx-auto max-w-3xl px-5 pb-24 pt-32 sm:pt-36 lg:px-8">
        <p className={`${eyebrow} mb-4`}>{"// what's new //"}</p>
        <h1 className={`${fontDisplay} text-4xl leading-[1.08] sm:text-5xl`}>What&apos;s new on MyKavo</h1>
        <p className="mt-5 text-[15px] leading-7 text-[#6B6B60]">
          Every feature, improvement and fix we ship, newest first. The latest release is from{" "}
          <time dateTime={latest.date} className="font-medium text-[#151515]">
            {formatDate(latest.date)}
          </time>
          .
        </p>
        <div className="mt-6 flex flex-wrap gap-2" aria-label="Legend">
          {(Object.keys(KIND_STYLE) as ChangeKind[]).map((k) => (
            <span
              key={k}
              className={`rounded-full px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.1em] ${KIND_STYLE[k].className}`}
            >
              {KIND_STYLE[k].label}
            </span>
          ))}
        </div>

        <ol className="relative mt-12 border-l-2 border-[#151515]/15 pl-6 sm:pl-8">
          {CHANGELOG.map((release, index) => (
            <li key={release.date} id={release.date} className="relative pb-12 last:pb-0">
              <span
                aria-hidden
                className={`absolute -left-[33px] top-1.5 size-4 rounded-full border-2 border-[#151515] sm:-left-[41px] ${
                  index === 0 ? "bg-[#FFD400] shadow-[0_0_0_4px_rgba(255,212,0,0.35)]" : "bg-[#FBFAF3]"
                }`}
              />
              <p className="font-mono text-[12px] font-semibold uppercase tracking-[0.12em] text-[#6B6B60]">
                <time dateTime={release.date}>{formatDate(release.date)}</time>
                {index === 0 && (
                  <span className="ml-2 rounded-full bg-[#FFD400] px-2 py-0.5 text-[10px] text-[#151515]">Latest</span>
                )}
              </p>
              <h2 className="mt-2 text-[22px] font-semibold leading-snug tracking-tight">
                <a href={`#${release.date}`} className="hover:underline hover:decoration-[#FFD400] hover:decoration-2 hover:underline-offset-4">
                  {release.title}
                </a>
              </h2>
              <p className="mt-1.5 text-[15px] leading-7 text-[#6B6B60]">{release.summary}</p>
              <ul className="mt-5 space-y-3 rounded-2xl border border-black/10 bg-white p-5">
                {release.items.map((item) => (
                  <li key={item.text} className="flex items-start gap-3 text-[14.5px] leading-6 text-[#151515]/90">
                    <span
                      className={`mt-0.5 w-[74px] shrink-0 rounded-full px-2 py-0.5 text-center font-mono text-[10px] font-semibold uppercase tracking-[0.08em] ${KIND_STYLE[item.kind].className}`}
                    >
                      {KIND_STYLE[item.kind].label}
                    </span>
                    <span>
                      {item.text}
                      {item.href && (
                        <>
                          {" "}
                          <Link
                            href={item.href}
                            className="inline-flex items-center gap-0.5 font-medium text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
                          >
                            Learn more
                            <ArrowRight className="size-3.5" aria-hidden />
                          </Link>
                        </>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>

        <div className="mt-16 rounded-2xl border border-[#151515] bg-[#151515] p-8 text-center">
          <p className={`${fontDisplay} text-2xl text-[#E9EBDF] sm:text-3xl`}>Know what changed. Fix what matters.</p>
          <Link
            href="/signup"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#FFD400] px-6 py-3 text-sm font-semibold text-[#151515]"
          >
            Start monitoring free
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </main>
      <LandingFooter />
    </div>
  );
}
