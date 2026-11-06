/* eslint-disable @next/next/no-img-element -- tiny static brand marks, already sized. */
import type { ReactNode } from "react";
import { ArrowUpRight, BellRing, Check, MousePointerClick, ShieldCheck } from "lucide-react";
import { PLATFORMS, PLATFORMS_PAGE_PATH, STATUS_LABEL, type Platform } from "@/config/platforms";
import { BrandGlyph, ChromeLogo, ClaudeLogo } from "./platform-marks";
import { TrackedLink } from "./tracked-link";
import { eyebrow, fontDisplay } from "./style";

/**
 * "Everywhere you work" - every place MyKavo runs, on one bento grid:
 * the web dashboard, the WordPress plugin, the Chrome extension, the Android
 * app and Claude & ChatGPT (MCP).
 *
 * Each card carries a small HTML preview of that surface (not a screenshot,
 * so it stays crisp and light). Previews are labelled illustrations with
 * made-up example sites, never customer data. Status chips come from
 * config/platforms.ts, so "By request" flips to "Live" there in one edit.
 */

type CardId = "web" | "wordpress" | "chrome" | "android" | "ai";

const platform = (id: Platform["id"]) => PLATFORMS.find((p) => p.id === id);

function StatusChip({ id }: { id: Platform["id"] }) {
  const status = platform(id)?.status ?? "live";
  const live = status === "live";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] ${
        live ? "bg-[#E6F4EC] text-[#146C3E]" : "bg-[#F3F1E6] text-[#6B6B60]"
      }`}
    >
      {live && <span className="size-1.5 rounded-full bg-[#1F9D55]" aria-hidden />}
      {STATUS_LABEL[status]}
    </span>
  );
}

/* ------------------------------------------------------------- previews -- */

function WebPreview() {
  const rows = [
    { site: "northwind-coffee.com", dot: "#E5484D", label: "2 critical", tone: "bg-[#FF8A6B] text-[#151515]" },
    { site: "studio-avenue.co", dot: "#FFB224", label: "1 to review", tone: "bg-[#FFE873] text-[#151515]" },
    { site: "harbor-dental.com", dot: "#1F9D55", label: "All clear", tone: "bg-[#E6F4EC] text-[#146C3E]" },
  ];
  return (
    <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-[0_18px_40px_-24px_rgba(21,21,21,0.45)]">
      <div className="flex items-center gap-1.5 border-b border-black/[0.06] bg-[#F6F5EE] px-3 py-2">
        <span className="size-2 rounded-full bg-[#FF5F57]" />
        <span className="size-2 rounded-full bg-[#FEBC2E]" />
        <span className="size-2 rounded-full bg-[#28C840]" />
        <span className="ml-3 rounded-md bg-white px-2.5 py-0.5 font-mono text-[10px] text-[#6B6B60]">mykavo.app/dashboard</span>
      </div>
      <div className="p-3.5">
        <div className="mb-2.5 flex items-baseline justify-between">
          <span className="text-[13px] font-semibold text-[#151515]">Your websites</span>
          <span className="font-mono text-[10px] text-[#6B6B60]">checked 4 min ago</span>
        </div>
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.site} className="flex items-center gap-2.5 rounded-lg bg-[#FBFAF3] px-2.5 py-2">
              <span className="size-2 shrink-0 rounded-full" style={{ background: r.dot }} />
              <span className="min-w-0 flex-1 truncate text-[12.5px] text-[#151515]">{r.site}</span>
              <span className={`rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${r.tone}`}>{r.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function WordPressPreview() {
  return (
    <div className="space-y-2">
      <div className="rounded-xl border border-black/10 bg-white p-3 shadow-[0_14px_30px_-22px_rgba(21,21,21,0.5)]">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#6B6B60]">Safe Updates</p>
        <p className="mt-1 text-[12.5px] font-semibold text-[#151515]">WooCommerce 9.3 → 9.4</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#E6F4EC] px-2 py-0.5 text-[10.5px] font-semibold text-[#146C3E]">
          <Check className="size-3" aria-hidden /> Verified, nothing changed
        </span>
      </div>
      <div className="ml-5 rounded-xl border border-black/10 bg-white p-3 shadow-[0_14px_30px_-22px_rgba(21,21,21,0.5)]">
        <p className="text-[12.5px] font-semibold text-[#151515]">Contact Form 7 5.9.8</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#FFE1D6] px-2 py-0.5 text-[10.5px] font-semibold text-[#A8320F]">
          Broke the site · rolled back
        </span>
      </div>
    </div>
  );
}

function ChromePreview() {
  return (
    <div className="mx-auto w-full max-w-[230px] rounded-xl border border-black/10 bg-white p-3 shadow-[0_18px_36px_-22px_rgba(21,21,21,0.5)]">
      <div className="flex items-center gap-2">
        <img src="/brand/mykavo-mark-gold.svg" alt="" width={16} height={16} className="size-4" />
        <span className="truncate font-mono text-[10.5px] text-[#6B6B60]">northwind-coffee.com/shop</span>
      </div>
      <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-[#E6F4EC] px-2.5 py-2">
        <ShieldCheck className="size-4 text-[#146C3E]" aria-hidden />
        <span className="text-[12px] font-semibold text-[#146C3E]">This page is protected</span>
      </div>
      <div className="mt-2 flex items-center justify-center gap-1.5 rounded-full bg-[#151515] py-1.5 text-[11.5px] font-semibold text-white">
        <MousePointerClick className="size-3.5" aria-hidden /> Check this page
      </div>
    </div>
  );
}

function AndroidPreview() {
  return (
    <div className="mx-auto w-[150px] rounded-[26px] border-[5px] border-[#151515] bg-[#F3F1E6] px-2 pb-6 pt-3 shadow-[0_18px_36px_-20px_rgba(21,21,21,0.55)]">
      <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-[#151515]/80" />
      <p className="text-center font-mono text-[18px] font-light text-[#151515]">9:41</p>
      <div className="mt-3 rounded-xl bg-white p-2 shadow-sm">
        <div className="flex items-center gap-1.5">
          <img src="/brand/mykavo-mark-gold.svg" alt="" width={12} height={12} className="size-3" />
          <span className="text-[9px] font-semibold text-[#151515]">MyKavo · now</span>
        </div>
        <p className="mt-1 flex items-start gap-1 text-[10px] font-semibold leading-tight text-[#151515]">
          <BellRing className="mt-px size-3 shrink-0 text-[#B42318]" aria-hidden />
          &ldquo;Add to cart&rdquo; is missing on /shop
        </p>
      </div>
    </div>
  );
}

function AiPreview() {
  return (
    <div className="space-y-2">
      <div className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-[#151515] px-3 py-2 text-[12px] leading-snug text-white">
        What changed on my sites this week?
      </div>
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-white shadow-sm">
          <ClaudeLogo className="size-3.5" />
        </span>
        <div className="max-w-[88%] rounded-2xl rounded-tl-md border border-black/10 bg-white px-3 py-2 text-[12px] leading-snug text-[#151515]">
          3 changes on <b>northwind-coffee.com</b>. The critical one: the Add to cart button disappeared after Tuesday&apos;s
          update.
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- cards -- */

type Card = {
  id: CardId;
  name: string;
  line: string;
  logo: ReactNode;
  preview: ReactNode;
  href: string;
  cta: string;
  /** Grid placement on large screens. */
  span: string;
  /** Soft wash behind the preview. */
  wash: string;
};

const CARDS: Card[] = [
  {
    id: "web",
    name: "Web dashboard",
    line: "Every website you manage, every change, before-and-after proof. The home base.",
    logo: <img src="/brand/mykavo-mark-gold.svg" alt="" width={22} height={22} className="size-[22px]" />,
    preview: <WebPreview />,
    href: "/signup?from=home_everywhere",
    cta: "Start free",
    span: "sm:col-span-2 lg:col-span-4",
    wash: "bg-[radial-gradient(120%_120%_at_100%_0%,#FFF3B0_0%,#FBFAF3_55%)]",
  },
  {
    id: "wordpress",
    name: "WordPress plugin",
    line: "A check after every update, and a rollback when one breaks the site.",
    logo: <BrandGlyph slug="wordpress" className="size-[22px]" />,
    preview: <WordPressPreview />,
    href: "/wordpress-plugin?from=home_everywhere",
    cta: "Get the plugin",
    span: "lg:col-span-2",
    wash: "bg-[radial-gradient(120%_120%_at_100%_0%,#DCEBF3_0%,#FBFAF3_60%)]",
  },
  {
    id: "chrome",
    name: "Chrome extension",
    line: "Check the page you're on in one click. Protect it in one more.",
    logo: <ChromeLogo className="size-[22px]" />,
    preview: <ChromePreview />,
    href: "/chrome-extension?from=home_everywhere",
    cta: "Add to Chrome",
    span: "lg:col-span-2",
    wash: "bg-[radial-gradient(120%_120%_at_0%_0%,#E6F4EC_0%,#FBFAF3_60%)]",
  },
  {
    id: "android",
    name: "Android app",
    line: "Your sites in your pocket, with a push the moment something breaks.",
    logo: <BrandGlyph slug="android" className="size-[22px]" />,
    preview: <AndroidPreview />,
    href: "/android-app?from=home_everywhere",
    cta: platform("android")?.status === "live" ? "Get the app" : "Request the app",
    span: "lg:col-span-2",
    wash: "bg-[radial-gradient(120%_120%_at_50%_0%,#E3F6D9_0%,#FBFAF3_60%)]",
  },
  {
    id: "ai",
    name: "Claude & ChatGPT",
    line: "Connect MyKavo to your AI assistant and ask what changed, in plain words.",
    logo: (
      <span className="flex items-center gap-1">
        <ClaudeLogo className="size-[20px]" />
        <img src="/brand/partners/openai-black.png" alt="" width={20} height={20} className="size-5" />
      </span>
    ),
    preview: <AiPreview />,
    href: "/ai-connector?from=home_everywhere",
    cta: "Connect your assistant",
    span: "lg:col-span-2",
    wash: "bg-[radial-gradient(120%_120%_at_100%_0%,#FBE2D6_0%,#FBFAF3_60%)]",
  },
];

function SurfaceCard({ card }: { card: Card }) {
  const wide = card.id === "web";
  return (
    <li className={card.span}>
      <TrackedLink
        href={card.href}
        event="platform_clicked"
        eventProps={{ platform: card.id, placement: "homepage_everywhere", status: platform(card.id)?.status ?? "live" }}
        className="group flex h-full flex-col overflow-hidden rounded-3xl border border-black/10 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[#151515] hover:shadow-[6px_6px_0_#151515] focus-visible:-translate-y-1 focus-visible:border-[#151515] focus-visible:shadow-[6px_6px_0_#151515] focus-visible:outline-none"
      >
        <div className={`relative ${card.wash} ${wide ? "px-6 pb-0 pt-6 sm:px-8 sm:pt-8" : "px-5 pb-0 pt-5 sm:px-6 sm:pt-6"}`}>
          <div className={`flex min-h-[172px] items-end ${wide ? "lg:min-h-[214px]" : ""}`}>
            <div className="w-full translate-y-2 transition-transform duration-300 group-hover:translate-y-0">{card.preview}</div>
          </div>
        </div>
        <div className={`flex flex-1 flex-col border-t border-black/[0.06] ${wide ? "p-6 sm:p-8" : "p-5 sm:p-6"}`}>
          <div className="flex items-center gap-2.5">
            <span className="inline-flex size-10 items-center justify-center rounded-xl border border-black/10 bg-white">
              {card.logo}
            </span>
            <h3 className={`text-[17px] font-semibold tracking-[-0.01em] text-[#151515] ${wide ? "sm:text-[19px]" : ""}`}>
              {card.name}
            </h3>
            <span className="ml-auto">
              <StatusChip id={card.id} />
            </span>
          </div>
          <p className="mt-3 text-[14px] leading-6 text-[#6B6B60]">{card.line}</p>
          <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[14px] font-semibold text-[#151515]">
            <span className="underline decoration-[#FFD400] decoration-2 underline-offset-4">{card.cta}</span>
            <ArrowUpRight
              className="size-4 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden
            />
          </span>
        </div>
      </TrackedLink>
    </li>
  );
}

