"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, Globe, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * One tidy row of filters for a single website's changes: which site, open
 * or everything, severity, category. Selects instead of 25 pills - the old
 * two rows of chips mixed every site and every option on one screen.
 *
 * Every control is a plain link or a native select that navigates, so the
 * URL stays the source of truth (shareable, back-button friendly, and the
 * CSV export reads the same query string).
 */

export interface FilterOption {
  value: string;
  label: string;
}

function Select({
  label,
  value,
  options,
  hrefFor,
  icon,
  wide,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  hrefFor: (value: string) => string;
  icon?: React.ReactNode;
  wide?: boolean;
}) {
  const router = useRouter();
  const active = value !== "";
  return (
    <label
      className={cn(
        "relative inline-flex h-9 items-center rounded-full border text-[13px] font-medium transition-colors focus-within:ring-2 focus-within:ring-accent/40",
        active ? "border-ink/20 bg-ink/[0.04] text-ink" : "border-line text-ink-secondary hover:text-ink",
        wide ? "min-w-0 max-w-full sm:max-w-72" : "",
      )}
    >
      <span className="sr-only">{label}</span>
      {icon && <span className="pointer-events-none absolute left-3 text-ink-faint">{icon}</span>}
      <select
        value={value}
        onChange={(e) => router.push(hrefFor(e.target.value))}
        className={cn(
          "h-full w-full min-w-0 cursor-pointer appearance-none truncate rounded-full bg-transparent pr-8 outline-none [&>option]:bg-card [&>option]:text-ink",
          icon ? "pl-8" : "pl-3.5",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-3.5 text-ink-faint" aria-hidden />
    </label>
  );
}

export function ChangeFilterBar({
  site,
  sites,
  showResolved,
  severity,
  category,
  severityOptions,
  categoryOptions,
  hrefs,
}: {
  site: string;
  sites: FilterOption[];
  showResolved: boolean;
  severity: string;
  category: string;
  severityOptions: FilterOption[];
  categoryOptions: FilterOption[];
  /** Pre-built base query per control, so the server owns URL rules. */
  hrefs: {
    base: string;
    clear: string | null;
  };
}) {
  const withParam = (key: string, value: string) => {
    const url = new URL(hrefs.base, "https://x.invalid");
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
    const qs = url.searchParams.toString();
    return qs ? `${url.pathname}?${qs}` : url.pathname;
  };

  const segment = (active: boolean) =>
    cn(
      "inline-flex h-7 items-center rounded-full px-3.5 text-[13px] font-medium transition-colors",
      active ? "bg-ink text-ink-inverse shadow-sm" : "text-ink-secondary hover:text-ink",
    );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {sites.length > 1 && (
        <Select
          label="Website"
          value={site}
          options={sites}
          hrefFor={(v) => withParam("website", v)}
          icon={<Globe className="size-3.5" aria-hidden />}
          wide
        />
      )}

      <div className="inline-flex h-9 items-center rounded-full border border-line p-0.5" role="group" aria-label="Status">
        <Link href={withParam("status", "")} className={segment(!showResolved)} aria-current={!showResolved ? "true" : undefined}>
          Open
        </Link>
        <Link href={withParam("status", "all")} className={segment(showResolved)} aria-current={showResolved ? "true" : undefined}>
          All
        </Link>
      </div>

      <Select
        label="Severity"
        value={severity}
        options={severityOptions}
        hrefFor={(v) => withParam("severity", v)}
      />
      <Select
        label="Category"
        value={category}
        options={categoryOptions}
        hrefFor={(v) => withParam("category", v)}
      />

      {hrefs.clear && (
        <Link
          href={hrefs.clear}
          className="inline-flex h-9 items-center gap-1 rounded-full px-2.5 text-[13px] font-medium text-ink-secondary hover:text-ink"
        >
          <X className="size-3.5" aria-hidden />
          Clear
        </Link>
      )}
    </div>
  );
}
