import Link from "next/link";
import { ArrowRight, MousePointerClick, ShieldCheck, Zap } from "lucide-react";
import { CHROME_EXTENSION_PAGE_PATH, CHROME_EXTENSION_VERSION } from "@/config/chrome-extension";
import { ChromeExtensionAnimation } from "./chrome-extension-animation";
import { ChromeMark, ChromeStoreButton } from "./chrome-store-button";
import { eyebrowOnDark, fontDisplay } from "./style";

const perks = [
  { icon: Zap, text: "One-click SEO check of any page" },
  { icon: ShieldCheck, text: "One more click to protect the site" },
  { icon: MousePointerClick, text: "Its status, wherever you browse" },
];

/**
 * Homepage launch band for the Chrome extension: the announcement, the store
 * button, and the same five-step walkthrough the extension's page opens with.
 */
export function ChromeExtensionLaunch() {
  return (
    <section id="chrome-extension" className="relative overflow-hidden border-y border-[#151515] bg-[#151515]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 [background-image:radial-gradient(circle,#ffffff14_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
      />
      <div className="relative mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <div className="mx-auto max-w-3xl text-center">
          {/* The launch ticket */}
          <div className="inline-flex -rotate-2 items-stretch overflow-hidden rounded-xl border-2 border-[#FFD400] font-mono text-[11px] font-bold uppercase tracking-[0.14em] shadow-[4px_4px_0_#FFD400]">
            <span className="flex items-center gap-2 bg-[#FFD400] px-3 py-2 text-[#151515]">
              <ChromeMark className="size-4" />
              Now live
            </span>
            <span className="flex items-center border-l-2 border-dashed border-[#FFD400] px-3 py-2 text-[#FFD400]">
              Chrome Web Store · v{CHROME_EXTENSION_VERSION}
            </span>
          </div>

          <p className={`${eyebrowOnDark} mb-4 mt-9`}>{"// just shipped //"}</p>
          <h2 className={`${fontDisplay} text-4xl leading-[1.05] text-[#F5F5F0] sm:text-6xl`}>
            MyKavo just moved
            <br />
            <span className="relative inline-block whitespace-nowrap">
              <span aria-hidden className="absolute inset-x-[-6px] bottom-[6%] top-[14%] -rotate-1 rounded-md bg-[#FFD400]" />
              <span className="relative text-[#151515]">into your toolbar.</span>
            </span>
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-[16px] leading-7 text-[#A3A397]">
            Check any page&apos;s SEO in one click, right in your browser. Like the website? Press
            Protect and MyKavo watches it around the clock - no URLs to copy, nothing to set up.
          </p>

          <ul className="mt-8 flex flex-wrap justify-center gap-2.5">
            {perks.map((p) => (
              <li
                key={p.text}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.05] px-3.5 py-2 text-[13px] font-medium text-[#E9EBDF]"
              >
                <p.icon className="size-4 text-[#FFD400]" aria-hidden />
                {p.text}
              </li>
            ))}
          </ul>

          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <ChromeStoreButton placement="homepage" variant="dark" />
            <Link
              href={CHROME_EXTENSION_PAGE_PATH}
              className="inline-flex items-center gap-2 px-3 py-3 text-sm font-semibold text-[#F5F5F0] underline decoration-[#FFD400] decoration-2 underline-offset-4"
            >
              See how it works
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-[#7D7F74]">
            Free · No account needed for the check · Runs locally
          </p>
        </div>

        <div className="mx-auto mt-14 max-w-5xl rounded-[24px] border border-white/10 bg-[#FBFAF3] p-4 shadow-[10px_10px_0_#FFD400] sm:p-7">
          <ChromeExtensionAnimation />
        </div>
      </div>
    </section>
  );
}
