"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ArrowRight,
  Bookmark,
  CheckCircle2,
  GitCompareArrows,
  Loader2,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { fontDisplay } from "@/components/landing/style";
import { ToolError } from "@/components/tools/tool-error";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { DiffSeverity, PageToolSnapshot, SnapshotDiff } from "@/lib/tools/snapshot";
import { diffSnapshots } from "@/lib/tools/snapshot";

const STORAGE_KEY = "mykavo.tool.savedSnapshot";

/* Saved-snapshot store backed by localStorage, exposed via useSyncExternalStore
   so server render (null) and client hydration stay consistent. */
let savedRawCache: string | null = null;
let savedParsedCache: PageToolSnapshot | null = null;
const savedListeners = new Set<() => void>();

function readSavedSnapshot(): PageToolSnapshot | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw !== savedRawCache) {
    savedRawCache = raw;
    try {
      savedParsedCache = raw ? (JSON.parse(raw) as PageToolSnapshot) : null;
    } catch {
      savedParsedCache = null;
    }
  }
  return savedParsedCache;
}

function subscribeSaved(cb: () => void): () => void {
  savedListeners.add(cb);
  return () => savedListeners.delete(cb);
}

function writeSavedSnapshot(snapshot: PageToolSnapshot | null): void {
  if (snapshot) localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  else localStorage.removeItem(STORAGE_KEY);
  savedListeners.forEach((cb) => cb());
}

async function inspect(url: string): Promise<PageToolSnapshot> {
  const res = await fetch("/api/tools/inspect-url", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url }),
  });
  const data = (await res.json()) as { snapshot?: PageToolSnapshot; error?: string };
  if (!res.ok || !data.snapshot) {
    throw new Error(data.error ?? "Something went wrong.");
  }
  return data.snapshot;
}

/* v4 fixed-palette severity chips - always color + text label, never color alone. */
const severityChips: Record<DiffSeverity, { chip: string; label: string }> = {
  CRITICAL: { chip: "bg-[#151515] text-[#FFD400]", label: "Critical" },
  HIGH: { chip: "border border-[#b91c1c]/30 bg-[#fdeaeb] text-[#b91c1c]", label: "High" },
  MEDIUM: { chip: "border border-[#92600a]/30 bg-[#fdf3e0] text-[#92600a]", label: "Medium" },
  LOW: { chip: "border border-[#151515]/15 bg-[#FFF3B0] text-[#151515]", label: "Low" },
  INFO: { chip: "border border-black/15 bg-white text-[#6B6B60]", label: "Info" },
};

function SeverityChip({ severity }: { severity: DiffSeverity }) {
  const s = severityChips[severity];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold",
        s.chip,
      )}
    >
      {s.label}
    </span>
  );
}

function UrlField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
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
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-xl border border-[#151515]/25 bg-white px-4 font-mono text-[14px] text-[#151515] placeholder:font-sans placeholder:text-[#151515]/35 focus:border-[#151515] focus:outline-none focus:ring-2 focus:ring-[#FFD400]"
      />
    </div>
  );
}

