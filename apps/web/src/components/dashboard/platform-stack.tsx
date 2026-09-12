import { Layers } from "lucide-react";
import { CATEGORY_ORDER, CATEGORY_LABEL, type TechCategory, type TechEntry } from "@mykavo/shared";
import { CardHeader } from "@/components/ui/card";
import type { PlatformStack } from "@/lib/platform-stack";

/**
 * What this website is built with.
 *
 * Two layers, and the distinction matters. The technology list works on every
 * site - CMS, framework, host, analytics, payments, support. The WordPress
 * component list underneath carries VERSIONS, which is what makes "Elementor
 * 3.18 -> 3.19" attribution possible, and exists only where it can be read.
 *
 * Coverage is admitted rather than hidden. A short list presented as complete
 * is worse than a short list labelled incomplete, because only one of them can
 * be trusted.
 */

const KIND_LABEL: Record<"core" | "theme" | "plugin", string> = {
  core: "Core",
  theme: "Theme",
  plugin: "Plugin",
};

function groupByCategory(entries: readonly TechEntry[]): Array<[TechCategory, TechEntry[]]> {
  const groups = new Map<TechCategory, TechEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return CATEGORY_ORDER.filter((c) => groups.has(c)).map((c) => [c, groups.get(c) as TechEntry[]]);
}

export function PlatformStackPanel({ stack }: { stack: PlatformStack | null }) {
  if (!stack) return null;

  const { technologies } = stack;
  const { components, assetsSeen, assetsVersioned } = stack.fingerprint;
  const isWordPress = stack.fingerprint.platform !== null;
  const unread = assetsSeen - assetsVersioned;

  if (technologies.length === 0 && components.length === 0) return null;

  const groups = groupByCategory(technologies);

  return (
    <>
      <CardHeader
        title="Detected stack"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
            <Layers className="h-3 w-3" aria-hidden />
            {technologies.length} detected
          </span>
        }
      />
      <p className="mb-4 text-sm text-ink-secondary">
        Read from your pages&apos; own markup, assets and response headers — nothing is
        installed on your site. When one of these appears, disappears or changes version,
        MyKavo records it next to whatever else changed in the same scan.
      </p>

      {groups.length > 0 && (
        <div className="space-y-4">
          {groups.map(([category, entries]) => (
            <div key={category}>
              <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                {CATEGORY_LABEL[category]}
              </h4>
              <ul className="divide-y divide-line">
                {entries.map((tech) => (
                  <li
                    key={tech.slug}
                    className="flex items-baseline justify-between gap-3 py-1.5 text-sm"
                  >
                    <span className="min-w-0 truncate font-medium text-ink">{tech.name}</span>
                    <span className="flex shrink-0 items-baseline gap-2">
                      {tech.version && (
                        <span className="font-mono text-[13px] text-ink-secondary">
                          {tech.version}
                        </span>
                      )}
                      <span
                        className="text-[11px] text-ink-faint"
                        title={`Detected from ${tech.evidence}`}
                      >
                        {tech.evidence}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* WordPress components carry versions, which is what makes update
          attribution possible. Only rendered where they could be read. */}
      {components.length > 0 && (
        <div className="mt-5 border-t border-line pt-4">
          <h4 className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            WordPress components
          </h4>
          <ul className="divide-y divide-line">
            {components.map((c) => (
              <li
                key={`${c.kind}:${c.slug}`}
                className="flex items-center justify-between gap-3 py-1.5 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="shrink-0 rounded bg-surface px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-secondary">
                    {KIND_LABEL[c.kind]}
                  </span>
                  <span className="truncate font-medium text-ink">{c.name}</span>
                </span>
                <span className="shrink-0 font-mono text-[13px] text-ink-secondary">
                  {c.version}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {isWordPress && components.length === 0 && (
        <p className="mt-4 text-sm text-ink-secondary">
          This is a WordPress site, but none of its assets carry a readable version — a
          caching or asset-combining plugin is most likely stripping them, so plugin
          update alerts are not available here.
        </p>
      )}

      {isWordPress && unread > 0 && components.length > 0 && (
        <p className="mt-4 text-[12px] text-ink-faint">
          {unread} asset{unread === 1 ? "" : "s"} carried no readable version, so the
          component list may be incomplete.
        </p>
      )}
    </>
  );
}
