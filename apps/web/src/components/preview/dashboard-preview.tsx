"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { cn } from "@/lib/utils";
import { PreviewOverview } from "./overview";
import { PreviewWebsites } from "./websites";
import { PreviewChanges } from "./changes";
import { PreviewChangeDetail } from "./change-detail";

const tabs = [
  { id: "overview", label: "Overview" },
  { id: "websites", label: "Websites" },
  { id: "changes", label: "Changes" },
  { id: "change-detail", label: "Change detail" },
] as const;

type TabId = (typeof tabs)[number]["id"];

/**
 * Interactive dashboard preview (static sample data). The floating-sheet
 * composition - header, tab pills, content on a soft surface - follows the
 * approved design reference.
 */
export function DashboardPreview({ className }: { className?: string }) {
  const [tab, setTab] = useState<TabId>("overview");

  return (
    <div
      className={cn(
        "overflow-hidden rounded-[28px] bg-surface p-5 shadow-float sm:p-7",
        className,
      )}
    >
      {/* Header row */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <LogoMark size={32} />
          <div>
            <p className="text-[17px] font-semibold tracking-tight text-ink">
              Good morning, Alex
            </p>
            <p className="text-[13px] text-ink-secondary">
              Here&apos;s what changed across your websites
            </p>
          </div>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <span className="inline-flex h-11 w-56 items-center gap-2.5 rounded-full bg-card px-4 text-sm text-ink-faint shadow-card">
            <Search className="size-4" aria-hidden /> Search
          </span>
          <span
            className="inline-flex size-11 items-center justify-center rounded-full bg-card text-sm font-semibold text-ink shadow-card"
            aria-label="Account"
          >
            A
          </span>
        </div>
      </div>

      {/* Tab pills */}
      <div
        className="mb-6 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Dashboard preview screens"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              tab === t.id
                ? "bg-ink text-ink-inverse"
                : "bg-card text-ink-secondary shadow-card hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto hidden self-center rounded-full bg-primary-soft px-3 py-1.5 text-[11px] font-semibold text-primary sm:inline-block">
          Product preview · sample data
        </span>
      </div>

      {tab === "overview" && <PreviewOverview />}
      {tab === "websites" && <PreviewWebsites />}
      {tab === "changes" && <PreviewChanges />}
      {tab === "change-detail" && <PreviewChangeDetail />}
    </div>
  );
}
