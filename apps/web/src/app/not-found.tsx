import Link from "next/link";
import { LandingNav } from "@/components/landing/nav";
import { LogoMark } from "@/components/brand/logo";
import { fontDisplay, fontSans } from "@/components/landing/style";

/**
 * 404 - a staged typographic moment in the v4 landing design. The lines
 * reveal one beat at a time (pure CSS, honors prefers-reduced-motion) and
 * riff on the brand: the guardian noticed this page is missing.
 */

const stage = (i: number) => ({
  animation: "nf-rise 0.55s cubic-bezier(0.22,1,0.36,1) both",
  animationDelay: `${0.25 + i * 0.65}s`,
});

export default function NotFound() {
  return (
    <div className={`${fontSans} flex min-h-svh flex-col overflow-hidden bg-[#FBFAF3] text-[#151515] antialiased`}>
      <style>{`
        @keyframes nf-rise {
          from { opacity: 0; transform: translateY(22px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes nf-blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.25; }
        }
        @media (prefers-reduced-motion: reduce) {
          [style*="nf-rise"] { animation: none !important; }
          .nf-dot { animation: none !important; }
        }
      `}</style>
      <LandingNav />

      <main className="relative flex flex-1 flex-col items-center justify-center px-5 pb-16 pt-32 text-center sm:pt-36">
        {/* Watermark spark */}
        <LogoMark
          size={520}
          aria-hidden
          className="pointer-events-none absolute -right-40 top-24 rotate-12 text-[#151515] opacity-[0.04]"
        />

        {/* 1 - the alert */}
        <p
          style={stage(0)}
          className="inline-flex items-center gap-2.5 rounded-full border border-[#151515] bg-white px-5 py-2 font-mono text-[13px] font-bold uppercase tracking-[0.18em] text-[#b91c1c] shadow-[3px_3px_0_#151515]"
        >
          <span
            aria-hidden
            className="nf-dot size-2 rounded-full bg-[#e5484d]"
            style={{ animation: "nf-blink 1.1s ease-in-out infinite" }}
          />
          Connection lost.
        </p>

        {/* 2 - the pronunciation */}
        <h1
          style={stage(1)}
          className={`${fontDisplay} mt-10 text-6xl leading-none tracking-[-0.03em] text-[#151515] sm:text-8xl lg:text-[120px]`}
        >
          My-
          <span className="relative inline-block whitespace-nowrap">
            <span
              aria-hidden
              className="absolute inset-x-[-6px] bottom-[4%] top-[10%] -rotate-1 rounded-lg bg-[#FFD400]"
            />
            <span className="relative">Kaa</span>
          </span>
          -vo.
        </h1>

        {/* 3 - the meaning */}
        <p
          style={stage(2)}
          className={`${fontDisplay} mt-6 text-2xl text-[#6B6B60] sm:text-4xl`}
        >
          Means{" "}
          <span className="text-[#151515] underline decoration-[#FFD400] decoration-4 underline-offset-8">
            &ldquo;guardian.&rdquo;
          </span>
        </p>

        {/* 4 - the punchline */}
        <p
          style={stage(3)}
          className={`${fontDisplay} mt-10 text-3xl leading-tight text-[#151515] sm:text-5xl`}
        >
          This page?
          <br />
          <span className="text-[#6B6B60]">Clearly escaped.</span>
        </p>

        {/* 5 - the scan log receipt */}
        <div
          style={stage(4)}
          className="mt-10 w-full max-w-md rounded-xl border border-[#151515] bg-[#151515] px-5 py-3.5 text-left shadow-[5px_5px_0_#FFD400,5px_5px_0_1px_#151515]"
        >
          <p className="font-mono text-[12px] leading-6 text-[#9C9E93]">
            <span className="text-[#FFD400]">$</span> mykavo scan --url {"<this-page>"}
            <br />
            <span className="text-[#e5e5da]">404 · not found on any approved baseline</span>
            <br />
            severity: <span className="text-[#FFD400]">LOW</span> · your websites are unaffected
          </p>
        </div>

        {/* 6 - the way home */}
        <div style={stage(5)} className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-full border border-[#151515] bg-[#FFD400] px-7 py-3.5 text-sm font-semibold text-[#151515] shadow-[4px_4px_0_#151515] transition-transform hover:-translate-y-0.5"
          >
            Escort me home
          </Link>
          <Link
            href="/dashboard"
            className="rounded-full border border-[#151515] bg-white px-7 py-3.5 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#F3F1E6]"
          >
            Open dashboard
          </Link>
          <Link
            href="/support"
            className="px-2 py-3.5 text-sm font-medium text-[#6B6B60] underline decoration-[#FFD400] decoration-2 underline-offset-4 hover:text-[#151515]"
          >
            Report a missing page
          </Link>
        </div>
      </main>

      {/* Giant clipped 404 - the final beat, same treatment as the footer wordmark */}
      <div aria-hidden className="pointer-events-none h-[11vw] min-h-16 select-none overflow-hidden">
        <p
          className="text-center font-semibold leading-none tracking-[-0.04em] text-[#FFD400]"
          style={{
            fontSize: "clamp(120px, 22vw, 340px)",
            WebkitTextStroke: "2px #151515",
            textShadow: "6px 6px 0 rgba(21,21,21,0.12)",
          }}
        >
          404
        </p>
      </div>
    </div>
  );
}
