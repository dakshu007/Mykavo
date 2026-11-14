"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Link2, Loader2, Search } from "lucide-react";
import { buildUtmUrl, UTM_PRESETS } from "@/lib/utm-links";
import { sectionAnchors } from "@/lib/section-anchors";

export interface BuilderPage {
  path: string;
  group: string;
}

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard blocked: the link is on screen to select.
        }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line bg-card px-3 text-[12.5px] font-medium text-ink hover:bg-surface"
    >
      {copied ? <Check className="size-3.5 text-success-strong" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {copied ? "Copied" : label}
    </button>
  );
}

const field =
  "h-10 w-full rounded-field border border-line bg-card px-3 text-[14px] text-ink outline-none focus-visible:border-ink focus-visible:ring-2 focus-visible:ring-ink/10";

/** Build UTM links for any page or blog post, landing on any section. */
export function UtmBuilder({ pages }: { pages: BuilderPage[] }) {
  const [query, setQuery] = useState("");
  const [path, setPath] = useState("/");
  const [section, setSection] = useState("");
  const [sections, setSections] = useState<{ id: string; label: string }[] | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const [source, setSource] = useState("instagram");
  const [medium, setMedium] = useState("social");
  const [campaign, setCampaign] = useState("");
  const [content, setContent] = useState("");
  const [term, setTerm] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (q ? pages.filter((p) => p.path.toLowerCase().includes(q)) : pages).slice(0, 200);
  }, [pages, query]);

  // Read the chosen page's sections, named exactly as the live tracker names them.
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoadingSections(true);
      setSections(null);
      try {
        const res = await fetch(path, { credentials: "omit" });
        const html = await res.text();
        const doc = new DOMParser().parseFromString(html, "text/html");
        const found = sectionAnchors(doc, { assign: false }).map(({ id, label }) => ({ id, label }));
        if (!cancelled) setSections(found);
      } catch {
        if (!cancelled) setSections([]);
      } finally {
        if (!cancelled) setLoadingSections(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [path]);

  const origin = typeof window === "undefined" ? "https://mykavo.app" : window.location.origin;
  const link = buildUtmUrl({ path, source, medium, campaign, content: content || section, term, section, origin });
  const quick = campaign
    ? UTM_PRESETS.map((p) => ({ preset: p, url: buildUtmUrl({ path, source: p.source, medium: p.medium, campaign, content: content || section, term, section, origin }) }))
    : [];

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
      <div className="rounded-card bg-card p-4 shadow-card">
        <label className="relative block">
          <span className="sr-only">Search pages</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" aria-hidden />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search pages and posts" className={`${field} pl-9`} />
        </label>
        <ul className="mt-3 max-h-[560px] space-y-0.5 overflow-y-auto pr-1" aria-label="Pages">
          {filtered.map((p) => (
            <li key={p.path}>
              <button
                type="button"
                onClick={() => {
                  setPath(p.path);
                  setSection("");
                }}
                aria-pressed={p.path === path}
                className={`flex w-full items-center justify-between gap-2 rounded-field px-2.5 py-2 text-left text-[13px] ${
                  p.path === path ? "bg-ink text-ink-inverse" : "text-ink hover:bg-surface"
                }`}
              >
                <span className="min-w-0 truncate font-mono">{p.path}</span>
                <span className={`shrink-0 text-[11px] ${p.path === path ? "text-ink-inverse/70" : "text-ink-faint"}`}>{p.group}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 ? <li className="px-2.5 py-2 text-[13px] text-ink-secondary">No page matches.</li> : null}
        </ul>
      </div>

      <div className="space-y-6">
        <div className="rounded-card bg-card p-6 shadow-card">
          <p className="font-mono text-[13px] text-ink-secondary">{path}</p>

          <div className="mt-4">
            <p className="text-[13px] font-medium text-ink">Land on a section (optional)</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setSection("")}
                className={`rounded-full px-3 py-1.5 text-[12.5px] ${section === "" ? "bg-ink text-ink-inverse" : "bg-surface text-ink hover:bg-line"}`}
              >
                Top of page
              </button>
              {loadingSections ? <Loader2 className="size-4 animate-spin text-ink-faint" aria-label="Reading sections" /> : null}
              {(sections ?? []).map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSection(s.id)}
                  title={s.label}
                  className={`max-w-[260px] truncate rounded-full px-3 py-1.5 text-[12.5px] ${section === s.id ? "bg-ink text-ink-inverse" : "bg-surface text-ink hover:bg-line"}`}
                >
                  #{s.id}
                </button>
              ))}
              {sections && sections.length === 0 && !loadingSections ? (
                <span className="py-1.5 text-[12.5px] text-ink-faint">No named sections on this page.</span>
              ) : null}
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Campaign (required)</span>
              <input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="black-friday-2026" className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Content (optional)</span>
              <input value={content} onChange={(e) => setContent(e.target.value)} placeholder={section || "post-1, story, banner"} className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Source</span>
              <input value={source} onChange={(e) => setSource(e.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[13px] font-medium text-ink">Medium</span>
              <input value={medium} onChange={(e) => setMedium(e.target.value)} className={`${field} mt-1`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[13px] font-medium text-ink">Term (optional, for paid keywords)</span>
              <input value={term} onChange={(e) => setTerm(e.target.value)} className={`${field} mt-1`} />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {UTM_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSource(p.source);
                  setMedium(p.medium);
                }}
                className={`rounded-full px-3 py-1.5 text-[12.5px] ${source === p.source && medium === p.medium ? "bg-primary text-primary-contrast" : "bg-surface text-ink hover:bg-line"}`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="mt-5 rounded-field border border-line bg-surface p-3">
            {link ? (
              <div className="flex items-start gap-3">
                <Link2 className="mt-0.5 size-4 shrink-0 text-ink-faint" aria-hidden />
                <p className="min-w-0 flex-1 break-all font-mono text-[12.5px] text-ink">{link}</p>
                <CopyButton text={link} />
              </div>
            ) : (
              <p className="text-[13px] text-ink-secondary">Add a campaign name to build the link.</p>
            )}
          </div>
        </div>

        {quick.length > 0 ? (
          <div className="rounded-card bg-card p-6 shadow-card">
            <p className="text-[15px] font-semibold text-ink">The same link for every channel</p>
            <p className="mt-1 text-[13px] text-ink-secondary">One per place you post it, so each channel shows up separately in Google Analytics and on new signups.</p>
            <ul className="mt-4 divide-y divide-line">
              {quick.map(({ preset, url }) =>
                url ? (
                  <li key={preset.id} className="flex items-center gap-3 py-2.5">
                    <span className="w-36 shrink-0 text-[13px] font-medium text-ink">{preset.label}</span>
                    <span className="min-w-0 flex-1 truncate font-mono text-[12px] text-ink-secondary" title={url}>
                      {url}
                    </span>
                    <CopyButton text={url} />
                  </li>
                ) : null,
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
