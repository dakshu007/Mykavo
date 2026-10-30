import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Eye,
  KeyRound,
  Lock,
  MessageSquareText,
  Plug,
  ShieldCheck,
  Unplug,
} from "lucide-react";
import { TRIAL_DAYS } from "@mykavo/shared";
import { withSocial } from "@/lib/social-metadata";
import { GoogleButton } from "@/components/landing/google-cta";
import { LandingFooter } from "@/components/landing/footer";
import { LandingNav } from "@/components/landing/nav";
import { ConnectorVideo, CopyServerUrl } from "@/components/landing/connector-media";
import { eyebrow, eyebrowOnDark, fontDisplay, fontSans } from "@/components/landing/style";
import { getPlan } from "@/config/plans";
import { site } from "@/config/site";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { breadcrumbList, faqPage, jsonLdScript } from "@/lib/seo/structured-data";

const PATH = "/ai-connector";
const CLAUDE_DIRECTORY_URL = "https://claude.ai/directory/connectors/mykavo";
const SERVER_URL = `${site.url.replace(/\/+$/, "")}/api/mcp`;
const PRO = getPlan("pro");
const AGENCY = getPlan("agency");
const PRO_CAP = PRO.limits.aiAssistantCallsPerDay.toLocaleString("en-US");
const AGENCY_CAP = AGENCY.limits.aiAssistantCallsPerDay.toLocaleString("en-US");

const LOGO = {
  mykavo: "/brand/partners/mykavo-app.png",
  claude: "/brand/partners/claude-spark.png",
  openai: "/brand/partners/openai-black.png",
  openaiWhite: "/brand/partners/openai-white.png",
};

export const metadata: Metadata = withSocial({
  title: "MyKavo for Claude and ChatGPT - Official Claude Connector",
  description:
    "MyKavo is now an official connector in Claude's directory and works in ChatGPT as a custom connector. Ask what changed on your websites, which site needs attention and what the latest audit found. Read-only, OAuth sign-in.",
  keywords: [
    "mykavo claude connector",
    "mykavo chatgpt",
    "website monitoring claude connector",
    "chatgpt custom connector website monitoring",
    "mcp website monitoring",
    "claude website monitoring",
  ],
  alternates: { canonical: PATH },
});

const claudeSteps = [
  { title: "Open Connectors", body: "In Claude, open Customize, then Connectors." },
  { title: "Find MyKavo", body: "Browse connectors, search for MyKavo and click Connect." },
  { title: "Click Allow", body: "Sign in to MyKavo, choose the workspace and allow read-only access." },
  { title: "Just ask", body: "Ask about your websites in any chat. Claude calls MyKavo when it needs your data." },
];

const chatgptSteps = [
  { title: "Open Plugins", body: "On chatgpt.com, open Plugins, click + and choose Add custom MCP server." },
  { title: "Paste the URL", body: "Name it MyKavo and paste the server URL below." },
  { title: "Choose OAuth", body: "Pick OAuth as the authentication, accept the notice and click Create as a plugin." },
  { title: "Click Allow", body: "Sign in to MyKavo, choose the workspace and allow read-only access." },
  { title: "Type @MyKavo", body: "Mention MyKavo in any chat and ask about your websites." },
];

const prompts = [
  { q: "Is anything wrong with my websites right now?", tag: "Overview" },
  { q: "What changed on my client sites this week?", tag: "Changes" },
  { q: "Explain the most serious open change and how to fix it.", tag: "Change detail" },
  { q: "Summarise the latest site audit for example.com. What should I fix first?", tag: "Site audit" },
  { q: "When did example.com last scan, and did any pages fail?", tag: "Scans" },
  { q: "Which AI crawlers read example.com this month?", tag: "AI crawlers" },
];

const trust = [
  {
    icon: KeyRound,
    title: "Standard OAuth sign-in",
    body: "You sign in on a MyKavo screen and approve one workspace. No passwords or API keys are pasted into a chat.",
  },
  {
    icon: Eye,
    title: "Read-only by design",
    body: "Every tool only reads. The assistant can't change settings, approve changes, add websites or start scans.",
  },
  {
    icon: Lock,
    title: "Your chats stay with the AI",
    body: "MyKavo only receives the lookups the assistant makes, never your prompts or the rest of the conversation.",
  },
  {
    icon: Unplug,
    title: "Disconnect any time",
    body: "Remove access from AI assistants in your MyKavo dashboard and it ends immediately.",
  },
];

