"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  CornerDownLeft,
  FileText,
  GitCompareArrows,
  Globe,
  Search,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { ChangeSeverity, ChangeStatus } from "@mykavo/database";
import { ChangeSeverityBadge } from "@/components/dashboard/change-badges";
import {
  filterEntries,
  flattenGroups,
  groupEntries,
  moveIndex,
  staticEntries,
  type PaletteEntry,
  type PaletteSection,
} from "@/lib/command-palette";
import { cn } from "@/lib/utils";

/** Fired by the sidebar hint pill - the palette listens globally. */
const OPEN_EVENT = "mykavo:command-palette-open";

const sectionIcons: Record<PaletteSection, LucideIcon> = {
  Actions: Zap,
  Navigation: Compass,
  Websites: Globe,
  Pages: FileText,
  Changes: GitCompareArrows,
};

interface SearchResponse {
  websites: { id: string; name: string; url: string }[];
  pages: { id: string; url: string; websiteId: string; websiteName: string }[];
  changes: { id: string; title: string; severity: ChangeSeverity; status: ChangeStatus }[];
}

function serverEntries(results: SearchResponse): PaletteEntry[] {
  return [
    ...results.websites.map<PaletteEntry>((site) => ({
      id: `website-${site.id}`,
      section: "Websites",
      label: site.name,
      hint: site.url,
      href: `/dashboard/websites/${site.id}`,
    })),
    ...results.pages.map<PaletteEntry>((page) => ({
      id: `page-${page.id}`,
      section: "Pages",
      label: page.url,
      hint: page.websiteName,
      href: `/dashboard/websites/${page.websiteId}/pages/${page.id}`,
    })),
    ...results.changes.map<PaletteEntry>((change) => ({
      id: `change-${change.id}`,
      section: "Changes",
      label: change.title,
      href: `/dashboard/changes/${change.id}`,
      severity: change.severity,
      status: change.status,
    })),
  ];
}

const statusLabels: Record<ChangeStatus, string> = {
  NEW: "New",
  REVIEWED: "Reviewed",
  APPROVED: "Approved",
  RESOLVED: "Resolved",
  IGNORED: "Ignored",
};

export function CommandPalette({ isBlogAdmin }: { isBlogAdmin: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    function onOpen() {
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(OPEN_EVENT, onOpen);
    };
  }, []);

  // Nothing mounts until first open - zero layout cost on dashboard pages.
  if (!open) return null;
  return <PaletteDialog isBlogAdmin={isBlogAdmin} onClose={() => setOpen(false)} />;
}