export function EverywhereSection() {
  return (
    <section aria-labelledby="everywhere-title" className="bg-[#FBFAF3]">
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className={`${eyebrow} mb-4`}>{"// everywhere you work //"}</p>
          <h2 id="everywhere-title" className={`${fontDisplay} text-4xl leading-[1.05] text-[#151515] sm:text-5xl`}>
            One MyKavo.{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span aria-hidden className="absolute inset-x-[-4px] bottom-[8%] top-[18%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative">Five ways in.</span>
            </span>
          </h2>
          <p className="mt-5 text-[16px] leading-7 text-[#6B6B60]">
            The dashboard, your WordPress admin, your browser, your phone and your AI assistant. One account, the same
            alerts, wherever you are when something changes.
          </p>
        </div>

        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-6 lg:gap-5">
          {CARDS.map((c) => (
            <SurfaceCard key={c.id} card={c} />
          ))}
        </ul>

        <p className="mt-8 text-center text-[14px] text-[#6B6B60]">
          Also: checks from GitHub Actions, Vercel and Netlify deploys.{" "}
          <TrackedLink
            href={PLATFORMS_PAGE_PATH}
            event="platforms_cta_clicked"
            eventProps={{ placement: "homepage_everywhere", target: "all_platforms" }}
            className="font-semibold text-[#151515] underline decoration-[#FFD400] decoration-2 underline-offset-4"
          >
            See every platform
          </TrackedLink>
        </p>
      </div>
    </section>
  );
}