const faqs = [
  {
    q: "Is MyKavo an official Claude connector?",
    a: "Yes. MyKavo is listed in Claude's connector directory. Search for MyKavo in Customize, Connectors, Browse connectors and click Connect. No URL or key to paste.",
  },
  {
    q: "Is MyKavo in the ChatGPT app directory?",
    a: "Not yet. In ChatGPT, MyKavo is added as a custom connector: you paste the server URL once, choose OAuth and sign in. It then works in any chat when you type @MyKavo. This page will change when MyKavo is listed in ChatGPT's directory.",
  },
  {
    q: "Which MyKavo plans include the connector?",
    a: `Pro and Agency, including the free ${TRIAL_DAYS}-day Pro trial. Pro includes ${PRO_CAP} assistant lookups a day per workspace and Agency ${AGENCY_CAP}. On Free and Starter the assistant explains that the connector needs Pro.`,
  },
  {
    q: "Can Claude or ChatGPT change anything in my MyKavo account?",
    a: "No. All seven tools are read-only. They read websites, changes, scans, site audits and AI crawler visits, and nothing else.",
  },
  {
    q: "Does MyKavo see my conversations?",
    a: "No. MyKavo only receives the specific lookups the assistant makes, such as listing open changes for one website. Your prompts and the rest of the chat stay with Claude or ChatGPT.",
  },
  {
    q: "Do I need a paid Claude or ChatGPT plan?",
    a: "Claude connectors from the directory are available on Claude's plans that support connectors. In ChatGPT, custom connectors are added on the web; on ChatGPT Business and Enterprise a workspace admin may need to allow them first.",
  },
  {
    q: "Does it work with Claude Code, Cursor or other MCP clients?",
    a: "Yes. MyKavo is a standard remote MCP server with OAuth. See the full setup guide for Claude Code, Cursor, VS Code and tools that need an API key instead.",
  },
];

function LogoTile({ src, alt, size = 64, dark = false }: { src: string; alt: string; size?: number; dark?: boolean }) {
  return (
    <span
      className={`inline-grid shrink-0 place-items-center rounded-[22%] ${dark ? "" : "border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)]"}`}
      style={{ width: size, height: size }}
    >
      <Image src={src} alt={alt} width={dark ? size : Math.round(size * 0.6)} height={dark ? size : Math.round(size * 0.6)} />
    </span>
  );
}

