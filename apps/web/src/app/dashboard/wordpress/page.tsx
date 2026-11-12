import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { requireSession, getCurrentMembership } from "@/lib/session";
import { canManageMembers } from "@/lib/team";
import { loadConnectedSites } from "@/lib/site-connections";
import { WP_PLUGIN_DIRECTORY_URL, WP_PLUGIN_VERSION } from "@/config/wordpress-plugin";
import { BRAND_MARKS } from "@/components/brand/brand-marks";
import { WpSiteList } from "@/components/dashboard/wordpress/wp-site-list";
import { isOlderVersion, relativeTime } from "@/components/dashboard/wordpress/wp-format";

export const metadata: Metadata = {
  title: "WordPress",
  robots: { index: false },
};

const STEPS = [
  {
    title: "Install the plugin",
    body: "In WordPress go to Plugins, Add New, search for MyKavo, then install and activate it.",
  },
  {
    title: "Press Connect",
    body: "Open MyKavo in the WordPress admin menu and press Connect, then approve it here. Nothing to copy and paste.",
  },
  {
    title: "Update without fear",
    body: "Every plugin, theme and core update is recorded. With Safe Updates (paid plans) your key pages are checked right after each one.",
  },
];

function WordPressMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path fill={BRAND_MARKS.wordpress.hex} d={BRAND_MARKS.wordpress.path} />
    </svg>
  );
}

/**
 * WordPress sites connected with the MyKavo plugin, and how to connect one.
 * A sentence headline and a readout strip (sites, plugin versions, last
 * check-in), then each site with its own icon and the versions its plugin
 * last reported, then the three connect steps.
 */
