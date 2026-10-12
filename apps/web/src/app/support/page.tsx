import type { Metadata } from "next";
import {
  BellRing,
  Bug,
  ChevronDown,
  CreditCard,
  Globe,
  Info,
  LifeBuoy,
  Mail,
  Plug,
  Rocket,
  Smartphone,
  UserCog,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { ShopifyGlyph, WordPressGlyph } from "@/components/brand/integration-icons";
import { LogoMark } from "@/components/brand/logo";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { AnswerText } from "@/components/support/answer-text";
import { SupportAssistant } from "@/components/support/support-assistant";
import { AskButton, AskQuestionButton, SupportSearch } from "@/components/support/support-search";
import { articlesIn, CATEGORY_ORDER, SUPPORT_ARTICLES, SUPPORT_CATEGORIES, type SupportCategory } from "@/config/support-kb";
import { answerToPlainText } from "@/lib/support/markdown";
import { SUPPORT_EMAIL, supportMailto } from "@/lib/support/replies";
import { withSocial } from "@/lib/social-metadata";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

export const metadata: Metadata = withSocial({
  title: "Support - Get Help with MyKavo Website Monitoring",
  description: `Ask the MyKavo Assistant and get an instant answer, browse ${SUPPORT_ARTICLES.length}+ help articles on websites, alerts, WordPress, Shopify and billing, or email support@mykavo.app for a reply within one business day.`,
  keywords: [
    "MyKavo support",
    "MyKavo help center",
    "website monitoring help",
    "MyKavo contact",
    "website change detection support",
    "MyKavo billing help",
  ],
  alternates: { canonical: "/support" },
});

const CATEGORY_ICONS: Record<SupportCategory, LucideIcon | "wordpress" | "shopify"> = {
  "getting-started": Rocket,
  "websites-scans": Globe,
  "changes-alerts": BellRing,
  wordpress: "wordpress",
  shopify: "shopify",
  integrations: Plug,
  billing: CreditCard,
  account: UserCog,
  apps: Smartphone,
  tools: Wrench,
  troubleshooting: LifeBuoy,
  about: Info,
};

/** Questions shown under the search box: what people ask most. */
const POPULAR_QUESTIONS = [
  "How do I add a website?",
  "Why did I get a false alert?",
  "How do I connect the WordPress plugin?",
  "How much does MyKavo cost?",
  "How do I cancel?",
];

/** Topics without articles yet are left out rather than shown empty. */
const TOPICS = CATEGORY_ORDER.map((category) => ({ category, articles: articlesIn(category) })).filter(
  (t) => t.articles.length > 0,
);

/**
 * FAQ rich results: the first article of each topic, word for word as it
 * appears in "Browse every answer" below, so the schema never says something
 * the page does not.
 */
const faqArticles = TOPICS.map((t) => t.articles[0]);

function CategoryIcon({ category, className }: { category: SupportCategory; className: string }) {
  const icon = CATEGORY_ICONS[category];
  if (icon === "wordpress") return <WordPressGlyph className={className} />;
  if (icon === "shopify") return <ShopifyGlyph className={className} />;
  const Icon = icon;
  return <Icon className={className} aria-hidden />;
}

export default function SupportPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLdScript(faqPage(faqArticles.map((a) => ({ q: a.title, a: answerToPlainText(a.answer) })))),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Support", path: "/support" }])) }}
      />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden px-5 pb-16 pt-32 sm:pt-40 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(#151515_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_top,black_10%,transparent_65%)] opacity-[0.08]"
          />
          <div className="relative mx-auto max-w-3xl text-center">
            <p className={`${eyebrow} mb-5`}>{"// help center //"}</p>
            <h1 className={`${fontDisplay} text-[2.6rem] leading-[1.04] sm:text-6xl`}>
              How can we{" "}
              <span className="relative inline-block">
                <span aria-hidden className="absolute inset-x-[-6px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                <span className="relative">help?</span>
              </span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-[16px] leading-7 text-[#6B6B60]">
              Ask the MyKavo Assistant and get an answer in seconds, browse {SUPPORT_ARTICLES.length} answers, or
              email a real person. Whatever works for you.
            </p>
            <div className="mt-9">
              <SupportSearch />
            </div>
            <div className="mx-auto mt-6 flex max-w-2xl flex-wrap items-center justify-center gap-2">
              <span className="text-[12.5px] font-medium text-[#6B6B60]">Popular:</span>
              {POPULAR_QUESTIONS.map((q) => (
                <AskQuestionButton
                  key={q}
                  question={q}
                  className="rounded-full border border-[#151515]/15 bg-white px-3 py-1 text-[12.5px] font-medium text-[#151515] transition-all hover:-translate-y-px hover:border-[#151515] hover:shadow-[2px_2px_0_#151515]"
                />
              ))}
            </div>
          </div>

          <dl className="relative mx-auto mt-14 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: Zap, label: "Instant answers", value: "Any time, day or night" },
              { icon: LifeBuoy, label: "Help articles", value: `${SUPPORT_ARTICLES.length} answers, ${TOPICS.length} topics` },
              { icon: Mail, label: "Human reply", value: "Within one business day" },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white px-4 py-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[#FFF3B0]">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div className="min-w-0 text-left">
                  <dt className="text-[13px] font-semibold">{label}</dt>
                  <dd className="text-[12.5px] text-[#6B6B60]">{value}</dd>
                </div>
              </div>
            ))}
          </dl>
        </section>

        {/* Topics */}
        <section aria-labelledby="topics" className="mx-auto max-w-6xl px-5 pb-20 lg:px-8">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className={`${eyebrow} mb-3`}>{"// browse by topic //"}</p>
              <h2 id="topics" className={`${fontDisplay} text-3xl sm:text-4xl`}>
                Pick a topic
              </h2>
            </div>
            <p className="max-w-sm text-[14px] leading-6 text-[#6B6B60]">
              Tap a question to have the assistant answer it, or open a topic to read everything in it.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {TOPICS.map(({ category, articles }) => (
              <div
                key={category}
                className="group flex flex-col rounded-2xl border border-black/10 bg-white p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#151515] hover:shadow-[4px_4px_0_#151515]"
              >
                <div className="mb-4 flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-xl border border-[#151515]/10 bg-[#FBFAF3] transition-colors group-hover:bg-[#FFD400]">
                    <CategoryIcon category={category} className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-[16px] font-semibold leading-tight">{SUPPORT_CATEGORIES[category].title}</h3>
                    <p className="font-mono text-[11px] text-[#6B6B60]">
                      {articles.length} answer{articles.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </div>
                <p className="mb-4 text-[13.5px] leading-6 text-[#6B6B60]">{SUPPORT_CATEGORIES[category].blurb}</p>
                <ul className="mb-5 space-y-1.5">
                  {articles.slice(0, 3).map((a) => (
                    <li key={a.id}>
                      <AskButton
                        articleId={a.id}
                        title={a.title}
                        className="text-left text-[13.5px] font-medium leading-5 text-[#151515] underline decoration-[#151515]/20 underline-offset-[3px] transition-colors hover:decoration-[#FFD400] hover:decoration-2"
                      />
                    </li>
                  ))}
                </ul>
                <a
                  href={`#${category}`}
                  className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold text-[#151515]"
                >
                  All {SUPPORT_CATEGORIES[category].title.toLowerCase()} answers
                  <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                    →
                  </span>
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* Assistant band */}
        <section className="bg-[#151515] px-5 py-16 text-[#E9EBDF] lg:px-8">
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
            <div>
              <p className={`${eyebrowOnDark} mb-4`}>{"// meet the assistant //"}</p>
              <h2 className={`${fontDisplay} text-3xl text-white sm:text-4xl`}>
                Ask it like you&apos;d ask a teammate.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#9C9E93]">
                Typos, half sentences and &quot;wp&quot; instead of WordPress are all fine. The assistant knows
                MyKavo inside out, answers instantly, and tells you when a question needs a person instead of
                guessing.
              </p>
              <AskQuestionButton
                question="What can you help me with?"
                className="mt-7 inline-flex items-center gap-2 rounded-full border-2 border-[#FFD400] bg-[#FFD400] px-5 py-2.5 text-[14px] font-semibold text-[#151515] transition-transform hover:-translate-y-0.5"
              >
                Open the assistant
              </AskQuestionButton>
            </div>
            <div aria-hidden className="rounded-2xl border border-white/10 bg-white/[0.04] p-5">
              <div className="mb-4 flex justify-end">
                <p className="rounded-2xl rounded-br-md bg-white px-3.5 py-2 text-[14px] text-[#151515]">
                  my wp updates dont show up??
                </p>
              </div>
              <div className="flex items-start gap-2">
                <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-[#FFD400] text-[#151515]">
                  <LogoMark size={16} className="text-[#151515]" />
                </span>
                <div className="rounded-2xl rounded-tl-md bg-[#232323] px-3.5 py-3 text-[14px] leading-6 text-[#E9EBDF]">
                  <p className="mb-1 font-mono text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#9C9E93]">
                    WordPress plugin
                  </p>
                  Every update the plugin reports shows on your website&apos;s page on mykavo.app, on every plan.
                  Open the website and look for <strong className="text-white">WordPress updates</strong>...
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Every answer */}
        <section aria-labelledby="all-answers" className="mx-auto max-w-4xl px-5 py-20 lg:px-8">
          <p className={`${eyebrow} mb-3`}>{"// every answer //"}</p>
          <h2 id="all-answers" className={`${fontDisplay} mb-10 text-3xl sm:text-4xl`}>
            Browse every answer
          </h2>
          <div className="space-y-12">
            {TOPICS.map(({ category, articles }) => (
              <div key={category} id={category} className="scroll-mt-28">
                <h3 className="mb-4 flex items-center gap-2.5 text-[19px] font-semibold">
                  <CategoryIcon category={category} className="size-5" />
                  {SUPPORT_CATEGORIES[category].title}
                </h3>
                <div className="divide-y divide-black/10 overflow-hidden rounded-2xl border border-black/10 bg-white">
                  {articles.map((a) => (
                    <details key={a.id} id={a.id} className="group scroll-mt-28">
                      <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 text-[15px] font-medium transition-colors hover:bg-[#FBFAF3] [&::-webkit-details-marker]:hidden">
                        <span className="flex-1">{a.title}</span>
                        <ChevronDown className="size-4 shrink-0 text-[#6B6B60] transition-transform group-open:rotate-180" aria-hidden />
                      </summary>
                      <div className="px-5 pb-5 text-[14.5px] leading-7 text-[#2A2A26]">
                        <AnswerText source={a.answer} tone="page" />
                      </div>
                    </details>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Contact */}
        <section aria-labelledby="contact" className="mx-auto max-w-6xl px-5 pb-24 lg:px-8">
          <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-2xl border-2 border-[#151515] bg-[#FFD400] p-7 shadow-[6px_6px_0_#151515] sm:p-9">
              <p className="mb-3 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#151515]/70">
                {"// talk to a human //"}
              </p>
              <h2 id="contact" className={`${fontDisplay} text-3xl sm:text-4xl`}>
                Still stuck? Email us.
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#151515]/80">
                Your email goes straight to the people who build MyKavo, not a ticket queue. Most get a reply within
                one business day, often much sooner. Bugs, billing, feature ideas or &quot;this feels wrong&quot;: all
                welcome.
              </p>
              <a
                href={supportMailto()}
                className="mt-7 inline-flex items-center gap-2 rounded-full bg-[#151515] px-5 py-3 text-[15px] font-semibold text-[#FFD400] transition-transform hover:-translate-y-0.5"
              >
                <Mail className="size-4" aria-hidden />
                {SUPPORT_EMAIL}
              </a>
            </div>
            <div className="rounded-2xl border border-black/10 bg-white p-7">
              <div className="mb-4 flex items-center gap-2.5">
                <span className="grid size-9 place-items-center rounded-xl bg-[#FFF3B0]">
                  <Bug className="size-[18px]" aria-hidden />
                </span>
                <h3 className="text-[16px] font-semibold">Reporting a bug?</h3>
              </div>
              <p className="mb-3 text-[14px] leading-6 text-[#6B6B60]">
                These details usually mean we can fix it without any back-and-forth:
              </p>
              <ul className="space-y-2 text-[14px] leading-6">
                {[
                  ["Your account email", "so we look at the right workspace"],
                  ["The website or scan", "the site and roughly when it ran"],
                  ["Expected vs. what you saw", "a sentence or two is plenty"],
                  ["A screenshot", "optional, but often makes it obvious"],
                ].map(([title, note]) => (
                  <li key={title} className="flex gap-2.5">
                    <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-[#151515]" />
                    <span>
                      <strong className="font-semibold">{title}</strong>{" "}
                      <span className="text-[#6B6B60]">- {note}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
      <SupportAssistant />
    </div>
  );
}