function StepList({ steps }: { steps: { title: string; body: string }[] }) {
  return (
    <ol className="space-y-4">
      {steps.map((s, i) => (
        <li key={s.title} className="flex gap-4">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[#151515] font-mono text-[13px] font-semibold text-[#FFD400]">
            {i + 1}
          </span>
          <div>
            <p className="text-[15px] font-semibold text-[#151515]">{s.title}</p>
            <p className="mt-0.5 text-[14px] leading-6 text-[#6B6B60]">{s.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Illustrative answer card in the hero: what a connected assistant replies. */
function ChatMock() {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#FBFAF3] p-4 text-[#151515] shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:p-5">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl bg-[#ECE9DC] px-4 py-2.5 text-[14px]">
        Which of my client sites needs attention?
      </div>
      <div className="mt-4 inline-flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-1.5 text-[12.5px] text-[#4a4a45]">
        <Image src={LOGO.mykavo} alt="" width={18} height={18} className="rounded" />
        MyKavo · Workspace summary
        <Check className="size-3.5 text-[#147a3a]" aria-hidden />
      </div>
      <p className="mt-3 text-[14px]">Two of your 9 websites need attention:</p>
      <div className="mt-2.5 space-y-2">
        {[
          { sev: "Critical", cls: "bg-[#fdeaeb] text-[#b91c1c]", t: "Checkout button is missing", d: "shop.example.com" },
          { sev: "High", cls: "bg-[#feeee2] text-[#c2410c]", t: "Page title was removed", d: "blog.example.com" },
        ].map((r) => (
          <div key={r.t} className="flex items-center gap-2.5 rounded-xl border border-black/10 bg-white px-3 py-2.5 text-[13px]">
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${r.cls}`}>{r.sev}</span>
            <span className="font-semibold">{r.t}</span>
            <span className="ml-auto hidden font-mono text-[11.5px] text-[#6B6B60] sm:inline">{r.d}</span>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[13px] font-semibold underline decoration-[#FFD400] decoration-2 underline-offset-4">
        Open the before-and-after in MyKavo
      </p>
    </div>
  );
}

export default function AiConnectorPage() {
  return (
    <div className={`${fontSans} min-h-svh bg-[#FBFAF3] text-[#151515] antialiased`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqPage(faqs)) }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbList([{ name: "Claude and ChatGPT", path: PATH }])) }}
      />
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden bg-[#151515] px-5 pb-20 pt-32 text-[#E9EBDF] sm:pt-36 lg:px-8">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,rgba(255,255,255,0.09)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -right-40 -top-40 size-[640px] rounded-full bg-[radial-gradient(circle,rgba(255,212,0,0.18),transparent_62%)]"
          />
          <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div>
              <p className={`${eyebrowOnDark} mb-5 flex flex-wrap items-center gap-2`}>
                <span className="rounded-full bg-[#FFD400] px-2 py-0.5 text-[10px] tracking-[0.14em] text-[#151515]">New</span>
                {"// now on claude and chatgpt //"}
              </p>
              <h1 className={`${fontDisplay} text-[2.4rem] leading-[1.04] text-white min-[360px]:text-5xl sm:text-6xl`}>
                Ask Claude and ChatGPT{" "}
                <span className="relative inline-block">
                  <span aria-hidden className="absolute inset-x-[-4px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
                  <span className="relative text-[#151515]">what changed</span>
                </span>{" "}
                on your websites.
              </h1>
              <p className="mt-6 max-w-xl text-[16px] leading-7 text-[#C9CBBF]">
                MyKavo is now an <strong className="text-white">official connector in Claude&apos;s directory</strong>, and
                connects to ChatGPT as a <strong className="text-white">custom connector</strong>. Ask in plain words which
                site needs attention, what broke this week or what the latest audit found, and get answers from your real
                monitoring data.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <a
                  href={CLAUDE_DIRECTORY_URL}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full bg-[#FFD400] px-6 text-[15px] font-semibold text-[#151515] shadow-[4px_4px_0_#E9EBDF] transition-transform hover:-translate-y-0.5 motion-reduce:transition-none"
                >
                  <Image src={LOGO.claude} alt="" width={22} height={22} />
                  Add to Claude
                  <ArrowUpRight className="size-4" aria-hidden />
                </a>
                <a
                  href="#chatgpt"
                  className="inline-flex h-12 items-center justify-center gap-2.5 rounded-full border border-white/25 bg-white/5 px-6 text-[15px] font-semibold text-white transition-colors hover:bg-white/10"
                >
                  <Image src={LOGO.openaiWhite} alt="" width={20} height={20} />
                  Connect ChatGPT
                  <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
              <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.14em] text-[#9C9E93]">
                Pro and Agency · Included in the {TRIAL_DAYS}-day Pro trial · Read-only
              </p>
            </div>

            <div className="relative">
              <div className="mb-5 flex items-center justify-center gap-3 sm:gap-5">
                <LogoTile src={LOGO.claude} alt="Claude" size={72} />
                <span aria-hidden className="h-px w-8 border-t-2 border-dashed border-[#FFD400]/60 sm:w-14" />
                <LogoTile src={LOGO.mykavo} alt="MyKavo" size={92} dark />
                <span aria-hidden className="h-px w-8 border-t-2 border-dashed border-[#FFD400]/60 sm:w-14" />
                <LogoTile src={LOGO.openai} alt="ChatGPT" size={72} />
              </div>
              <ChatMock />
              <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.16em] text-[#9C9E93]">
                Illustrative answer
              </p>
            </div>
          </div>
        </section>

        {/* Availability */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <p className={`${eyebrow} mb-4`}>{"// how each one connects //"}</p>
          <h2 className={`${fontDisplay} max-w-3xl text-4xl leading-[1.06] sm:text-5xl`}>Two assistants, two ways in.</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#151515] sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LogoTile src={LOGO.claude} alt="" size={52} />
                  <p className={`${fontDisplay} text-2xl`}>Claude</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#e5f6ec] px-3 py-1 text-[12px] font-semibold text-[#147a3a]">
                  <ShieldCheck className="size-3.5" aria-hidden /> Official connector
                </span>
              </div>
              <ul className="mt-6 space-y-2.5 text-[14.5px]">
                {[
                  "Listed in Claude's connector directory",
                  "Search MyKavo, click Connect, click Allow",
                  "Works in Claude on the web, desktop and mobile",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-[#FFD400] p-0.5" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href={CLAUDE_DIRECTORY_URL}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#151515] px-5 text-[14px] font-semibold text-white hover:bg-black"
                >
                  Open in Claude&apos;s directory <ArrowUpRight className="size-4" aria-hidden />
                </a>
                <a href="#claude" className="inline-flex h-11 items-center px-2 text-[14px] font-semibold underline decoration-[#FFD400] decoration-2 underline-offset-4">
                  Watch how
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-black/10 bg-[#F3F1E6] p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <LogoTile src={LOGO.openai} alt="" size={52} />
                  <p className={`${fontDisplay} text-2xl`}>ChatGPT</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FFD400] px-3 py-1 text-[12px] font-semibold text-[#151515]">
                  <Plug className="size-3.5" aria-hidden /> Custom connector
                </span>
              </div>
              <ul className="mt-6 space-y-2.5 text-[14.5px]">
                {[
                  "Not in ChatGPT's app directory yet: you add MyKavo by URL",
                  "Paste one URL, choose OAuth, click Allow",
                  "Set up once on chatgpt.com, then type @MyKavo in any chat",
                ].map((t) => (
                  <li key={t} className="flex items-start gap-2.5">
                    <Check className="mt-0.5 size-4 shrink-0 rounded-full bg-white p-0.5 ring-1 ring-black/10" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
              <div className="mt-7 flex flex-wrap gap-3">
                <a
                  href="#chatgpt"
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#151515] bg-white px-5 text-[14px] font-semibold hover:bg-[#FBFAF3]"
                >
                  See the ChatGPT steps <ArrowRight className="size-4" aria-hidden />
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Claude walkthrough */}
        <section id="claude" className="scroll-mt-24 border-y border-[#151515] bg-[#151515] text-[#E9EBDF]">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:px-8">
            <ConnectorVideo
              src="/videos/connect-claude.mp4"
              poster="/videos/connect-claude.jpg"
              label="How to add the MyKavo connector to Claude"
            />
            <div>
              <p className={`${eyebrowOnDark} mb-4 flex items-center gap-2`}>
                <Image src={LOGO.claude} alt="" width={16} height={16} />
                {"// claude · official connector //"}
              </p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-white sm:text-[2.75rem]`}>
                Add MyKavo to Claude in about a minute.
              </h2>
              <div className="mt-8 rounded-2xl bg-[#FBFAF3] p-5 sm:p-6">
                <StepList steps={claudeSteps} />
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-3">
                <a
                  href={CLAUDE_DIRECTORY_URL}
                  target="_blank"
                  rel="noopener"
                  className="inline-flex h-11 items-center gap-2 rounded-full bg-[#FFD400] px-5 text-[14px] font-semibold text-[#151515]"
                >
                  Open MyKavo in Claude <ArrowUpRight className="size-4" aria-hidden />
                </a>
                <span className="text-[13px] text-[#9C9E93]">On Team and Enterprise, an owner may need to enable it first.</span>
              </div>
            </div>
          </div>
        </section>

        {/* ChatGPT walkthrough */}
        <section id="chatgpt" className="scroll-mt-24 mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.35fr)]">
            <div className="order-2 lg:order-1">
              <p className={`${eyebrow} mb-4 flex items-center gap-2`}>
                <Image src={LOGO.openai} alt="" width={16} height={16} />
                {"// chatgpt · custom connector //"}
              </p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-[2.75rem]`}>
                Connect ChatGPT with one URL.
              </h2>
              <div className="mt-5 flex gap-3 rounded-2xl border border-[#FFD400] bg-[#FFF3B0]/60 p-4 text-[14px] leading-6">
                <Plug className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p>
                  <strong>Custom connector only, for now.</strong> MyKavo isn&apos;t listed in ChatGPT&apos;s app directory
                  yet, so you add it yourself by URL. It takes about two minutes, on chatgpt.com.
                </p>
              </div>
              <div className="mt-6">
                <p className="mb-2 text-[13px] font-semibold">MCP server URL</p>
                <CopyServerUrl url={SERVER_URL} />
              </div>
              <div className="mt-7 rounded-2xl border border-black/10 bg-white p-5 sm:p-6">
                <StepList steps={chatgptSteps} />
              </div>
              <p className="mt-4 text-[13px] leading-6 text-[#6B6B60]">
                On ChatGPT Business and Enterprise, a workspace admin may need to allow custom connectors first.
              </p>
            </div>
            <div className="order-1 lg:sticky lg:top-28 lg:order-2">
              <ConnectorVideo
                src="/videos/connect-chatgpt.mp4"
                poster="/videos/connect-chatgpt.jpg"
                label="How to add MyKavo to ChatGPT as a custom connector"
              />
            </div>
          </div>
        </section>

        {/* What you can ask */}
        <section className="border-y border-black/10 bg-[#F3F1E6]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <p className={`${eyebrow} mb-4`}>{"// what you can ask //"}</p>
            <h2 className={`${fontDisplay} max-w-3xl text-4xl leading-[1.06] sm:text-5xl`}>
              Plain questions. Answers from your real monitoring data.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {prompts.map((p) => (
                <div key={p.q} className="flex flex-col rounded-2xl border border-black/10 bg-white p-5">
                  <MessageSquareText className="size-5 text-[#151515]" aria-hidden />
                  <p className="mt-3 flex-1 text-[15.5px] font-medium leading-6">&ldquo;{p.q}&rdquo;</p>
                  <p className="mt-4 font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-[#6B6B60]">{p.tag}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Tools */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// seven read-only tools //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>What the assistant can read.</h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                The same tools in Claude and ChatGPT. Each one reads the single workspace you approved, and none of them
                can change anything.
              </p>
            </div>
            <ul className="divide-y divide-black/10 rounded-2xl border border-black/10 bg-white">
              {MCP_TOOLS.map((t) => (
                <li key={t.name} className="flex flex-col gap-1 p-5 sm:flex-row sm:gap-6">
                  <div className="sm:w-48 sm:shrink-0">
                    <p className="text-[15px] font-semibold">{t.title}</p>
                    <code className="font-mono text-[11.5px] text-[#6B6B60]">{t.name}</code>
                  </div>
                  <p className="text-[14px] leading-6 text-[#3d3d38]">{t.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Trust */}
        <section className="border-y border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
            <p className={`${eyebrowOnDark} mb-4`}>{"// privacy and permissions //"}</p>
            <h2 className={`${fontDisplay} max-w-3xl text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              You stay in control of what it sees.
            </h2>
            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trust.map((x) => (
                <div key={x.title} className="rounded-2xl border border-white/12 bg-white/[0.04] p-5">
                  <x.icon className="size-6 text-[#FFD400]" aria-hidden />
                  <p className="mt-4 text-[16px] font-semibold text-white">{x.title}</p>
                  <p className="mt-2 text-[14px] leading-6 text-[#C9CBBF]">{x.body}</p>
                </div>
              ))}
            </div>
            <p className="mt-8 text-[14px] text-[#9C9E93]">
              Details in the{" "}
              <Link href="/privacy#ai-assistants" className="text-[#E9EBDF] underline decoration-[#FFD400] underline-offset-4">
                privacy policy
              </Link>
              .
            </p>
          </div>
        </section>

        {/* Plans */}
        <section className="mx-auto max-w-6xl px-5 py-20 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-2">
            <div>
              <p className={`${eyebrow} mb-4`}>{"// plans //"}</p>
              <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>Included in Pro and Agency.</h2>
              <p className="mt-5 max-w-md text-[15px] leading-7 text-[#6B6B60]">
                Every new account starts with a free {TRIAL_DAYS}-day Pro trial, so you can connect Claude or ChatGPT on day
                one. No card needed to start.
              </p>
              <div className="mt-8 flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                <GoogleButton from="ai-connector:plans" />
                <Link href="/pricing" className="text-[13px] text-[#6B6B60] underline underline-offset-4 hover:text-[#151515]">
                  Compare plans
                </Link>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {[
                { plan: PRO, cap: PRO_CAP },
                { plan: AGENCY, cap: AGENCY_CAP },
              ].map(({ plan, cap }) => (
                <div key={plan.id} className="rounded-2xl border border-black/10 bg-white p-6">
                  <p className="text-[15px] font-semibold">{plan.name}</p>
                  <p className={`${fontDisplay} mt-2 text-4xl`}>
                    ${plan.priceMonthlyUsd}
                    <span className="text-[15px] text-[#6B6B60]">/mo</span>
                  </p>
                  <p className="mt-4 text-[14px] leading-6 text-[#3d3d38]">
                    <strong>{cap}</strong> assistant lookups a day, for every connected assistant in the workspace.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Other clients */}
        <section className="mx-auto max-w-6xl px-5 pb-20 lg:px-8">
          <div className="rounded-3xl border border-black/10 bg-[#F3F1E6] p-6 sm:p-10">
            <p className={`${eyebrow} mb-3`}>{"// developers //"}</p>
            <h2 className={`${fontDisplay} text-3xl leading-[1.1] sm:text-4xl`}>Claude Code, Cursor and other MCP clients.</h2>
            <p className="mt-4 max-w-2xl text-[15px] leading-7 text-[#6B6B60]">
              MyKavo is a standard remote MCP server with OAuth. In Claude Code, run this, then type <code>/mcp</code> to sign
              in:
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-[#151515] px-4 py-3 font-mono text-[13px] text-[#E9EBDF]">
              <code>claude mcp add --transport http mykavo {SERVER_URL}</code>
            </pre>
            <Link
              href="/ai-assistants"
              className="mt-5 inline-flex items-center gap-1.5 text-[14px] font-semibold underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              Full setup guide for every client <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-black/10">
          <div className="mx-auto max-w-3xl px-5 py-20 lg:px-8">
            <p className={`${eyebrow} mb-4`}>{"// faq //"}</p>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] sm:text-5xl`}>Questions, answered.</h2>
            <div className="mt-10 divide-y divide-black/10 border-y border-black/10">
              {faqs.map((f) => (
                <details key={f.q} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold">
                    {f.q}
                    <span
                      aria-hidden
                      className="grid size-7 shrink-0 place-items-center rounded-full border border-black/15 text-[16px] transition-transform group-open:rotate-45 motion-reduce:transition-none"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[15px] leading-7 text-[#3d3d38]">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="border-t border-[#151515] bg-[#151515]">
          <div className="mx-auto max-w-4xl px-5 py-20 text-center lg:px-8">
            <div className="mb-8 flex items-center justify-center gap-4">
              <LogoTile src={LOGO.claude} alt="Claude" size={56} />
              <LogoTile src={LOGO.mykavo} alt="MyKavo" size={68} dark />
              <LogoTile src={LOGO.openai} alt="ChatGPT" size={56} />
            </div>
            <h2 className={`${fontDisplay} text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl`}>
              Know what changed.
              <br />
              <span className="text-[#FFD400]">Just ask.</span>
            </h2>
            <div className="mt-9 flex flex-col items-center gap-3">
              <GoogleButton onDark from="ai-connector:end" />
              <Link href="/signup" className="text-[13px] text-[#9C9E93] underline underline-offset-4 hover:text-[#E9EBDF]">
                or sign up with email
              </Link>
            </div>
            <p className="mt-6 text-sm text-[#E9EBDF]/70">
              Already on Pro?{" "}
              <a href={CLAUDE_DIRECTORY_URL} target="_blank" rel="noopener" className="underline decoration-[#FFD400] underline-offset-4">
                Add to Claude
              </a>{" "}
              or{" "}
              <a href="#chatgpt" className="underline decoration-[#FFD400] underline-offset-4">
                connect ChatGPT
              </a>
              .
            </p>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
}
