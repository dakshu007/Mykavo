"use client";

import { useState } from "react";
import { CircleHelp, X } from "lucide-react";

/**
 * The "how do I fix this?" tooltip on every issue row: a small help button
 * that opens an inline popover with the check's explanation and fix steps.
 */
export function FixTip({ title, explain, fix }: { title: string; explain: string; fix: string }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`How to fix: ${title}`}
        aria-expanded={open}
        className="inline-flex size-6 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface hover:text-ink"
      >
        <CircleHelp className="size-4" aria-hidden />
      </button>
      {open && (
        <span className="absolute right-0 top-8 z-20 block w-80 rounded-card border border-line bg-card p-4 text-left shadow-card">
          <span className="flex items-start justify-between gap-2">
            <span className="block text-[13px] font-semibold text-ink">{title}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="-mr-1 -mt-1 inline-flex size-6 shrink-0 items-center justify-center rounded-full text-ink-faint hover:text-ink"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
          <span className="mt-1.5 block text-[12.5px] leading-5 text-ink-secondary">{explain}</span>
          <span className="mt-2.5 block rounded-tile bg-surface px-3 py-2.5 text-[12.5px] leading-5 text-ink">
            <span className="label-micro mb-1 block">How to fix</span>
            {fix}
          </span>
        </span>
      )}
    </span>
  );
}
