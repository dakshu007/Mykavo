"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Globe, Loader2 } from "lucide-react";
import { LogoMark } from "@/components/brand/logo";
import { track } from "@/lib/analytics";

/** Pages watched straight away; more can be added from the website later. */
export const QUICK_START_PAGES = 5;

async function requestJson<T>(url: string, body?: unknown, method = "POST"): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
  return data;
}

/** The first pages to watch: discovery's own order (homepage first), capped. */
export function quickStartPages(found: { url: string }[], budget: number): string[] {
  const n = Math.max(1, Math.min(QUICK_START_PAGES, budget));
  return [...new Set(found.map((p) => p.url))].slice(0, n);
}

const STEPS = ["Checking the website", "Finding its key pages", "Saving the pages to watch", "Starting the first scan"] as const;

/**
 * First thing a new account sees on the dashboard, right after signing in:
 * a website name and URL, one button, and monitoring is on.
 *
 * Signups were leaving without adding a site (9 of 24 trials never did, and
 * the first two signups on Nov 2 did the same): the old path was a checklist
 * card, then the Add website page, then a page-picking step. This does the
 * whole loop in place with the same API calls as the wizard (so the same
 * SSRF checks, plan limits and baseline rules apply on the server): create
 * the website, discover pages, watch the first few, start the baseline, and
 * land on the live scan. More pages can be added from the website any time.
 */
export function QuickStartWebsite({ pageBudget }: { pageBudget: number }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [step, setStep] = useState(-1);
  const [error, setError] = useState("");
  const busy = step >= 0;
  const watchCount = Math.max(1, Math.min(QUICK_START_PAGES, pageBudget));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !url.trim()) return;
    setError("");
    track("cta_clicked", { cta: "quick_start" });
    let websiteId = "";
    try {
      setStep(0);
      const created = await requestJson<{ website: { id: string } }>("/api/websites", {
        url,
        name: name.trim() || undefined,
      });
      websiteId = created.website.id;
      track("website_added", { via: "quick_start" });

      setStep(1);
      const discovery = await requestJson<{ pages: { url: string }[] }>(`/api/websites/${websiteId}/discover`);
      track("discovery_completed", { pages: discovery.pages.length, via: "quick_start" });
      const pages = quickStartPages(discovery.pages, pageBudget);
      if (pages.length === 0) throw new Error("We couldn't find pages on that website. Check the address and try again.");

      setStep(2);
      await requestJson(`/api/websites/${websiteId}/pages`, { pages: pages.map((u) => ({ url: u })) }, "PUT");
    } catch (err) {
      setStep(-1);
      // The website exists but has no pages yet: finish it in the full wizard.
      if (websiteId) {
        router.push(`/dashboard/websites/new?website=${websiteId}`);
        return;
      }
      setError(err instanceof Error ? err.message : "Something went wrong.");
      return;
    }

    // Pages are saved from here on: a baseline that fails to start falls back
    // to the website page, which offers "Run baseline scan".
    setStep(3);
    let scanId: string | null = null;
    try {
      const res = await fetch(`/api/websites/${websiteId}/scan`, { method: "POST" });
      const data = (await res.json()) as { scan?: { id: string }; scanId?: string };
      scanId = res.status === 409 && data.scanId ? data.scanId : res.ok && data.scan ? data.scan.id : null;
    } catch {
      scanId = null;
    }
    if (scanId) track("baseline_started", { websiteId, via: "quick_start" });
    router.push(scanId ? `/dashboard/scans/${scanId}` : `/dashboard/websites/${websiteId}`);
  }

  return (
    <section
      aria-labelledby="quick-start-heading"
      className="rounded-card bg-card px-5 py-8 shadow-card sm:px-10 sm:py-10"
    >
      <div className="mx-auto max-w-xl">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft">
            <LogoMark size={24} aria-hidden />
          </span>
          <div>
            <h2 id="quick-start-heading" className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              Let&apos;s watch your first website
            </h2>
            <p className="text-sm text-ink-secondary">Takes about a minute. You can change everything later.</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-3" noValidate>
          <div>
            <label htmlFor="qs-name" className="mb-1.5 block text-[13px] font-medium text-ink">
              Website name
            </label>
            <input
              id="qs-name"
              type="text"
              autoComplete="organization"
              placeholder="My store"
              maxLength={120}
              value={name}
              disabled={busy}
              onChange={(e) => setName(e.target.value)}
              className="h-11 w-full rounded-xl border border-line bg-surface px-3.5 text-[15px] text-ink placeholder:text-ink-faint focus:border-accent focus:outline-none disabled:opacity-70"
            />
          </div>
          <div>
            <label htmlFor="qs-url" className="mb-1.5 block text-[13px] font-medium text-ink">
              Website URL
            </label>
            <div className="flex h-11 items-center rounded-xl border border-line bg-surface focus-within:border-accent">
              <Globe className="ml-3.5 size-4 shrink-0 text-ink-faint" aria-hidden />
              <input
                id="qs-url"
                type="text"
                inputMode="url"
                autoComplete="url"
                required
                placeholder="yourwebsite.com"
                value={url}
                disabled={busy}
                onChange={(e) => setUrl(e.target.value)}
                className="h-full min-w-0 flex-1 bg-transparent px-2.5 text-[15px] text-ink placeholder:text-ink-faint focus:outline-none disabled:opacity-70"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="text-[13px] font-medium text-critical-strong">
              {error}
            </p>
          )}

          {busy ? (
            <ol className="space-y-2 rounded-xl bg-surface p-4" aria-live="polite">
              {STEPS.map((label, i) => (
                <li key={label} className="flex items-center gap-2.5 text-[14px]">
                  {i < step ? (
                    <Check className="size-4 text-success" aria-hidden />
                  ) : i === step ? (
                    <Loader2 className="size-4 animate-spin text-ink" aria-hidden />
                  ) : (
                    <span className="size-4 rounded-full border border-line" aria-hidden />
                  )}
                  <span className={i <= step ? "text-ink" : "text-ink-faint"}>{label}</span>
                </li>
              ))}
            </ol>
          ) : (
            <button
              type="submit"
              disabled={!url.trim()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary px-6 text-[15px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              Start monitoring
              <ArrowRight className="size-4" aria-hidden />
            </button>
          )}
        </form>

        <p className="mt-4 text-[13px] leading-6 text-ink-secondary">
          MyKavo watches up to {watchCount} key pages, starting with your homepage, takes a baseline now and emails
          you when something important changes. You can add more pages any time. Want to choose the pages yourself?{" "}
          <Link
            href={url.trim() ? `/dashboard/websites/new?url=${encodeURIComponent(url.trim())}` : "/dashboard/websites/new"}
            className="font-medium text-ink underline underline-offset-2"
          >
            Pick pages
          </Link>
          .
        </p>
      </div>
    </section>
  );
}
