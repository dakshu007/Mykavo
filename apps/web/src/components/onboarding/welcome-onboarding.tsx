"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Globe, Loader2, ShieldCheck } from "lucide-react";
import { SiteFavicon } from "@/components/dashboard/site-favicon";
import { LimitAwareError } from "@/components/dashboard/limit-aware-error";
import { track } from "@/lib/analytics";
import { hostFromInput, siteNameFromHost } from "@/lib/first-run";

/**
 * The first-run form: one address and a name, then on to page selection.
 *
 * Creating the website goes through the same POST /api/websites as the
 * dashboard's Add website (URL validation, the SSRF check, plan limits), and
 * page discovery and the baseline continue in that same wizard, opened in its
 * resume mode for the website just created. Nothing here decides what may be
 * added or scanned.
 */
export function WelcomeOnboarding({ firstName }: { firstName: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [name, setName] = useState("");
  const [nameEdited, setNameEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const host = hostFromInput(url);
  // The name follows the address until the person types their own.
  const shownName = nameEdited ? name : host ? siteNameFromHost(host) : "";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/websites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, name: shownName.trim() || undefined }),
      });
      const data = (await res.json()) as { website?: { id: string }; error?: string };
      if (!res.ok || !data.website) throw new Error(data.error ?? "Something went wrong.");
      track("website_added", { from: "welcome" });
      // Discovery and page selection pick up in the add-website wizard.
      router.push(`/dashboard/websites/new?website=${encodeURIComponent(data.website.id)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-8">
      <form
        onSubmit={submit}
        className="rounded-[22px] border-[1.5px] border-ink bg-card p-5 shadow-[6px_6px_0_var(--color-primary)] sm:p-8"
      >
        <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60 motion-reduce:hidden" />
            <span className="relative inline-flex size-2 rounded-full bg-success" />
          </span>
          {firstName ? `Welcome, ${firstName}` : "Welcome"} / Step 1 of 3
        </p>
        <h1 className="mt-4 pb-1 text-[32px] font-semibold leading-[1.12] tracking-[-0.03em] text-ink sm:text-[40px]">
          What site should MyKavo <span className="mk-highlight">watch</span>?
        </h1>
        <p className="mt-2 max-w-md text-[15px] leading-6 text-ink-secondary">
          Start with the one that would hurt most if it broke. You can add more sites any time.
        </p>

        <label htmlFor="welcome-url" className="mt-7 mb-2 block text-[13px] font-medium text-ink">
          Website address
        </label>
        <div className="flex h-14 items-center gap-3 rounded-xl border border-line bg-surface pl-3 pr-4 transition-shadow focus-within:border-ink focus-within:shadow-[0_0_0_3px_var(--color-primary-soft)]">
          {host ? (
            <SiteFavicon key={host} url={`https://${host}`} name={host} className="size-8" />
          ) : (
            <span
              aria-hidden
              className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border border-dashed border-line text-ink-faint"
            >
              <Globe className="size-4" />
            </span>
          )}
          <input
            id="welcome-url"
            type="text"
            inputMode="url"
            autoComplete="url"
            required
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="yourstore.com"
            className="h-full min-w-0 flex-1 bg-transparent font-mono text-[15px] text-ink placeholder:font-sans placeholder:text-ink-faint focus:outline-none"
          />
          {host && (
            <span className="hidden shrink-0 rounded-full bg-success-soft px-2 py-0.5 font-mono text-[10.5px] uppercase tracking-[0.1em] text-success-strong sm:inline">
              Looks good
            </span>
          )}
        </div>

        <label htmlFor="welcome-name" className="mt-4 mb-2 block text-[13px] font-medium text-ink">
          Site name <span className="font-normal text-ink-faint">(how it shows in your dashboard)</span>
        </label>
        <input
          id="welcome-name"
          type="text"
          value={shownName}
          onChange={(e) => {
            setNameEdited(true);
            setName(e.target.value);
          }}
          maxLength={100}
          placeholder="My store, Client site…"
          className="h-12 w-full rounded-xl border border-line bg-card px-4 text-[15px] text-ink placeholder:text-ink-faint focus:border-ink focus:outline-none"
        />

        {error && (
          <div className="mt-4">
            <LimitAwareError message={error} placement="limit:welcome" />
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 inline-flex h-13 w-full items-center justify-center gap-2 rounded-full border-[1.5px] border-ink bg-primary text-[15px] font-semibold text-[#16181d] shadow-[3px_3px_0_var(--color-ink)] transition-[transform,box-shadow] duration-150 hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-ink)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-none disabled:opacity-60 motion-reduce:transition-none"
        >
          {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {loading ? (
            "Checking the site…"
          ) : (
            <span className="min-w-0 truncate">
              Start watching{host ? <span className="hidden sm:inline"> {host}</span> : null}
            </span>
          )}
          {loading ? null : <ArrowRight className="size-4" aria-hidden />}
        </button>
        <p className="mt-3 flex items-start gap-2 text-[12.5px] leading-5 text-ink-faint">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Only public pages are read. You choose which pages to monitor next.
        </p>

        <div className="mt-6 border-t border-line pt-5 text-center">
          <Link href="/dashboard" className="text-[13.5px] font-medium text-ink-secondary hover:text-ink">
            Skip for now and open the dashboard
          </Link>
        </div>
      </form>

      <div className="flex flex-col gap-5">
        <aside
          aria-label="What happens next"
          className="rounded-[22px] bg-[#0d0f13] p-6 text-[#f3f1e8] ring-1 ring-white/[0.06] sm:p-7"
        >
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[#8b8e98]">What happens next</p>
          <ol className="mt-5 space-y-5">
            {[
              { n: "01", title: "We find your pages", body: "Homepage, sitemaps and robots.txt, in about a minute.", on: true },
              { n: "02", title: "You pick what matters", body: "Home, pricing, checkout, contact: the pages that cost you when they break." },
              { n: "03", title: "Your first scan becomes the baseline", body: "Every scan after it is compared with it, and you hear about the changes that matter." },
            ].map((s) => (
              <li key={s.n} className="flex gap-4">
                <span
                  className={`inline-flex size-9 shrink-0 items-center justify-center rounded-lg font-mono text-[13px] font-semibold ${
                    s.on ? "bg-[#ffd400] text-[#16181d]" : "bg-[#1b1e25] text-[#8b8e98] ring-1 ring-white/[0.07]"
                  }`}
                >
                  {s.n}
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{s.title}</p>
                  <p className="mt-0.5 text-[13px] leading-5 text-[#9a9da6]">{s.body}</p>
                </div>
              </li>
            ))}
          </ol>
          <div className="mt-7 border-t border-white/[0.08] pt-5">
            <p className="flex items-center justify-between gap-3 font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#8b8e98]">
              <span className="truncate">{host ?? "your-site.com"}</span>
              <span className="shrink-0">Pulse starts here</span>
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

        <div className="flex gap-4 rounded-[22px] border border-line bg-card p-5 sm:p-6">
          <span
            aria-hidden
            className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#21759B] text-white"
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm-8.5 10c0-1.2.26-2.35.72-3.38l3.98 10.9A8.5 8.5 0 0 1 3.5 12Zm8.5 8.5c-.83 0-1.64-.12-2.4-.35l2.55-7.4 2.6 7.15.06.12c-.88.31-1.82.48-2.81.48Zm1.17-12.48c.51-.03.97-.08.97-.08.46-.05.4-.73-.05-.7 0 0-1.37.1-2.25.1-.83 0-2.23-.1-2.23-.1-.46-.03-.51.68-.06.7 0 0 .43.05.88.08l1.31 3.6-1.84 5.52-3.07-9.12c.51-.03.97-.08.97-.08.46-.05.4-.73-.05-.7 0 0-1.37.1-2.25.1h-.54A8.49 8.49 0 0 1 12 3.5c2.22 0 4.24.85 5.75 2.24h-.11c-.83 0-1.42.73-1.42 1.5 0 .7.4 1.29.83 1.98.32.57.7 1.3.7 2.35 0 .73-.28 1.58-.65 2.75l-.85 2.85-3.08-9.15Zm3.1 11.33 2.6-7.5c.48-1.21.65-2.18.65-3.04 0-.31-.02-.6-.06-.87A8.48 8.48 0 0 1 20.5 12a8.5 8.5 0 0 1-4.23 7.35Z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="text-[14.5px] font-semibold text-ink">Running WordPress?</p>
            <p className="mt-1 text-[13.5px] leading-5 text-ink-secondary">
              Add the site here, then install the free MyKavo plugin. It shows which plugin, theme or core update
              came right before a change.
            </p>
            <Link
              href="/wordpress-plugin"
              target="_blank"
              className="mt-2 inline-flex items-center gap-1 text-[13.5px] font-medium text-accent hover:underline"
            >
              About the WordPress plugin <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
