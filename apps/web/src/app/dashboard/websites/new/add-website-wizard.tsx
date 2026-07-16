"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { PageSelector, type SelectablePage } from "@/components/dashboard/page-selector";
import { track } from "@/lib/analytics";

async function requestJson<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

export function AddWebsiteWizard({ pageBudget }: { pageBudget: number }) {
  const router = useRouter();

  const [step, setStep] = useState<"url" | "select">("url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [websiteId, setWebsiteId] = useState("");
  const [pages, setPages] = useState<SelectablePage[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("");
  const [error, setError] = useState("");

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      setPhase("Validating URL…");
      const created = await requestJson<{ website: { id: string } }>("/api/websites", {
        url,
        name: name || undefined,
      });
      setWebsiteId(created.website.id);
      track("website_added");

      setPhase("Discovering pages - checking sitemaps and homepage links…");
      const discovery = await requestJson<{
        pages: SelectablePage[];
        warnings: string[];
        truncated: boolean;
      }>(`/api/websites/${created.website.id}/discover`);
      track("discovery_completed", { pages: discovery.pages.length });

      setPages(discovery.pages);
      setWarnings(discovery.warnings);
      setTruncated(discovery.truncated);
      // Pre-select from the top (homepage first) within the plan budget.
      setSelected(new Set(discovery.pages.slice(0, pageBudget).map((p) => p.url)));
      setStep("select");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setPhase("");
    }
  }

  async function handleSave() {
    if (loading || selected.size === 0) return;
    setLoading(true);
    setError("");
    try {
      await requestJson(
        `/api/websites/${websiteId}/pages`,
        { pages: [...selected].map((u) => ({ url: u })) },
        "PUT",
      );
      router.push(`/dashboard/websites/${websiteId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  if (step === "url") {
    return (
      <Card className="max-w-xl">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label htmlFor="website-url" className="mb-1.5 block text-[13px] font-medium text-ink">
              Website URL
            </label>
            <input
              id="website-url"
              type="text"
              inputMode="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="h-12 w-full rounded-field border border-line bg-card px-4 font-mono text-[14px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label htmlFor="website-name" className="mb-1.5 block text-[13px] font-medium text-ink">
              Name <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="website-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client site, My store…"
              className="h-12 w-full rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
            />
          </div>
          {error && (
            <p className="text-sm text-critical-strong" role="alert">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Globe className="size-4" aria-hidden />
            )}
            {loading ? phase || "Working…" : "Add & discover pages"}
          </button>
          <p className="text-[13px] leading-5 text-ink-faint">
            MyKavo fetches the homepage, robots.txt, and sitemaps to find your pages. Only
            public pages are read - nothing is stored until you choose what to monitor.
          </p>
        </form>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl space-y-4">
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

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-faint">You can change monitored pages anytime.</p>
        <button
          onClick={handleSave}
          disabled={loading || selected.size === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Monitor {selected.size} page{selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
