"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Search, ShieldCheck } from "lucide-react";
import { SiteFavicon } from "@/components/dashboard/site-favicon";
import { PageSelector, type SelectablePage } from "@/components/dashboard/page-selector";
import { track } from "@/lib/analytics";
import { LimitAwareError } from "@/components/dashboard/limit-aware-error";

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
  resume,
  connectReturn = null,
}: {
  pageBudget: number;
  /** Prefill, e.g. from the WordPress plugin's "add this site" link. */
  initialUrl?: string;
  /**
   * A website that already exists without pages (added from the Chrome
   * extension): skip creation and go straight to discovery, putting the
   * page the user was on first.
   */
  resume?: { websiteId: string; preferredPage: string | null };
  /**
   * The WordPress consent screen this was opened from. Once the baseline is
   * started, go back there to approve the connection rather than to the
   * scan: the scan keeps running, and the plugin then shows its progress.
   */
  connectReturn?: string | null;
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

  async function discover(id: string, preferredPage: string | null) {
    setPhase("Discovering pages - checking sitemaps and homepage links…");
    const discovery = await requestJson<{
      pages: SelectablePage[];
      warnings: string[];
      truncated: boolean;
    }>(`/api/websites/${id}/discover`);
    track("discovery_completed", { pages: discovery.pages.length });

    let found = discovery.pages;
    if (preferredPage) {
      // The page the user was on goes first (after the homepage), added if
      // discovery didn't reach it.
      const same = (u: string) => u.replace(/\/$/, "") === preferredPage.replace(/\/$/, "");
      const hit = found.find((p) => same(p.url));
      const rest = found.filter((p) => !same(p.url));
      const home = rest.filter((p) => p.source === "homepage");
      found = [...home, hit ?? { url: preferredPage, source: "link" }, ...rest.filter((p) => p.source !== "homepage")];
    }
    setPages(found);
    setWarnings(discovery.warnings);
    setTruncated(discovery.truncated);
    // Pre-select from the top (homepage first) within the plan budget.
    setSelected(new Set(found.slice(0, pageBudget).map((p) => p.url)));
    setStep("select");
  }

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
      await discover(created.website.id, null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
      setPhase("");
    }
  }

  // Resume runs discovery once, on arrival. A failure falls back to the
  // URL step, whose submit reports "already in your workspace" - so it
  // retries discovery directly instead.
  const resumed = useRef(false);
  useEffect(() => {
    if (!resume || resumed.current) return;
    resumed.current = true;
    setWebsiteId(resume.websiteId);
    setLoading(true);
    discover(resume.websiteId, resume.preferredPage)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Something went wrong."))
      .finally(() => {
        setLoading(false);
        setPhase("");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  async function retryResume(e: React.FormEvent) {
    e.preventDefault();
    if (!resume || loading) return;
    setLoading(true);
    setError("");
    try {
      await discover(resume.websiteId, resume.preferredPage);
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
      if (scanId) track("baseline_started", { websiteId });
      if (connectReturn) {
        router.push(connectReturn);
      } else if (scanId) {
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
    // Live preview of the site being added: its icon once the address looks
    // like a real host name.
    const typedHost = (() => {
      const raw = url.trim().replace(/^https?:\/\//i, "").split(/[/?#]/)[0] ?? "";
      return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(raw) ? raw.toLowerCase() : null;
    })();
    return (
      <div className="grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <form
          onSubmit={resume ? retryResume : handleCreate}
          className="rounded-2xl border-[1.5px] border-ink bg-card p-5 shadow-[5px_5px_0_var(--color-primary)] sm:p-7"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">Step 1 of 3</p>
          <h2 className="mt-1.5 text-[22px] font-semibold tracking-tight text-ink">Which website should MyKavo watch?</h2>

          <label htmlFor="website-url" className="mt-6 mb-2 block text-[13px] font-medium text-ink">
            Website address
          </label>
          {/* Styled like a browser's address bar, with the site's icon. */}
          <div className="flex h-14 items-center gap-3 rounded-xl border border-line bg-surface pl-3 pr-4 transition-shadow focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
            {typedHost ? (
              <SiteFavicon key={typedHost} url={`https://${typedHost}`} name={typedHost} className="size-8" />
            ) : (
              <span aria-hidden className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-ink-faint">
                <Globe className="size-4" />
              </span>
            )}
            <input
              id="website-url"
              type="text"
              inputMode="url"
              autoComplete="url"
              required
              autoFocus={!resume}
              readOnly={Boolean(resume)}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="example.com"
              className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:outline-none"
            />
            {typedHost && (
              <span className="hidden shrink-0 rounded-full bg-success-soft px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-success-strong sm:inline">
                Looks good
              </span>
            )}
          </div>

          <div hidden={Boolean(resume)} className="mt-4">
            <label htmlFor="website-name" className="mb-2 block text-[13px] font-medium text-ink">
              Name <span className="font-normal text-ink-faint">(optional)</span>
            </label>
            <input
              id="website-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Client site, My store…"
              className="h-12 w-full rounded-xl border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
            />
          </div>

          {error && (
            <div className="mt-4">
              <LimitAwareError message={error} placement="limit:add-website" />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-primary text-[15px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 motion-reduce:transition-none"
          >
            {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
            {loading ? phase || "Working…" : resume ? "Discover pages" : "Add & discover pages"}
          </button>
          <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-ink-faint">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
            Only public pages are read. Nothing is stored until you choose what to monitor.
          </p>
        </form>

        <aside aria-label="What happens next" className="rounded-2xl bg-[#0d0f13] p-6 text-[#f3f1e8] ring-1 ring-white/[0.06] sm:p-7">
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b8e98]">What happens next</p>
          <ol className="mt-5 space-y-5">
            {[
              { n: "01", title: "We find your pages", body: "Your homepage, robots.txt and sitemaps, in about a minute.", on: true },
              { n: "02", title: "You pick what matters", body: "Home, pricing, checkout, contact: the pages that cost you when they break." },
              { n: "03", title: "First scan becomes the baseline", body: "Every scan after it is compared with it. You hear about changes that matter." },
            ].map((step) => (
              <li key={step.n} className="flex gap-4">
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-[13px] font-semibold ${
                    step.on ? "bg-[#ffd400] text-[#16181d]" : "bg-[#1b1e25] text-[#8b8e98] ring-1 ring-white/[0.07]"
                  }`}
                >
                  {step.n}
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#9a9da6]">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-7 border-t border-white/[0.08] pt-5">
            <p className="flex items-center justify-between font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b8e98]">
              <span>{typedHost ?? "your-site.com"}</span>
              <span>Pulse starts here</span>
            </p>
            <div className="mt-2.5 flex h-7 items-end gap-[3px]" aria-hidden>
              {Array.from({ length: 30 }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-[2px] ${i === 0 ? "h-7 animate-pulse bg-[#ffd400] motion-reduce:animate-none" : "h-5 bg-white/[0.06]"}`}
                />
              ))}
            </div>
          </div>
        </aside>
      </div>
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

      {error && <LimitAwareError message={error} placement="limit:add-pages" />}

      <div className="flex items-center justify-between">
        <p className="text-[13px] text-ink-faint">
          {loading && phase
            ? phase
            : connectReturn
              ? "Your baseline scan starts straight away, then you go back to finish connecting WordPress."
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
