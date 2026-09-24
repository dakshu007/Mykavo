import { Apple, RefreshCw, ShieldCheck, Smartphone } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { AppSyncAnimation } from "./app-sync-animation";
import { RequestAppButton } from "./request-app-dialog";
import { eyebrowOnDark, fontDisplay } from "./style";

/**
 * Android app showcase - a dark ink band. From tablet width up it plays the
 * web <-> phone sync animation (app-sync-animation.tsx): a scan started on
 * the web mirrors to the phone, a push arrives, the change is resolved on
 * the phone and the web follows. Phones get a static phone mock instead.
 *
 * The APK is NOT offered to everyone. The app is not on a store yet, so
 * access is granted by hand: this section asks for a name and an address, the
 * operator approves in /dashboard/app-requests, and the download then appears
 * in that person's dashboard. That keeps the bandwidth budget predictable and
 * turns the waiting list into a real list of people who want it - see
 * docs/APP_ACCESS.md.
 */

export { APK_URL } from "@/config/app-release";

/** Gold chip that pops into both mock screens at the same moment. */
function SyncedChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`ad-pop inline-flex items-center gap-1.5 rounded-full border border-black/20 bg-[#FFD400] px-2.5 py-1 font-mono text-[10px] font-semibold text-[#151515] ${className}`}
    >
      <span className="size-1.5 rounded-full bg-[#151515]" aria-hidden />
      Change detected · just now
    </span>
  );
}

/** Mini severity row used inside both device mocks. */
function MockRow({ dot, label, value }: { dot: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-2 border-t border-black/[0.07] px-3 py-2 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2">
        <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: dot }} aria-hidden />
        <span className="truncate text-[11px] font-medium text-[#151515]/80">{label}</span>
      </span>
      <span className="shrink-0 font-mono text-[9.5px] text-[#6B6B60]">{value}</span>
    </div>
  );
}