function SnapshotCard({ snapshot, title }: { snapshot: PageToolSnapshot; title: string }) {
  const rows: Array<[string, string]> = [
    ["HTTP status", String(snapshot.httpStatus)],
    ["Final URL", snapshot.finalUrl],
    ["Redirects", snapshot.redirectChain.length ? snapshot.redirectChain.map((r) => `${r.status}`).join(" → ") + ` → ${snapshot.httpStatus}` : "None"],
    ["Response time", `${snapshot.responseTimeMs} ms`],
    ["HTML weight", `${Math.round(snapshot.pageWeightBytes / 1024)} KB`],
    ["Title", snapshot.title ?? "-"],
    ["Meta description", snapshot.metaDescription ?? "-"],
    ["Canonical", snapshot.canonicalUrl ?? "-"],
    ["Robots meta", snapshot.robotsMeta ?? "-"],
    ["H1 headings", snapshot.h1Values.join(" · ") || "-"],
    ["Internal links", String(snapshot.internalLinkCount)],
    ["External links", String(snapshot.externalLinkCount)],
    [
      "Third-party scripts",
      snapshot.scripts.filter((s) => s.isThirdParty).map((s) => s.service ?? s.domain).join(", ") || "None detected",
    ],
  ];

  return (
    <div className="rounded-2xl border border-black/10 bg-white p-6">
      <h3 className="mb-1 text-[15px] font-semibold text-[#151515]">{title}</h3>
      <p className="mb-4 truncate font-mono text-xs text-[#6B6B60]">{snapshot.url}</p>
      <dl className="divide-y divide-black/10">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2.5">
            <dt className="w-36 shrink-0 pt-0.5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#6B6B60]">
              {k}
            </dt>
            <dd className="min-w-0 break-words font-mono text-[13px] text-[#151515]">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function DiffResults({ diffs }: { diffs: SnapshotDiff[] }) {
  if (diffs.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-[#1a7f37]/25 bg-[#e6f4ea] px-6 py-5">
        <CheckCircle2 className="size-6 shrink-0 text-[#1a7f37]" aria-hidden />
        <div>
          <p className="text-[15px] font-semibold text-[#151515]">No meaningful changes detected</p>
          <p className="text-sm text-[#3d3d38]">
            Status, SEO tags, links, scripts, and page weight all match.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[5px_5px_0_#151515]">
      <h3 className="mb-4 text-[15px] font-semibold text-[#151515]">
        {diffs.length} change{diffs.length === 1 ? "" : "s"} detected
      </h3>
      <ul className="divide-y divide-black/10">
        {diffs.map((d, i) => (
          <li key={i} className="py-4">
            <div className="mb-2 flex flex-wrap items-center gap-2.5">
              <SeverityChip severity={d.severity} />
              <span className="text-sm font-semibold text-[#151515]">{d.label}</span>
              <span className="rounded-full border border-black/15 bg-white px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[#6B6B60]">
                {d.category}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="break-words rounded-lg bg-[#e6f4ea] px-3 py-2 font-mono text-[13px] text-[#1a7f37]">
                {d.previous}
              </div>
              <div className="break-words rounded-lg bg-[#fdeaeb] px-3 py-2 font-mono text-[13px] text-[#b91c1c]">
                {d.current}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChangeDetector() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"track" | "compare">("track");

  // Track mode
  const [url, setUrl] = useState(searchParams.get("url") ?? "");
  const [snapshot, setSnapshot] = useState<PageToolSnapshot | null>(null);
  const saved = useSyncExternalStore(subscribeSaved, readSavedSnapshot, () => null);
  const [trackDiffs, setTrackDiffs] = useState<SnapshotDiff[] | null>(null);

  // Compare mode
  const [urlA, setUrlA] = useState("");
  const [urlB, setUrlB] = useState("");
  const [compareResult, setCompareResult] = useState<{
    a: PageToolSnapshot;
    b: PageToolSnapshot;
    diffs: SnapshotDiff[];
  } | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const autoRan = useRef(false);

  const runInspect = useCallback(async (target: string) => {
    setLoading(true);
    setError("");
    setTrackDiffs(null);
    try {
      const snap = await inspect(target);
      setSnapshot(snap);
      track("tool_used", { tool: "website-change-detector", mode: "inspect" });
    } catch (e) {
      setSnapshot(null);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-run when arriving from the hero URL input
  useEffect(() => {
    const fromQuery = searchParams.get("url");
    if (fromQuery && !autoRan.current) {
      autoRan.current = true;
      void runInspect(fromQuery);
    }
  }, [searchParams, runInspect]);

  function saveBaseline() {
    if (!snapshot) return;
    writeSavedSnapshot(snapshot);
    setTrackDiffs(null);
  }

  function clearBaseline() {
    writeSavedSnapshot(null);
    setTrackDiffs(null);
  }

  async function recheck() {
    if (!saved) return;
    setLoading(true);
    setError("");
    try {
      const fresh = await inspect(saved.url);
      setSnapshot(fresh);
      setUrl(saved.url);
      setTrackDiffs(diffSnapshots(saved, fresh));
      track("tool_used", { tool: "website-change-detector", mode: "recheck" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  async function runCompare(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCompareResult(null);
    try {
      const [a, b] = await Promise.all([inspect(urlA), inspect(urlB)]);
      setCompareResult({ a, b, diffs: diffSnapshots(a, b) });
      track("tool_used", { tool: "website-change-detector", mode: "compare" });
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Mode switch */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Tool mode">
        {(
          [
            { id: "track", label: "Track one page over time" },
            { id: "compare", label: "Compare two URLs" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={mode === t.id}
            onClick={() => {
              setMode(t.id);
              setError("");
            }}
            className={cn(
              "rounded-full border px-4 py-2 text-[13px] font-semibold transition-colors",
              mode === t.id
                ? "border-[#151515] bg-[#151515] text-[#FFD400]"
                : "border-black/15 bg-white text-[#6B6B60] hover:border-[#151515]/40 hover:text-[#151515]",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "track" ? (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) void runInspect(url.trim());
              }}
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
            >
              <UrlField
                id="track-url"
                label="Page URL"
                value={url}
                onChange={setUrl}
                placeholder="example.com/pricing"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:bg-[#ffe14d] disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <GitCompareArrows className="size-4" aria-hidden />
                )}
                Inspect page
              </button>
            </form>

            {saved && (
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-black/10 bg-[#F3F1E6] px-4 py-3">
                <Bookmark className="size-4 shrink-0 text-[#151515]" aria-hidden />
                <p className="min-w-0 flex-1 text-[13px] text-[#3d3d38]">
                  Saved snapshot:{" "}
                  <span className="font-mono text-[#151515]">{saved.url}</span>{" "}
                  <span className="text-[#6B6B60]">
                    ({new Date(saved.fetchedAt).toLocaleString()})
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void recheck()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#151515] bg-[#151515] px-4 py-2 text-xs font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a] disabled:opacity-60"
                  >
                    <RefreshCw className="size-3.5" aria-hidden /> Re-check for changes
                  </button>
                  <button
                    onClick={clearBaseline}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#151515]/25 bg-white px-4 py-2 text-xs font-medium text-[#6B6B60] transition-colors hover:border-[#151515] hover:text-[#151515]"
                    aria-label="Delete saved snapshot"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </div>

          {error && <ToolError message={error} />}

          {trackDiffs !== null && <DiffResults diffs={trackDiffs} />}

          {snapshot && (
            <>
              {trackDiffs === null && (
                <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#151515]/15 bg-[#FFF3B0] px-6 py-4">
                  <p className="text-sm text-[#151515]">
                    <span className="font-semibold">Save this snapshot</span> - come back later,
                    re-check the page, and see exactly what changed.
                  </p>
                  <button
                    onClick={saveBaseline}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full border border-[#151515] bg-[#151515] px-5 py-2.5 text-[13px] font-semibold text-[#F5F5F0] transition-colors hover:bg-[#2a2a2a]"
                  >
                    <Bookmark className="size-4" aria-hidden /> Save snapshot
                  </button>
                </div>
              )}
              <SnapshotCard snapshot={snapshot} title="Page snapshot" />
            </>
          )}
        </>
      ) : (
        <>
          <div className="rounded-2xl border border-[#151515] bg-white p-6 shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
            <form onSubmit={runCompare} className="flex flex-col gap-3 lg:flex-row lg:items-end">
              <UrlField
                id="compare-a"
                label="URL A (e.g. production)"
                value={urlA}
                onChange={setUrlA}
                placeholder="example.com/pricing"
              />
              <UrlField
                id="compare-b"
                label="URL B (e.g. staging)"
                value={urlB}
                onChange={setUrlB}
                placeholder="staging.example.com/pricing"
              />
              <button
                type="submit"
                disabled={loading || !urlA.trim() || !urlB.trim()}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-[#151515] bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] shadow-[3px_3px_0_#151515] transition-all hover:bg-[#ffe14d] disabled:opacity-60 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <GitCompareArrows className="size-4" aria-hidden />
                )}
                Compare
              </button>
            </form>
          </div>

          {error && <ToolError message={error} />}

          {compareResult && (
            <>
              <DiffResults diffs={compareResult.diffs} />
              <div className="grid gap-6 lg:grid-cols-2">
                <SnapshotCard snapshot={compareResult.a} title="URL A" />
                <SnapshotCard snapshot={compareResult.b} title="URL B" />
              </div>
            </>
          )}
        </>
      )}

      {/* Product CTA */}
      {(snapshot || compareResult) && (
        <div className="rounded-2xl border border-[#151515] bg-[#151515] px-6 py-10 text-center shadow-[6px_6px_0_#FFD400,6px_6px_0_1px_#151515]">
          <h2 className={`${fontDisplay} text-2xl leading-tight text-[#F5F5F0] sm:text-3xl`}>
            Monitor changes automatically with MyKavo
          </h2>
          <p className="mx-auto mt-2.5 max-w-md text-sm leading-6 text-[#9C9E93]">
            MyKavo re-checks pages like this on a schedule - plus screenshots, visual diffs,
            broken links, and conversion elements - and alerts you when something important
            changes.
          </p>
          <Link
            href="/signup"
            className="mt-6 inline-flex h-11 items-center gap-2 rounded-full bg-[#FFD400] px-6 text-sm font-semibold text-[#151515] transition-colors hover:bg-[#ffe14d]"
            onClick={() => track("cta_clicked", { cta: "tool_to_waitlist" })}
          >
            Start Monitoring Free <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
