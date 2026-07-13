/**
 * CSS-only marquee listing everything a Fluxen scan checks — the honest
 * version of a logo strip. Pauses entirely under prefers-reduced-motion.
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
          <span className="px-5 text-[14px] font-medium text-white/55">{s}</span>
          <span className="size-1 rounded-full bg-[#faed99]/70" />
        </span>
      ))}
    </div>
  );
}

export function SignalMarquee() {
  return (
    <section aria-label="Everything Fluxen checks on every scan" className="py-10">
      <p className="mb-5 text-center text-[12px] font-medium uppercase tracking-[0.22em] text-white/40">
        Checked on every scan
      </p>
      <div className="landing-marquee relative flex overflow-hidden border-y border-white/10 py-4 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <div className="landing-marquee-track flex">
          <Strip />
          <Strip />
        </div>
      </div>
      {/* Scoped keyframes — motion-safe only */}
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
