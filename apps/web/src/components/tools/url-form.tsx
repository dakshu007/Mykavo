"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Single-URL input form with loading state, shared by the free tools.
 * v4 landing design: white card with the gold+ink offset shadow, mono label,
 * gold pill submit (fixed palette - the tools pages never use fx tokens).
 */
export function ToolUrlForm({
  id,
  label = "Page URL",
  placeholder = "example.com/pricing",
  buttonLabel,
  buttonIcon,
  loading,
  onSubmit,
}: {
  id: string;
  label?: string;
  placeholder?: string;
  buttonLabel: string;
  buttonIcon?: React.ReactNode;
  loading: boolean;
  onSubmit: (url: string) => void;
}) {
  const [url, setUrl] = useState("");

  return (
    <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) onSubmit(url.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label
            htmlFor={id}
            className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6B6B60]"
          >
            {label}
          </label>
          <input
            id={id}
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="h-12 w-full rounded-xl border border-[#151515]/25 bg-white px-4 font-mono text-[14px] text-[#151515] placeholder:font-sans placeholder:text-[#151515]/35 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:bg-[#ffe14d] disabled:opacity-60 disabled:shadow-none"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : buttonIcon}
          {buttonLabel}
        </button>
      </form>
    </div>
  );
}
