"use client";

import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { LiveProof } from "@/lib/live-proof";

const ROTATE_MS = 3800;
const nf = new Intl.NumberFormat("en-US");

/**
 * The top-of-page proof strip: real numbers from the last 30 days, and a
 * rotating list of serious changes MyKavo caught recently, anonymized.
 * Renders nothing until the numbers arrive (and nothing at all if they
 * can't), so the page never shows a placeholder or an invented figure.
 */
export function LiveProofStrip() {
  const [proof, setProof] = useState<LiveProof | null>(null);
  const [i, setI] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/live-proof")
      .then((r) => (r.ok ? (r.json() as Promise<LiveProof>) : null))
      .then((p) => {
        if (alive && p && p.pageChecks > 0) setProof(p);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  const items = proof?.recent ?? [];
  useEffect(() => {
    if (items.length < 2) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setI((n) => (n + 1) % items.length), ROTATE_MS);
    return () => window.clearInterval(t);
  }, [items.length]);

  if (!proof) return <div className="h-10" aria-hidden />;
  const item = items.length ? items[i % items.length] : null;

  return (
    <div className="mx-auto flex h-10 max-w-5xl items-center justify-center px-1">
      <div className="flex min-w-0 items-center gap-2.5 overflow-hidden rounded-full border border-[#151515]/15 bg-white/80 py-1.5 pl-2 pr-4 text-[12.5px] text-[#3d3d38] backdrop-blur">
        <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#e8f7ee] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[#166534]">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#22c55e] opacity-70 motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[#16a34a]" />
          </span>
          Live
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 sm:inline-flex">
          <ShieldCheck className="size-3.5 text-[#151515]" aria-hidden />
          <b className="font-semibold text-[#151515]">{nf.format(proof.pageChecks)}</b> page checks ·{" "}
          <b className="font-semibold text-[#151515]">{nf.format(proof.seriousCaught)}</b> serious issues caught in {proof.windowDays} days
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 sm:hidden">
          <b className="font-semibold text-[#151515]">{nf.format(proof.seriousCaught)}</b> serious issues caught this month
        </span>
        {item && (
          <>
            <span aria-hidden className="hidden h-3.5 w-px shrink-0 bg-[#151515]/15 md:block" />
            <span key={i} className="hidden min-w-0 animate-[price-in_.35s_ease-out] truncate md:block motion-reduce:animate-none" aria-live="polite">
              Recently caught: <b className="font-semibold text-[#151515]">{item.label}</b> · {item.site} · {item.ago}
            </span>
          </>
        )}
      </div>
    </div>
  );
}