function PhoneMock() {
  return (
    <div className="w-52 shrink-0 overflow-hidden rounded-[2.2rem] border-2 border-[#151515] bg-white shadow-[8px_8px_0_rgba(255,212,0,0.9)]">
      {/* Status bar + camera dot */}
      <div className="flex items-center justify-between px-5 pt-2.5">
        <span className="font-mono text-[9px] font-semibold text-[#151515]">9:41</span>
        <span className="size-2 rounded-full bg-[#151515]" aria-hidden />
        <span className="font-mono text-[9px] text-[#6B6B60]">5G</span>
      </div>
      <div className="px-3 pb-3 pt-2">
        <p className="px-1 text-[13px] font-semibold text-[#151515]">Overview</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <div className="rounded-lg border border-black/10 bg-[#FFF3B0] p-2">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-wide text-[#6B6B60]">
              Open
            </p>
            <p className="text-[15px] font-semibold text-[#151515]">2</p>
          </div>
          <div className="rounded-lg border border-black/10 p-2">
            <p className="font-mono text-[8px] font-semibold uppercase tracking-wide text-[#6B6B60]">
              Sites
            </p>
            <p className="text-[15px] font-semibold text-[#151515]">2</p>
          </div>
        </div>
        <div className="mt-2 flex justify-center">
          <SyncedChip />
        </div>
        <div className="mt-2 overflow-hidden rounded-xl border border-black/10">
          <MockRow dot="#e5484d" label="Canonical URL changed" value="High" />
          <MockRow dot="#f97316" label="CTA button missing" value="Med" />
        </div>
        {/* The app's floating island tab bar, in miniature */}
        <div className="mt-3 flex justify-center pb-1">
          <div className="flex items-center gap-2 rounded-full bg-[#151515] px-2.5 py-1.5">
            <span className="flex size-5 items-center justify-center rounded-full bg-[#FFD400]" aria-hidden>
              <span className="size-1.5 rounded-full bg-[#151515]" />
            </span>
            <span className="size-1.5 rounded-full bg-[#9C9E93]" aria-hidden />
            <span className="size-1.5 rounded-full bg-[#9C9E93]" aria-hidden />
            <span className="size-1.5 rounded-full bg-[#9C9E93]" aria-hidden />
          </div>
        </div>
      </div>
    </div>
  );
}

const trust = [
  {
    icon: ShieldCheck,
    title: "Safe and secured",
    desc: "Official signed build over HTTPS. Same protected login as the web, including two-factor auth.",
  },
  {
    icon: RefreshCw,
    title: "Always the latest",
    desc: "Built and signed by our release pipeline, so launch day ships the newest version. No stale builds.",
  },
  {
    icon: Smartphone,
    title: "Android 7.0+",
    desc: "Installs in under a minute. Swipe between tabs, pull to refresh, dark mode included.",
  },
];

export function AppDownloadSection() {
  return (
    <section id="android-app" className="border-y border-[#151515] bg-[#151515]">
      <style>{`
        @keyframes ad-ring {
          0% { transform: scale(1); opacity: 0.9; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes ad-pop-kf {
          0%, 12% { opacity: 0; transform: translateY(3px) scale(0.92); }
          20%, 88% { opacity: 1; transform: none; }
          96%, 100% { opacity: 0; transform: translateY(3px) scale(0.92); }
        }
        .ad-pulse { animation: ad-ring 2.4s ease-out infinite; }
        .ad-pop { animation: ad-pop-kf 5.6s ease-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ad-pulse, .ad-pop { animation: none; }
          .ad-pulse { opacity: 0; }
        }
      `}</style>
      <div className="mx-auto max-w-6xl px-5 py-20 lg:px-8 lg:py-28">
        <p className={`${eyebrowOnDark} mb-4 text-center`}>{"// in your pocket //"}</p>
        <h2
          className={`${fontDisplay} text-center text-4xl leading-[1.06] text-[#E9EBDF] sm:text-5xl lg:text-[52px]`}
        >
          Web and Android,
          <br />
          <span className="relative inline-block">
            <span
              aria-hidden
              className="absolute inset-x-[-6px] bottom-[6%] top-[12%] -rotate-1 rounded-md bg-[#FFD400]"
            />
            <span className="relative text-[#151515]">always in sync.</span>
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-2xl text-center text-[15px] leading-7 text-[#9C9E93]">
          The MyKavo app signs into the same account as your dashboard, so everything mirrors
          live in both directions. Trigger a scan from the couch, triage a change from the
          train, watch it land on the web seconds later. Monitor your sites from anywhere.
        </p>

        {/* Tablet and desktop: the web <-> phone sync animation. On phones the
            full scene would shrink past readable, so they keep the phone mock. */}
        <div className="mx-auto mt-14 hidden max-w-5xl md:block">
          <AppSyncAnimation />
        </div>

        {/* Small screens: phone mock only, spark above */}
        <div className="mt-12 flex flex-col items-center gap-6 md:hidden">
          <div className="relative" aria-hidden>
            <span className="ad-pulse absolute inset-0 rounded-full border-2 border-[#FFD400]" />
            <span className="relative flex size-12 items-center justify-center rounded-full border border-[#151515] bg-white shadow-[4px_4px_0_#FFD400]">
              <LogoMark size={24} />
            </span>
          </div>
          <PhoneMock />
        </div>

        <p className="mt-10 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-[#9C9E93]">
          one account · live in both directions · 3s refresh while scans run
        </p>

        {/* Request-access CTA. Not a download link: approval is by hand while
            the app is in review, and the dialog says why plus which address
            to use. */}
        <div className="mt-10 flex flex-col items-center gap-4">
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <RequestAppButton />
            <span className="inline-flex items-center gap-2 rounded-full border border-[#E9EBDF]/25 px-5 py-3 text-[13px] font-medium text-[#9C9E93]">
              <Apple className="size-4" aria-hidden />
              iOS coming soon
            </span>
          </div>
          <p className="max-w-md text-center font-mono text-[11px] leading-5 text-[#9C9E93]">
            free on every plan · approved in batches · needs a MyKavo account with the same
            email
          </p>
        </div>

        {/* Trust row */}
        <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
          {trust.map((t) => (
            <div
              key={t.title}
              className="rounded-2xl border border-[#E9EBDF]/15 bg-white/[0.04] p-4"
            >
              <span className="inline-flex size-9 items-center justify-center rounded-xl border border-black/20 bg-[#FFD400]">
                <t.icon className="size-4.5 text-[#151515]" aria-hidden />
              </span>
              <p className="mt-3 text-[14px] font-semibold text-[#E9EBDF]">{t.title}</p>
              <p className="mt-1 text-[12.5px] leading-5 text-[#9C9E93]">{t.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
