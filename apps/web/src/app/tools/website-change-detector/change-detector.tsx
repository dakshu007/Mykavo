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
import { SeverityBadge, type Severity } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { track } from "@/lib/analytics";
import { cn } from "@/lib/utils";
import type { PageToolSnapshot, SnapshotDiff } from "@/lib/tools/snapshot";
import { diffSnapshots } from "@/lib/tools/snapshot";

const STORAGE_KEY = "fluxen.tool.savedSnapshot";

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
      <label htmlFor={id} className="label-micro mb-1.5 block">
        {label}
      </label>
      <input
        id={id}
        type="text"
        inputMode="url"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-12 w-full rounded-field border border-line bg-card px-4 font-mono text-[14px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-primary focus:outline-none"
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
    ["Title", snapshot.title ?? "—"],
    ["Meta description", snapshot.metaDescription ?? "—"],
    ["Canonical", snapshot.canonicalUrl ?? "—"],
    ["Robots meta", snapshot.robotsMeta ?? "—"],
    ["H1 headings", snapshot.h1Values.join(" · ") || "—"],
    ["Internal links", String(snapshot.internalLinkCount)],
    ["External links", String(snapshot.externalLinkCount)],
    [
      "Third-party scripts",
      snapshot.scripts.filter((s) => s.isThirdParty).map((s) => s.service ?? s.domain).join(", ") || "None detected",
    ],
  ];

  return (
    <Card>
      <h3 className="mb-1 text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mb-4 truncate font-mono text-xs text-ink-faint">{snapshot.url}</p>
      <dl className="divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 py-2.5">
            <dt className="w-36 shrink-0 text-[13px] font-medium text-ink-secondary">{k}</dt>
            <dd className="min-w-0 break-words font-mono text-[13px] text-ink">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function DiffResults({ diffs }: { diffs: SnapshotDiff[] }) {
  if (diffs.length === 0) {
    return (
      <Card className="flex items-center gap-3">
        <CheckCircle2 className="size-6 shrink-0 text-success" aria-hidden />
        <div>
          <p className="text-[15px] font-semibold text-ink">No meaningful changes detected</p>
          <p className="text-sm text-ink-secondary">
            Status, SEO tags, links, scripts, and page weight all match.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <h3 className="mb-4 text-[15px] font-semibold text-ink">
        {diffs.length} change{diffs.length === 1 ? "" : "s"} detected
      </h3>
      <ul className="divide-y divide-line">
        {diffs.map((d, i) => (
          <li key={i} className="py-4">
            <div className="mb-2 flex items-center gap-2.5">
              <SeverityBadge severity={d.severity as Severity} />
              <span className="text-sm font-semibold text-ink">{d.label}</span>
              <span className="rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
                {d.category}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md bg-success-soft px-3 py-2 font-mono text-[13px] text-green-800 break-words">
                {d.previous}
              </div>
              <div className="rounded-md bg-critical-soft px-3 py-2 font-mono text-[13px] text-red-700 break-words">
                {d.current}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Card>
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
              "rounded-full px-4 py-2 text-[13px] font-medium transition-colors",
              mode === t.id
                ? "bg-ink text-white"
                : "bg-card text-ink-secondary shadow-card hover:text-ink",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === "track" ? (
        <>
          <Card>
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
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
              <div className="mt-4 flex flex-wrap items-center gap-3 rounded-tile bg-surface px-4 py-3">
                <Bookmark className="size-4 shrink-0 text-primary" aria-hidden />
                <p className="min-w-0 flex-1 text-[13px] text-ink-secondary">
                  Saved snapshot:{" "}
                  <span className="font-mono text-ink">{saved.url}</span>{" "}
                  <span className="text-ink-faint">
                    ({new Date(saved.fetchedAt).toLocaleString()})
                  </span>
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => void recheck()}
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs font-medium text-white hover:bg-black disabled:opacity-60"
                  >
                    <RefreshCw className="size-3.5" aria-hidden /> Re-check for changes
                  </button>
                  <button
                    onClick={clearBaseline}
                    className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-xs font-medium text-ink-secondary hover:text-ink"
                    aria-label="Delete saved snapshot"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>
              </div>
            )}
          </Card>

          {error && (
            <Card className="border border-critical/20 bg-critical-soft">
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            </Card>
          )}

          {trackDiffs !== null && <DiffResults diffs={trackDiffs} />}

          {snapshot && (
            <>
              {trackDiffs === null && (
                <div className="flex items-center justify-between gap-4 rounded-card bg-primary-soft px-6 py-4">
                  <p className="text-sm text-ink">
                    <span className="font-semibold">Save this snapshot</span> — come back later,
                    re-check the page, and see exactly what changed.
                  </p>
                  <button
                    onClick={saveBaseline}
                    className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-white hover:bg-primary-hover"
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
          <Card>
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
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-6 text-sm font-medium text-white transition-colors hover:bg-primary-hover disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                ) : (
                  <GitCompareArrows className="size-4" aria-hidden />
                )}
                Compare
              </button>
            </form>
          </Card>

          {error && (
            <Card className="border border-critical/20 bg-critical-soft">
              <p className="text-sm font-medium text-red-700" role="alert">
                {error}
              </p>
            </Card>
          )}

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
        <div className="rounded-card bg-ink px-6 py-8 text-center">
          <h2 className="text-xl font-semibold tracking-tight text-white">
            Monitor changes automatically with Fluxen
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-white/70">
            Fluxen re-checks pages like this on a schedule — plus screenshots, visual diffs,
            broken links, and conversion elements — and alerts you when something important
            changes.
          </p>
          <Link
            href="/#waitlist"
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-ink transition-colors hover:bg-white/90"
            onClick={() => track("cta_clicked", { cta: "tool_to_waitlist" })}
          >
            Start Monitoring Free <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      )}
    </div>
  );
}