function PaletteDialog({
  isBlogAdmin,
  onClose,
}: {
  isBlogAdmin: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  // Body scroll lock while the dialog is mounted.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Debounced workspace search; empty query stays fully client-side (results
  // are cleared in the input's onChange, so this effect never sets state
  // synchronously).
  useEffect(() => {
    const q = query.trim();
    if (!q) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, {
          signal: controller.signal,
        });
        if (!res.ok) return;
        setResults((await res.json()) as SearchResponse);
        // New result set: highlight follows the top result again.
        setActiveIndex(0);
      } catch {
        // Aborted (typing continued) or network failure - keep prior results.
      }
    }, 150);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const groups = useMemo(() => {
    const entries = [
      ...filterEntries(staticEntries(isBlogAdmin), query),
      ...(query.trim() && results ? serverEntries(results) : []),
    ];
    return groupEntries(entries);
  }, [isBlogAdmin, query, results]);

  const flat = useMemo(() => flattenGroups(groups), [groups]);

  // Keep the highlighted option visible while arrowing through a long list.
  useEffect(() => {
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const go = useCallback(
    (entry: PaletteEntry) => {
      onClose();
      router.push(entry.href);
    },
    [onClose, router],
  );

  function onInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => moveIndex(index, 1, flat.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => moveIndex(index, -1, flat.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const entry = flat[activeIndex];
      if (entry) go(entry);
    }
  }

  function onDialogKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    } else if (event.key === "Tab") {
      // The search input is the only focusable control - keep focus on it
      // rather than letting Tab escape to the page behind the backdrop.
      event.preventDefault();
    }
  }

  // Running offsets so each group's options know their flat keyboard index.
  const offsets = useMemo(() => {
    const map = new Map<PaletteSection, number>();
    let total = 0;
    for (const group of groups) {
      map.set(group.section, total);
      total += group.entries.length;
    }
    return map;
  }, [groups]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Search and commands"
        onKeyDown={onDialogKeyDown}
        className="mx-auto mt-[12vh] w-full max-w-xl overflow-hidden rounded-card bg-card shadow-card"
      >
        <div className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-ink-faint" aria-hidden />
          <input
            autoFocus
            value={query}
            onChange={(event) => {
              const value = event.target.value;
              setQuery(value);
              setActiveIndex(0);
              if (!value.trim()) setResults(null);
            }}
            onKeyDown={onInputKeyDown}
            type="text"
            maxLength={100}
            spellCheck={false}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={flat.length > 0 ? optionId(activeIndex) : undefined}
            aria-autocomplete="list"
            aria-label="Search websites, pages, and changes"
            placeholder="Search websites, pages, changes…"
            className="h-12 w-full min-w-0 bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
          />
          <kbd className="shrink-0 rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink-faint">
            esc
          </kbd>
        </div>

        <div
          id="command-palette-listbox"
          role="listbox"
          aria-label="Results"
          className="max-h-[min(60vh,26rem)] overflow-y-auto p-2"
        >
          {flat.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-ink-secondary">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            groups.map((group) => {
              const offset = offsets.get(group.section) ?? 0;
              const Icon = sectionIcons[group.section];
              return (
                <div key={group.section} role="group" aria-label={group.section}>
                  <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    {group.section}
                  </p>
                  {group.entries.map((entry, i) => {
                    const index = offset + i;
                    const active = index === activeIndex;
                    return (
                      <button
                        key={entry.id}
                        type="button"
                        id={optionId(index)}
                        role="option"
                        aria-selected={active}
                        tabIndex={-1}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => go(entry)}
                        className={cn(
                          "flex w-full items-center gap-3 rounded-field px-3 py-2.5 text-left",
                          active ? "bg-primary-soft" : "hover:bg-ink/5",
                        )}
                      >
                        <Icon className="size-4 shrink-0 text-ink-faint" aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-ink">
                            {entry.label}
                          </span>
                          {entry.hint && (
                            <span className="block truncate text-xs text-ink-faint">
                              {entry.hint}
                            </span>
                          )}
                        </span>
                        {entry.severity && (
                          <ChangeSeverityBadge severity={entry.severity} />
                        )}
                        {entry.status && (
                          <span className="shrink-0 text-[11px] font-medium text-ink-faint">
                            {statusLabels[entry.status]}
                          </span>
                        )}
                        {active && (
                          <CornerDownLeft
                            className="size-3.5 shrink-0 text-ink-faint"
                            aria-hidden
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function optionId(index: number): string {
  return `command-palette-option-${index}`;
}

/**
 * Small "Search ⌘K" pill for the sidebar. Dispatches a window event so the
 * palette (mounted once in the dashboard layout) opens without prop drilling.
 */
const noopSubscribe = () => () => {};

export function CommandPaletteTrigger() {
  // Hydration-safe platform check: server snapshot assumes Mac, client
  // snapshot corrects the shortcut label right after hydration.
  const isMac = useSyncExternalStore(
    noopSubscribe,
    () => /Mac|iPhone|iPad/.test(window.navigator.platform),
    () => true,
  );

  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))}
      className="mt-4 flex w-full items-center gap-3 rounded-full border border-line px-4 py-2 text-[13px] font-medium text-ink-faint transition-colors hover:bg-ink/5 hover:text-ink"
    >
      <Search className="size-4 shrink-0" aria-hidden />
      Search
      <kbd className="ml-auto rounded-md bg-surface px-1.5 py-0.5 text-[11px] font-semibold">
        {isMac ? "⌘K" : "Ctrl K"}
      </kbd>
    </button>
  );
}
