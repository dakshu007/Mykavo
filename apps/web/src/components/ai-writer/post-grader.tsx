"use client";

import { useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, ClipboardPaste, XCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { gradePost, SAMPLE_DRAFT, type CheckStatus } from "@/lib/tools/post-grader";

const ICON: Record<CheckStatus, typeof CheckCircle2> = { pass: CheckCircle2, warn: AlertTriangle, fail: XCircle };
const TONE: Record<CheckStatus, string> = { pass: "text-[#7bd88f]", warn: "text-[#FFD400]", fail: "text-[#ff8a7a]" };

function ScoreRing({ score }: { score: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "#7bd88f" : score >= 55 ? "#FFD400" : "#ff8a7a";
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (score / 100) * c}
          className="transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[38px] font-semibold leading-none text-white">{score}</span>
        <span className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/50">of 100</span>
      </div>
    </div>
  );
}

/**
 * Live SEO grader: paste a draft, name the search it targets, and see the
 * checks update as you type. Entirely client-side (lib/tools/post-grader).
 */
export function PostGrader({ from }: { from: string }) {
  const [keyword, setKeyword] = useState("speed up wordpress");
  const [draft, setDraft] = useState(SAMPLE_DRAFT);
  const tracked = useRef(false);
  const grade = useMemo(() => gradePost(draft, keyword), [draft, keyword]);

  const onEdit = (value: string) => {
    setDraft(value);
    if (!tracked.current) {
      tracked.current = true;
      track("tool_used", { tool: "post-grader", page: from });
    }
  };

  return (
    <div className="grid gap-5 rounded-[28px] border border-white/10 bg-[#1d1d1b] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)] sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
      <div className="flex min-w-0 flex-col gap-3">
        <label className="block">
          <span className="text-[13px] font-medium text-white/70">The search this post targets</span>
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            maxLength={80}
            className="mt-1.5 h-12 w-full rounded-xl border border-white/15 bg-white/[0.06] px-4 text-[15px] text-white outline-none focus-visible:border-[#FFD400] focus-visible:ring-2 focus-visible:ring-[#FFD400]/30"
          />
        </label>
        <label className="flex min-h-0 flex-1 flex-col">
          <span className="flex items-center justify-between text-[13px] font-medium text-white/70">
            Your draft (markdown or plain text)
            <span className="flex gap-2">
              <button type="button" onClick={() => onEdit("")} className="rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] text-white/70 hover:border-[#FFD400] hover:text-[#FFD400]">
                <ClipboardPaste className="mr-1 inline size-3" aria-hidden />
                Paste mine
              </button>
              <button type="button" onClick={() => onEdit(SAMPLE_DRAFT)} className="rounded-full border border-white/15 px-2.5 py-0.5 text-[12px] text-white/70 hover:border-[#FFD400] hover:text-[#FFD400]">
                Sample
              </button>
            </span>
          </span>
          <textarea
            value={draft}
            onChange={(e) => onEdit(e.target.value)}
            spellCheck={false}
            placeholder={"# Your title\n\nPaste your post here..."}
            className="mt-1.5 min-h-[300px] w-full flex-1 resize-y rounded-xl border border-white/15 bg-white/[0.06] p-4 font-mono text-[13px] leading-relaxed text-white/90 outline-none focus-visible:border-[#FFD400] focus-visible:ring-2 focus-visible:ring-[#FFD400]/30"
          />
        </label>
        <p className="text-[12.5px] text-white/45">Checked in your browser. Nothing you paste is sent anywhere.</p>
      </div>

      <div className="min-w-0" aria-live="polite">
        <div className="flex items-center gap-5 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
          <ScoreRing score={grade.score} />
          <div>
            <p className="text-[18px] font-semibold text-white">
              {grade.score >= 80 ? "Ready to compete." : grade.score >= 55 ? "Close. A few fixes left." : "Not ready to rank yet."}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-white/60">
              {grade.words} words. MyKavo writes every post to pass these checks, then adds the FAQ markup and JSON-LD for you.
            </p>
          </div>
        </div>
        <ul className="mt-4 space-y-2">
          {grade.checks.map((c) => {
            const Icon = ICON[c.status];
            return (
              <li key={c.id} className="flex gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-2.5">
                <Icon className={`mt-0.5 size-4.5 shrink-0 ${TONE[c.status]}`} aria-label={c.status} />
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-white">{c.label}</p>
                  <p className="text-[13px] leading-snug text-white/60">{c.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
