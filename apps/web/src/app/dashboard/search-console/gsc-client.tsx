"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw, SearchCode } from "lucide-react";

/** Client widgets for the Search Console dashboard: property picker,
 *  manual sync, sitemaps panel (live fetch), and the URL inspector. */

export function PropertyPicker({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [properties, setProperties] = useState<{ siteUrl: string }[] | null>(null);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/gsc/properties?website=${websiteId}`)
      .then((r) => r.json())
      .then((d) => setProperties(d.properties ?? []))
      .catch(() => setError("Could not load your Search Console properties."));
  }, [websiteId]);

  async function save() {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/gsc/property", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ websiteId, property: selected }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Could not save the property.");
      setBusy(false);
    }
  }

  if (error) return <p className="text-sm text-critical-strong" role="alert">{error}</p>;
  if (!properties)
    return <p className="inline-flex items-center gap-2 text-sm text-ink-secondary"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading properties…</p>;
  if (properties.length === 0)
    return <p className="text-sm text-ink-secondary">This Google account has no Search Console properties. Add the site in Search Console first, then reconnect.</p>;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <select
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
        className="h-10 min-w-64 rounded-field border border-line bg-card px-3 text-[14px] text-ink focus:border-primary focus:outline-none"
      >
        <option value="">Choose a property…</option>
        {properties.map((p) => (
          <option key={p.siteUrl} value={p.siteUrl}>{p.siteUrl}</option>
        ))}
      </select>
      <button
        onClick={save}
        disabled={!selected || busy}
        className="inline-flex h-10 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
      >
        {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
        Save & start first sync
      </button>
    </div>
  );
}

export function SyncButton({ websiteId }: { websiteId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function sync() {
    setBusy(true);
    try {
      await fetch("/api/gsc/sync", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ websiteId }),
      });
      setDone(true);
      setTimeout(() => { setDone(false); router.refresh(); }, 4000);
    } finally {
      setBusy(false);
    }
  }
  return (
    <button
      onClick={sync}
      disabled={busy}
      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line bg-card px-4 text-[13px] font-medium text-ink-secondary hover:text-ink disabled:opacity-60"
    >
      {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : done ? <Check className="size-3.5 text-success-strong" aria-hidden /> : <RefreshCw className="size-3.5" aria-hidden />}
      {done ? "Sync queued" : "Sync now"}
    </button>
  );
}

interface SitemapRow {
  path: string; lastDownloaded?: string; isPending?: boolean;
  errors?: string; warnings?: string;
  contents?: { submitted?: string }[];
}

export function SitemapsPanel({ websiteId }: { websiteId: string }) {
  const [sitemaps, setSitemaps] = useState<SitemapRow[] | null>(null);
  const [note, setNote] = useState("");

  useEffect(() => {
    fetch("/api/gsc/sitemaps", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ websiteId }),
    })
      .then((r) => r.json())
      .then((d) => setSitemaps(d.sitemaps ?? []))
      .catch(() => setSitemaps([]));
  }, [websiteId]);

  async function resubmit(feedpath: string) {
    setNote("");
    const res = await fetch("/api/gsc/resubmit-sitemap", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ websiteId, feedpath }),
    });
    setNote(res.ok ? "Resubmitted - Google will re-read it shortly." : "Resubmit failed.");
  }

  if (!sitemaps)
    return <p className="inline-flex items-center gap-2 text-sm text-ink-secondary"><Loader2 className="size-4 animate-spin" aria-hidden /> Loading sitemaps…</p>;
  if (sitemaps.length === 0)
    return <p className="text-sm text-ink-secondary">No sitemaps submitted for this property.</p>;

  return (
    <div className="space-y-2">
      {sitemaps.map((sitemap) => (
        <div key={sitemap.path} className="flex flex-wrap items-center justify-between gap-2 rounded-tile bg-surface px-4 py-3">
          <div className="min-w-0">
            <a href={sitemap.path} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-[12.5px] text-ink hover:text-primary">{sitemap.path}</a>
            <p className="mt-0.5 text-[11.5px] text-ink-faint">
              {sitemap.isPending ? "Pending" : `Last read ${sitemap.lastDownloaded ? new Date(sitemap.lastDownloaded).toLocaleDateString("en-US", { dateStyle: "medium" }) : "never"}`}
              {" · "}{sitemap.contents?.reduce((sum, c) => sum + Number(c.submitted ?? 0), 0).toLocaleString("en-US")} URLs submitted
              {Number(sitemap.errors ?? 0) > 0 && <span className="text-critical-strong"> · {sitemap.errors} errors</span>}
              {Number(sitemap.warnings ?? 0) > 0 && <span className="text-warning-strong"> · {sitemap.warnings} warnings</span>}
            </p>
          </div>
          <button onClick={() => resubmit(sitemap.path)} className="shrink-0 rounded-full border border-line px-3 py-1.5 text-[12px] font-medium text-ink-secondary hover:text-ink">
            Resubmit
          </button>
        </div>
      ))}
      {note && <p className="text-[12px] text-ink-faint">{note}</p>}
    </div>
  );
}

interface InspectResult {
  verdict?: string; coverageState?: string; lastCrawlTime?: string;
  googleCanonical?: string; userCanonical?: string; robotsTxtState?: string;
  referringSitemaps?: string[]; richResults?: { detectedItems?: unknown[] } | null;
}

export function InspectBox({ websiteId, baseUrl }: { websiteId: string; baseUrl: string }) {
  const [url, setUrl] = useState(baseUrl);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<InspectResult | null>(null);
  const [error, setError] = useState("");

  async function inspect() {
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/gsc/inspect", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ websiteId, url }),
      });
      const data = (await res.json()) as { result?: InspectResult; error?: string };
      if (!res.ok || !data.result) throw new Error(data.error);
      setResult(data.result);
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "Inspection failed - the URL must belong to the connected property.");
    } finally {
      setBusy(false);
    }
  }

  const rows: [string, string][] = result
    ? [
        ["Verdict", result.verdict ?? "-"],
        ["Coverage", result.coverageState ?? "-"],
        ["Last crawl", result.lastCrawlTime ? new Date(result.lastCrawlTime).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }) : "-"],
        ["Google canonical", result.googleCanonical ?? "-"],
        ["Declared canonical", result.userCanonical ?? "-"],
        ["robots.txt", result.robotsTxtState ?? "-"],
        ["Referring sitemaps", result.referringSitemaps?.join(", ") ?? "-"],
        ["Rich results", result.richResults?.detectedItems?.length ? `${result.richResults.detectedItems.length} item types detected` : "None detected"],
      ]
    : [];

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://…"
          className="h-10 min-w-0 flex-1 rounded-field border border-line bg-card px-3.5 font-mono text-[13px] text-ink focus:border-primary focus:outline-none"
        />
        <button
          onClick={inspect}
          disabled={busy || !url}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast hover:bg-primary-hover disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <SearchCode className="size-3.5" aria-hidden />}
          Inspect
        </button>
      </div>
      {error && <p className="mt-2 text-sm text-critical-strong" role="alert">{error}</p>}
      {result && (
        <dl className="mt-3 divide-y divide-line rounded-tile bg-surface px-4">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-4 py-2.5">
              <dt className="w-36 shrink-0 text-[12.5px] font-medium text-ink-secondary">{k}</dt>
              <dd className="min-w-0 break-all text-[12.5px] text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}