export default async function WordPressPage() {
  const session = await requireSession();
  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const sites = await loadConnectedSites(workspace.id, "wordpress");
  const now = new Date();
  const canManage = canManageMembers(role);

  const count = sites.length;
  const behind = sites.filter((s) => s.pluginVersion && isOlderVersion(s.pluginVersion, WP_PLUGIN_VERSION));
  const lastSeen = sites
    .map((s) => s.lastUsedAt)
    .filter((v): v is string => Boolean(v))
    .sort()
    .at(-1);
  const wpVersions = [...new Set(sites.map((s) => s.platformVersion).filter((v): v is string => Boolean(v)))];

  const readouts: { label: string; value: string; note: string; warn?: boolean }[] = [
    {
      label: "Connected sites",
      value: String(count),
      note: count === 0 ? "None yet" : `${count === 1 ? "Reports" : "Each reports"} every update`,
    },
    {
      label: "Plugin",
      value: count === 0 ? "-" : behind.length === 0 ? "Up to date" : `${behind.length} behind`,
      note: `Latest is ${WP_PLUGIN_VERSION}`,
      warn: behind.length > 0,
    },
    {
      label: "WordPress",
      value: wpVersions.length === 0 ? "-" : wpVersions.length === 1 ? wpVersions[0] : `${wpVersions.length} versions`,
      note: wpVersions.length > 1 ? wpVersions.join(", ") : "As the plugin reported it",
    },
    {
      label: "Last check-in",
      value: lastSeen ? relativeTime(lastSeen, now) : "-",
      note: lastSeen ? "Most recent across your sites" : "Waiting for a first check-in",
    },
  ];

  return (
    <div className="max-w-5xl">
      <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-faint">
            <WordPressMark className="size-3.5" />
            Integrations / WordPress
          </p>
          <h1 className="mt-1.5 max-w-3xl text-[26px] font-semibold leading-tight tracking-[-0.02em] text-ink sm:text-[28px]">
            {count === 0 ? (
              <>No WordPress sites are connected yet.</>
            ) : (
              <>
                <span className="mk-highlight">
                  {count} WordPress site{count === 1 ? "" : "s"}
                </span>{" "}
                {count === 1 ? "is" : "are"} connected.
              </>
            )}
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-ink-secondary">
            See MyKavo monitoring inside wp-admin, and know which plugin, theme or core update caused a
            change.
            {behind.length > 0
              ? ` ${behind.length === 1 ? "One site runs" : `${behind.length} sites run`} an older plugin: update it from Plugins in wp-admin.`
              : ""}
          </p>
        </div>
        <a
          href={WP_PLUGIN_DIRECTORY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-10 shrink-0 items-center gap-1.5 self-start rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover sm:self-auto"
        >
          Get the plugin
          <ArrowUpRight className="size-3.5" aria-hidden />
        </a>
      </header>

      <dl className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl border border-line bg-card lg:grid-cols-4">
        {readouts.map((r, i) => (
          <div
            key={r.label}
            className={[
              "px-4 py-4 sm:px-5",
              i % 2 === 1 ? "border-l border-line" : "",
              i >= 2 ? "border-t border-line lg:border-t-0" : "",
              i === 2 ? "lg:border-l" : "",
            ].join(" ")}
          >
            <dt className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{r.label}</dt>
            <dd
              className={[
                "mt-1.5 truncate text-[22px] font-semibold tracking-tight",
                r.warn ? "text-warning-strong" : "text-ink",
              ].join(" ")}
            >
              {r.value}
            </dd>
            <dd className="mt-0.5 truncate text-[12px] text-ink-secondary">{r.note}</dd>
          </div>
        ))}
      </dl>

      <section aria-labelledby="wp-sites-title" className="mb-6 overflow-hidden rounded-2xl border border-line bg-card">
        <header className="flex items-end justify-between gap-3 border-b border-line px-5 py-4 sm:px-6">
          <div>
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">Sites</p>
            <h2 id="wp-sites-title" className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
              Connected sites
            </h2>
          </div>
          {count > 0 ? (
            <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">{count} total</p>
          ) : null}
        </header>
        {count > 0 ? (
          <WpSiteList sites={sites} canManage={canManage} nowIso={now.toISOString()} latestPlugin={WP_PLUGIN_VERSION} />
        ) : (
          <div className="flex flex-col items-start gap-3 px-5 py-8 sm:flex-row sm:items-center sm:px-6">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-xl border border-dashed border-line bg-surface">
              <WordPressMark className="size-6 opacity-70" />
            </span>
            <p className="text-[14px] leading-6 text-ink-secondary">
              Nothing connected yet. Follow the three steps below; it takes about a minute.
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="wp-connect-title" className="overflow-hidden rounded-2xl border border-line bg-card">
        <header className="border-b border-line px-5 py-4 sm:px-6">
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-ink-faint">Setup</p>
          <h2 id="wp-connect-title" className="mt-1 text-[16px] font-semibold tracking-tight text-ink">
            How to connect a site
          </h2>
        </header>
        <ol className="grid divide-y divide-line md:grid-cols-3 md:divide-x md:divide-y-0">
          {STEPS.map((s, i) => (
            <li key={s.title} className="px-5 py-5 sm:px-6">
              <span className="inline-flex size-7 items-center justify-center rounded-lg border-[1.5px] border-ink bg-primary font-mono text-[13px] font-bold text-primary-contrast">
                {i + 1}
              </span>
              <p className="mt-3 text-[14px] font-semibold text-ink">{s.title}</p>
              <p className="mt-1 text-[13px] leading-6 text-ink-secondary">{s.body}</p>
            </li>
          ))}
        </ol>
        <div className="flex flex-wrap items-center gap-2 border-t border-line px-5 py-4 sm:px-6">
          <a
            href={WP_PLUGIN_DIRECTORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-semibold text-ink-inverse transition-colors hover:bg-ink-hover"
          >
            Get the plugin on WordPress.org
            <ArrowUpRight className="size-3.5" aria-hidden />
          </a>
          <Link
            href="/wordpress-plugin"
            className="inline-flex h-9 items-center rounded-full border border-line px-4 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
          >
            What the plugin does
          </Link>
        </div>
      </section>
    </div>
  );
}
