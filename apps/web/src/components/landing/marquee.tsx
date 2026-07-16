/**
 * CSS-only marquee listing everything a MyKavo scan checks - the honest
 * version of a logo strip, now as a loud full-width gold band with ink text.
 * Pauses entirely under prefers-reduced-motion.
 */

const SIGNALS = [
  "HTTP status",
  "Screenshots",
  "Title tags",
  "Meta descriptions",
  "Canonicals",
  "robots.txt",
  "noindex flips",
  "H1 headings",
  "Broken links",
  "Redirect chains",
  "Analytics scripts",
  "Payment scripts",
  "Page weight",
  "Response time",
  "Sitemaps",
  "SSL expiry",
  "Uptime",
  "CTAs & forms",
];

function Strip() {
  return (
    <div className="flex shrink-0 items-center" aria-hidden>
      {SIGNALS.map((s) => (
        <span key={s} className="flex items-center whitespace-nowrap">
          <span className="px-6 font-mono text-[13px] font-semibold uppercase tracking-[0.08em] text-[#151515]">
            {s}
          </span>
          <span className="size-1.5 rounded-full bg-[#151515]" />
        </span>
      ))}
    </div>
  );
}

export function SignalMarquee() {
  return (
    <section aria-label="Everything MyKavo checks on every scan" className="py-6">
      <div className="landing-marquee relative flex -rotate-[0.6deg] overflow-hidden border-y border-[#151515] bg-[#FFD400] py-3.5">
        <div className="landing-marquee-track flex">
          <Strip />
          <Strip />
        </div>
      </div>
      <p className="mt-5 text-center font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-[#6B6B60]">
        Checked on every scan
      </p>
      {/* Scoped keyframes - motion-safe only */}
      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          .landing-marquee-track { animation: landing-marquee-scroll 45s linear infinite; }
          @keyframes landing-marquee-scroll {
            from { transform: translateX(0); }
            to { transform: translateX(-50%); }
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .landing-marquee { overflow-x: auto; }
        }
      `}</style>
    </section>
  );
}
