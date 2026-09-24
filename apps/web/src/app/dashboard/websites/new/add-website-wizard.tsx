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

/**
 * Kick off the baseline scan, returning the scan to watch - or null when it
 * could not be started.
 *
 * Deliberately swallows its own failures. By the time this runs the monitored
 * pages are already saved, so the user's work is safe whatever happens here;
 * surfacing "could not queue the scan" as if the whole wizard failed would be
 * a lie, and blocking on it would leave them on a form with nowhere to go. A
 * 409 means a scan is already running, which is a success for our purposes -
 * there is a baseline in flight to watch.
 */
async function startBaseline(websiteId: string): Promise<string | null> {
  try {
    const res = await fetch(`/api/websites/${websiteId}/scan`, { method: "POST" });
    const data = (await res.json()) as { scan?: { id: string }; scanId?: string };
    if (res.status === 409 && data.scanId) return data.scanId;
    return res.ok && data.scan ? data.scan.id : null;
  } catch {
    return null;
  }
}

export function AddWebsiteWizard({
  pageBudget,
  initialUrl = "",
}: {
  pageBudget: number;
  /** Prefill, e.g. from the WordPress plugin's "add this site" link. */
  initialUrl?: string;
}) {
  const router = useRouter();

  const [step, setStep] = useState<"url" | "select">("url");
  const [name, setName] = useState("");
  const [url, setUrl] = useState(initialUrl);
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

  /**
   * Save the page selection and START THE BASELINE, landing on the live scan.
   *
   * The baseline used to be left for the user to find: this saved the pages,
   * pushed to the website page, and stopped. Every new account then had to
   * work out on its own that monitoring had not actually begun yet - which is
   * the whole first-run loop (add a URL, approve a baseline, get the first
   * alert) breaking at step two, one click after signup.
   *
   * Starting it here is safe because the scan route decides the trigger type
   * itself: a website with no finished scan gets BASELINE, which is exempt
   * from the manual-scan plan gate. Nothing about who may scan is decided in
   * this component.
   */
  async function handleSave() {
    if (loading || selected.size === 0) return;
    setLoading(true);
    setError("");
    try {
      setPhase("Saving monitored pages…");
      await requestJson(
        `/api/websites/${websiteId}/pages`,
        { pages: [...selected].map((u) => ({ url: u })) },
        "PUT",
      );

      // From here the pages ARE saved. A baseline that fails to start must
      // therefore never look like a failed save, and must never dead-end:
      // the fallback is the website page, which offers "Run baseline scan".
      setPhase("Starting your baseline scan…");
      const scanId = await startBaseline(websiteId);
      if (scanId) {
        track("baseline_started", { websiteId });
        router.push(`/dashboard/scans/${scanId}`);
      } else {
        router.push(`/dashboard/websites/${websiteId}`);
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
      setPhase("");
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
              className="h-12 w-full rounded-field border border-line bg-card px-4 font-mono text-[14px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:border-accent focus:outline-none"
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
              className="h-12 w-full rounded-field border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none"
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
        <p className="text-[13px] text-ink-faint">
          {loading && phase
            ? phase
            : "Your baseline scan starts straight away. You can change monitored pages anytime."}
        </p>
        <button
          onClick={handleSave}
          disabled={loading || selected.size === 0}
          className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-[15px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" aria-hidden />}
          Start monitoring {selected.size} page{selected.size === 1 ? "" : "s"}
        </button>
      </div>
    </div>
  );
}
