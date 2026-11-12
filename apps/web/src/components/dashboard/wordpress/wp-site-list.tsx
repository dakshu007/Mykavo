"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Loader2 } from "lucide-react";
import type { ConnectedSiteView } from "@/components/dashboard/connected-sites";
import { SiteFavicon } from "@/components/dashboard/site-favicon";
import { cn } from "@/lib/utils";
import { isOlderVersion, relativeTime } from "./wp-format";

function shortDate(iso: string | null | undefined): string {
  if (!iso) return "unknown";
  return new Date(iso).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" });
}

function host(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * The WordPress sites connected with the MyKavo plugin: each with its own
 * icon, the versions the plugin last reported and when it last checked in,
 * and the same Disconnect as before (DELETE /api/site-connections/:id).
 *
 * Relative times are worked out against `nowIso` from the server, so the
 * server and browser render the same text.
 */
export function WpSiteList({
  sites,
  canManage,
  nowIso,
  latestPlugin,
}: {
  sites: ConnectedSiteView[];
  canManage: boolean;
  nowIso: string;
  latestPlugin: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const now = new Date(nowIso);

  async function disconnect(site: ConnectedSiteView) {
    if (
      !window.confirm(
        `Disconnect ${site.siteUrl}? The plugin on that site stops showing monitoring until it's connected again.`,
      )
    ) {
      return;
    }
    setBusy(site.id);
    setError(null);
    const res = await fetch(`/api/site-connections/${site.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError("Couldn't disconnect that site. Try again.");
      return;
    }
    router.refresh();
  }

  return (
    <div>
      <ul className="divide-y divide-line">
        {sites.map((site) => {
          const name = site.siteName?.trim() || host(site.siteUrl);
          const behind = site.pluginVersion ? isOlderVersion(site.pluginVersion, latestPlugin) : false;
          return (
            <li key={site.id} className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
              <div className="flex min-w-0 flex-1 items-start gap-3.5">
                <SiteFavicon url={site.siteUrl} name={name} className="size-11 rounded-xl" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{name}</p>
                    <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-0.5 text-[11px] font-semibold text-success-strong">
                      <span aria-hidden className="size-1.5 rounded-full bg-success" />
                      Connected
                    </span>
                  </div>
                  <a
                    href={site.siteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-0.5 inline-flex max-w-full items-center gap-1 truncate font-mono text-[12px] text-ink-secondary hover:text-ink"
                  >
                    {host(site.siteUrl)}
                    <ArrowUpRight className="size-3 shrink-0" aria-hidden />
                  </a>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11.5px]">
                    {site.pluginVersion ? (
                      <span
                        className={cn(
                          "rounded-md border px-1.5 py-0.5 font-mono",
                          behind
                            ? "border-warning/40 bg-warning-soft text-warning-strong"
                            : "border-line text-ink-secondary",
                        )}
                        title={behind ? `Version ${latestPlugin} is available` : "Latest version"}
                      >
                        Plugin {site.pluginVersion}
                        {behind ? ` · ${latestPlugin} available` : ""}
                      </span>
                    ) : null}
                    {site.platformVersion ? (
                      <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-ink-secondary">
                        WordPress {site.platformVersion}
                      </span>
                    ) : null}
                    <span className="rounded-md border border-line px-1.5 py-0.5 text-ink-secondary">
                      Monitors {site.websiteName}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 sm:justify-end">
                <dl className="text-left text-[12px] sm:text-right">
                  <dt className="sr-only">Last check-in</dt>
                  <dd className="font-medium text-ink">
                    {site.lastUsedAt ? `Checked in ${relativeTime(site.lastUsedAt, now)}` : "Not checked in yet"}
                  </dd>
                  <dt className="sr-only">Connected</dt>
                  <dd className="mt-0.5 text-ink-faint">
                    Connected {shortDate(site.createdAt ?? site.connectedAt)}
                    {site.createdByName ? ` by ${site.createdByName}` : ""}
                  </dd>
                </dl>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => disconnect(site)}
                    disabled={busy !== null}
                    className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:border-critical/40 hover:text-critical disabled:opacity-50"
                  >
                    {busy === site.id && <Loader2 className="size-3 animate-spin" aria-hidden />}
                    Disconnect
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {error && <p className="px-5 pb-4 text-sm text-critical sm:px-6">{error}</p>}
    </div>
  );
}
