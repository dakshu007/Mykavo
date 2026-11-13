import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FileText, Search, ShieldCheck, Target } from "lucide-react";
import { getAgentRollout, prisma } from "@mykavo/database";
import { AGENT_LIMITS } from "@mykavo/keyword-agent/pure";
import { PLAN_PRICES_USD } from "@mykavo/shared";
import { LandingNav } from "@/components/landing/nav";
import { LandingFooter } from "@/components/landing/footer";
import { eyebrow, fontDisplay, fontSans } from "@/components/landing/style";
import { withSocial } from "@/lib/social-metadata";

const PATH = "/ai-keyword-agent";

/**
 * The public feature page. Live only once the rollout switch (All Usage, AI
 * controls) is set to "everyone": before that it is a 404, so nothing is
 * marketed that customers cannot use yet.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = withSocial({
  title: "AI Keyword Agent - Know What to Write Next, Then Write It",
  description:
    "MyKavo's AI Keyword Agent finds the searches your site is closest to winning, from your own Search Console data, and writes the post in one click. Built into every MyKavo plan.",
  alternates: { canonical: PATH },
  openGraph: {
    title: "MyKavo AI Keyword Agent",
    description: "Striking distance keywords from your Search Console data, and a ready-to-edit post in one click.",
    url: PATH,
  },
});

function Point({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 text-[15px] leading-7 text-[#151515]/90">
      <CheckCircle2 className="mt-1 size-5 shrink-0 rounded-full bg-[#FFD400] p-0.5 text-[#151515]" aria-hidden />
      <span>{children}</span>
    </li>
  );
}

const STEPS = [
  {
    icon: Search,
    title: "It reads your site",
    body: "MyKavo reads your homepage and key pages and fills in what you do, who you serve and where. You check it in about 30 seconds.",
  },
  {
    icon: Target,
    title: "It finds what to write",
    body: "Searches you already rank for at positions 8 to 20, from your own Search Console data, plus new ideas from Google's suggestions and today's results.",
  },
  {
    icon: FileText,
    title: "It writes the post",
    body: "One click gives you a full draft: title, meta description, headings, FAQ, links to your own pages and valid schema. You edit it, then copy it into your site.",
  },
];

export default async function AiKeywordAgentPage() {
  const rollout = await getAgentRollout(prisma);
  if (rollout.mode !== "everyone") notFound();

  const plans = [
    { name: "Free", price: PLAN_PRICES_USD.free, ...AGENT_LIMITS.free },
    { name: "Starter", price: PLAN_PRICES_USD.starter, ...AGENT_LIMITS.starter },
    { name: "Pro", price: PLAN_PRICES_USD.pro, ...AGENT_LIMITS.pro },
    { name: "Agency", price: PLAN_PRICES_USD.agency, ...AGENT_LIMITS.agency },
  ];

  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <LandingNav />
      <main>
        <section className="mx-auto max-w-6xl px-5 pb-16 pt-32 sm:pt-36 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className={`${eyebrow} mb-4`}>{"// ai keyword agent //"}</p>
            <h1 className={`${fontDisplay} text-4xl leading-[1.05] sm:text-6xl`}>
              Know what to write next.{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                <span className="relative">Then write it.</span>
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-[17px] leading-8 text-[#151515]/80">
              MyKavo protects the traffic you have. The AI Keyword Agent helps you win more: it finds the searches your
              site is closest to winning and turns any of them into a ready-to-edit post in one click.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="inline-flex h-12 items-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-[15px] font-semibold shadow-[3px_3px_0_#151515] hover:translate-y-px"
              >
                Start free <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link href="/pricing" className="inline-flex h-12 items-center rounded-full border border-[#151515] bg-white px-6 text-[15px] font-semibold">
                See plans
              </Link>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-16 lg:px-8" aria-labelledby="how">
          <h2 id="how" className={`${fontDisplay} text-center text-3xl sm:text-4xl`}>
            How it works
          </h2>
          <ol className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.title} className="rounded-[18px] border border-[#151515] bg-white p-6 shadow-[3px_3px_0_#151515]">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-[#151515] text-[#FFD400]">
                  <s.icon className="size-5" aria-hidden />
                </span>
                <p className="mt-4 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]">Step {i + 1}</p>
                <h3 className="mt-1 text-[18px] font-semibold">{s.title}</h3>
                <p className="mt-2 text-[14px] leading-6 text-[#151515]/75">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className={`${fontDisplay} text-3xl`}>Honest numbers</h2>
            <ul className="mt-5 space-y-3">
              <Point>Positions, impressions and CTR are your real Search Console figures.</Point>
              <Point>No made-up search volumes. Competition and popularity are labelled as estimates.</Point>
              <Point>Posts never invent statistics, prices or quotes, and flag anything you should check.</Point>
              <Point>Links only go to real pages on your own site.</Point>
            </ul>
          </div>
          <div>
            <h2 className={`${fontDisplay} flex items-center gap-2 text-3xl`}>
              <ShieldCheck className="size-7" aria-hidden /> Your data
            </h2>
            <ul className="mt-5 space-y-3">
              <Point>Search Console access is read-only, and you can disconnect at any time.</Point>
              <Point>Your data is used only for your own reports and posts, never shared with other customers.</Point>
              <Point>AI processing is by Anthropic, whose API data is not used to train models.</Point>
              <Point>You own the posts. They are drafts until you publish them.</Point>
            </ul>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-5 pb-24 lg:px-8" aria-labelledby="plans">
          <h2 id="plans" className={`${fontDisplay} text-center text-3xl sm:text-4xl`}>
            Included in every plan
          </h2>
          <div className="mt-8 overflow-x-auto rounded-[18px] border border-[#151515] bg-white">
            <table className="w-full min-w-[560px] text-left text-[14px]">
              <thead>
                <tr className="border-b border-[#151515]/15 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
                  <th scope="col" className="px-5 py-3 font-semibold">Plan</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Keyword reports a month</th>
                  <th scope="col" className="px-5 py-3 font-semibold">AI posts a month</th>
                  <th scope="col" className="px-5 py-3 font-semibold">Keywords shown</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#151515]/10">
                {plans.map((p) => (
                  <tr key={p.name}>
                    <th scope="row" className="px-5 py-3 font-semibold">
                      {p.name} <span className="font-normal text-[#6B6B60]">{p.price === 0 ? "$0" : `$${p.price}/mo`}</span>
                    </th>
                    <td className="px-5 py-3 tabular-nums">{p.reports}</td>
                    <td className="px-5 py-3 tabular-nums">{p.posts}</td>
                    <td className="px-5 py-3">{Number.isFinite(p.visibleOpportunities) ? `Top ${p.visibleOpportunities}` : "All"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-center text-[13px] text-[#6B6B60]">
            Allowances refill each month on your billing date. Striking distance keywords from Search Console are on every plan.
          </p>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
