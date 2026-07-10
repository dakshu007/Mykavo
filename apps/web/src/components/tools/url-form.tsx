"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";

/** Single-URL input form with loading state, shared by the free tools. */
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
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (url.trim()) onSubmit(url.trim());
        }}
        className="flex flex-col gap-3 sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor={id} className="label-micro mb-1.5 block">
            {label}
          </label>
          <input
            id={id}
            type="text"
            inputMode="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={placeholder}
            className="h-12 w-full rounded-field border border-line bg-card px-4 font-mono text-[14px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-primary focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : buttonIcon}
          {buttonLabel}
        </button>
      </form>
    </Card>
  );
}
