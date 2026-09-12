import { Package } from "lucide-react";
import { CardHeader } from "@/components/ui/card";
import type { PlatformStack } from "@/lib/platform-stack";

/**
 * The stack MyKavo can see, and honestly what it cannot.
 *
 * This panel exists so the feature is visible on day one, before any plugin has
 * been updated. It is also the place where coverage is admitted: if a caching
 * plugin has stripped the versions off the assets, saying so here is far better
 * than a confident, short list that quietly omits half the site.
 */

const KIND_LABEL: Record<"core" | "theme" | "plugin", string> = {
  core: "Core",
  theme: "Theme",
  plugin: "Plugin",
};

export function PlatformStackPanel({ stack }: { stack: PlatformStack | null }) {
  if (!stack || stack.fingerprint.platform === null) return null;

  const { components, assetsSeen, assetsVersioned } = stack.fingerprint;
  const unread = assetsSeen - assetsVersioned;

  return (
    <>
      <CardHeader
        title="Detected stack"
        action={
          <span className="inline-flex items-center gap-1.5 rounded-full bg-surface px-2.5 py-0.5 text-[11px] font-semibold text-ink-secondary">
            <Package className="h-3 w-3" aria-hidden />
            WordPress
          </span>
        }
      />
      <p className="mb-4 text-sm text-ink-secondary">
        Read from the version stamps on your pages&apos; asset URLs — nothing is installed
        on your site. When one of these changes, MyKavo records it next to whatever else
        changed in the same scan, so you can see which update to blame.
      </p>

      {components.length === 0 ? (
        <p className="text-sm text-ink-secondary">
          This is a WordPress site, but none of its assets carry a readable version. A
          caching or asset-combining plugin is most likely stripping them.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {components.map((c) => (
            <li
              key={`${c.kind}:${c.slug}`}
              className="flex items-center justify-between gap-3 py-2 text-sm"
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
      )}

      <p className="mt-4 text-[12px] text-ink-faint">
        {components.length} component{components.length === 1 ? "" : "s"} across{" "}
        {stack.pagesRead} page{stack.pagesRead === 1 ? "" : "s"}.
        {unread > 0 && (
          <>
            {" "}
            {unread} asset{unread === 1 ? "" : "s"} carried no readable version, so this
            list may be incomplete.
          </>
        )}
      </p>
    </>
  );
}
