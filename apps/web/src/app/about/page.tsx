import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Radar, ShieldCheck, Zap } from "lucide-react";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { LogoMark } from "@/components/brand/logo";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";

export const metadata: Metadata = {
  title: "About - The Story Behind MyKavo",
  description:
    "Why MyKavo exists, where the name comes from, and the belief behind it: every website deserves a shield. Built by an independent founder for agencies and developers.",
  keywords: [
    "about MyKavo",
    "MyKavo story",
    "website monitoring company",
    "website change detection tool",
  ],
  alternates: { canonical: "/about" },
};

const principles = [
  {
    icon: ShieldCheck,
    title: "Guard quietly, alert loudly",
    desc: "Monitoring should be silent until something matters. Low false-positive rates are a feature we engineer for, not a nice-to-have.",
  },
  {
    icon: Eye,
    title: "Show, never make you guess",
    desc: "Every change ships with before-and-after evidence - values, screenshots, diffs. You should never have to reconstruct what happened.",
  },
  {
    icon: Zap,
    title: "Deterministic over clever",
    desc: "Detection is reproducible math: previous value versus current value. The same input always gives the same answer.",
  },
  {
    icon: Radar,
    title: "Focused on one question",
    desc: "Did something important change or break on any website I manage? Everything MyKavo does serves that single question.",
  },
];

export default function AboutPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <LandingNav />
      <main className="pb-24 pt-32 sm:pt-36">
        {/* Hero */}
        <section className="mx-auto max-w-3xl px-5 text-center lg:px-8">
          <p className={`${eyebrow} mb-4`}>{"// about //"}</p>
          <h1 className={`${fontDisplay} text-4xl leading-[1.08] text-[#151515] sm:text-6xl`}>
            Every website deserves{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span
                aria-hidden
                className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]"
              />
              <span className="relative">a shield.</span>
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-[15px] leading-7 text-[#6B6B60]">
            MyKavo watches the websites you manage so a silent deploy, a plugin update, or a
            client edit never turns into lost rankings, lost sales, or an awkward phone call.
          </p>
        </section>

        {/* The name */}
        <section className="mx-auto mt-20 max-w-3xl px-5 lg:px-8">
          <div className="rounded-2xl border border-[#151515] bg-white p-8 shadow-[7px_7px_0_#FFD400,7px_7px_0_1px_#151515] sm:p-10">
            <div className="flex items-center gap-3">
              <LogoMark size={40} />
              <h2 className={`${fontDisplay} text-2xl text-[#151515] sm:text-3xl`}>
                Why &ldquo;MyKavo&rdquo;?
              </h2>
            </div>
            <p className="mt-5 text-[15px] leading-7 text-[#3d3d38]">
              <span className="font-semibold">Kavo</span> comes from{" "}
              <span className="font-semibold">Kavach</span> (कवच) - the Sanskrit word for armor,
              the shield a warrior trusts before walking into battle. Websites fight quiet battles
              every day: deploys that break buttons, plugins that flip pages to noindex, scripts
              that vanish without a trace. Most of those hits land silently and hurt for weeks.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-[#3d3d38]">
              <span className="font-semibold">MyKavo means exactly what it says: my armor.</span>{" "}
              Point it at the sites you care about and it stands guard - snapshotting every
              important page, comparing every scan against the baseline you approved, and speaking
              up the moment something that matters changes.
            </p>
            <p className="mt-4 text-[15px] leading-7 text-[#3d3d38]">
              Even the logo tells the story: a page with a spark bursting out of it - the exact
              instant a change is caught.
            </p>
          </div>
        </section>

        {/* Why it exists */}
        <section className="mx-auto mt-20 max-w-3xl px-5 lg:px-8">
          <p className={`${eyebrow} mb-4`}>{"// the reason //"}</p>
          <h2 className={`${fontDisplay} text-3xl text-[#151515] sm:text-4xl`}>
            Born from a very familiar phone call.
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#3d3d38]">
            <p>
              If you have ever maintained websites for other people, you know the call. A client
              notices their signup button has been dead for a week. Rankings dipped because a
              plugin update quietly flipped key pages to noindex. Analytics has a month-long hole
              because a rebuild dropped the tracking script. Nobody broke anything on purpose -
              nobody was watching.
            </p>
            <p>
              The tools that should have caught it were either enterprise-priced observability
              platforms, noisy uptime pings that only say &ldquo;the server responded&rdquo;, or a
              pile of disconnected checkers nobody remembers to run. There was no simple,
              affordable tool that answered the one question that matters:{" "}
              <span className="font-semibold text-[#151515]">
                did something important change or break on any website I manage?
              </span>
            </p>
            <p>
              MyKavo was built to be that tool - simple enough to set up in minutes, careful
              enough to stay quiet until something genuinely deserves your attention.
            </p>
          </div>
        </section>

        {/* Principles */}
        <section className="mx-auto mt-20 max-w-5xl px-5 lg:px-8">
          <p className={`${eyebrow} mb-4 text-center`}>{"// what we believe //"}</p>
          <h2 className={`${fontDisplay} text-center text-3xl text-[#151515] sm:text-4xl`}>
            Four principles, no exceptions.
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {principles.map((p) => (
              <div key={p.title} className="rounded-2xl border border-black/10 bg-white p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-xl border border-black/15 bg-[#FFD400]">
                  <p.icon className="size-5 text-[#151515]" aria-hidden />
                </span>
                <h3 className="mt-4 text-[16px] font-semibold text-[#151515]">{p.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-[#6B6B60]">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Founder */}
        <section className="mx-auto mt-20 max-w-3xl px-5 lg:px-8">
          <p className={`${eyebrow} mb-4`}>{"// who builds it //"}</p>
          <h2 className={`${fontDisplay} text-3xl text-[#151515] sm:text-4xl`}>
            Founder-built, deliberately small.
          </h2>
          <div className="mt-6 space-y-4 text-[15px] leading-7 text-[#3d3d38]">
            <p>
              MyKavo is founded and built by{" "}
              <span className="font-semibold text-[#151515]">Dakshesh Babu</span>, an independent
              product engineer who has spent years around websites that real businesses depend
              on - and around the quiet ways they break.
            </p>
            <p>
              Being small is a choice, not a stage. A small team means every alert format, every
              severity rule, and every pixel of the comparison view gets the founder&apos;s
              attention. It also means support emails are answered by someone who can actually fix
              the thing.
            </p>
            <p>
              The roadmap is driven by one metric:{" "}
              <span className="font-semibold text-[#151515]">
                does every paying customer get at least one genuinely valuable alert every month?
              </span>{" "}
              If an idea does not serve that, it does not ship.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto mt-20 max-w-3xl px-5 text-center lg:px-8">
          <div className="rounded-2xl bg-[#151515] px-8 py-12">
            <h2 className={`${fontDisplay} text-3xl text-[#F5F5F0] sm:text-4xl`}>
              Put a shield on your websites.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[#F5F5F0]/70">
              Free for your first website - monitoring in minutes, no credit card required.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="rounded-full bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
              >
                Start monitoring free
              </Link>
              <Link
                href="/pricing"
                className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-[#F5F5F0] transition-colors hover:bg-white/10"
              >
                See pricing
              </Link>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
