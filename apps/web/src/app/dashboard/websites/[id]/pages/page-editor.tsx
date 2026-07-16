"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RefreshCw } from "lucide-react";
import { PageSelector, type SelectablePage } from "@/components/dashboard/page-selector";

export function PageEditor({
  websiteId,
  currentPages,
  pageBudget,
}: {
  websiteId: string;
  currentPages: string[];
  pageBudget: number;
}) {
  const router = useRouter();
  const [pages, setPages] = useState<SelectablePage[]>(
    currentPages.map((url) => ({ url, source: "monitored" as const })),
  );
  const [selected, setSelected] = useState<Set<string>>(new Set(currentPages));
  const [warnings, setWarnings] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discovered, setDiscovered] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const ran = useRef(false);

  const runDiscovery = useCallback(async () => {
    setDiscovering(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/discover`, { method: "POST" });
      const data = (await res.json()) as {
        pages?: SelectablePage[];
        warnings?: string[];
        truncated?: boolean;
        error?: string;
      };
      if (!res.ok || !data.pages) throw new Error(data.error ?? "Discovery failed.");
      setPages((prev) => {
        const known = new Set(prev.map((p) => p.url));
        const fresh = data.pages!.filter((p) => !known.has(p.url));
        return [...prev, ...fresh];
      });
      setWarnings(data.warnings ?? []);
      setTruncated(data.truncated ?? false);
      setDiscovered(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed.");
    } finally {
      setDiscovering(false);
    }
  }, [websiteId]);

  // Discover once on mount so the list includes fresh site pages.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    void runDiscovery();
  }, [runDiscovery]);

  async function handleSave() {
    if (saving || selected.size === 0) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}/pages`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pages: [...selected].map((u) => ({ url: u })) }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not save pages.");
      router.push(`/dashboard/websites/${websiteId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save pages.");
      setSaving(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {discovering && !discovered && (
        <p className="flex items-center gap-2 text-sm text-ink-secondary" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Discovering pages - checking sitemaps and homepage links…
        </p>
      )}

      <PageSelector
        pages={pages}
        setPages={setPages}
        selected={selected}
        setSelected={setSelected}
        pageBudget={pageBudget}
        warnings={warnings}
        truncated={truncated}
      />

      {error && (
        <p className="text-sm text-critical-strong" role="alert">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={() => void runDiscovery()}
          disabled={discovering}
          className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-60"
        >
          {discovering ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-3.5" aria-hidden />
          )}
          Re-run discovery
        </button>
        <button
          onClick={handleSave}
          disabled={saving || selected.size === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {saving && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Save {selected.size} page{selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
