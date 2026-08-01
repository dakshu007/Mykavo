"use client";

import { Printer } from "lucide-react";

/** Browser print = the PDF export. Hidden in the print output itself. */
export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-9 items-center gap-2 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink print:hidden"
    >
      <Printer className="size-3.5" aria-hidden />
      Save as PDF
    </button>
  );
}
