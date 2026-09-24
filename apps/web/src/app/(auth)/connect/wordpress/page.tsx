import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, Globe, Lock, Plus } from "lucide-react";
import { prisma } from "@mykavo/database";
import { getSession, getCurrentMembership } from "@/lib/session";
import { bareHost, parseConnectRequest } from "@/lib/integrations/site-connection";

export const metadata: Metadata = {
  title: "Connect WordPress",
  description: "Connect your WordPress site to MyKavo.",
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | null {
  return typeof value === "string" ? value : null;
}

function hostOf(url: string): string | null {
  try {
    return bareHost(new URL(url).hostname);
  } catch {
    return null;
  }
}

function Problem({ message }: { message: string }) {
  return (
    <>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Can&apos;t connect this site</h1>
      <p className="text-sm text-ink-secondary">{message}</p>
      <Link
        href="/dashboard"
        className="mt-6 inline-flex h-10 items-center rounded-full border border-line px-5 text-[13px] font-medium text-ink-secondary hover:text-ink"
      >
        Go to dashboard
      </Link>
    </>
  );
}

/**
 * The consent screen the MyKavo WordPress plugin opens. A signed-in member
 * picks which MyKavo website this WordPress site is, and approves. The form
 * posts to /api/wp/v1/connect/approve, which re-validates everything here.
 */
export default async function ConnectWordPressPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const raw = await searchParams;
  const params = {
    site: first(raw.site),
    return: first(raw.return),
    state: first(raw.state),
    challenge: first(raw.challenge),
    name: first(raw.name),
    pv: first(raw.pv),
    wpv: first(raw.wpv),
  };
  const check = parseConnectRequest(params);
  if (!check.ok) return <Problem message={check.error} />;
  const req = check.value;

  const session = await getSession();
  if (!session) {
    const query = new URLSearchParams(
      Object.entries(params).filter((e): e is [string, string] => typeof e[1] === "string"),
    ).toString();
    redirect(`/login?next=${encodeURIComponent(`/connect/wordpress?${query}`)}`);
  }

  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  if (role === "VIEWER") {
    return (
      <Problem message="Viewers can't connect sites. Ask an owner or admin of this workspace to connect it." />
    );
  }

  const websites = await prisma.website.findMany({
    where: { workspaceId: workspace.id },
    select: { id: true, name: true, url: true },
    orderBy: { createdAt: "asc" },
  });
  const matches = websites.filter((w) => hostOf(w.url) === req.siteHost);
  const others = websites.filter((w) => hostOf(w.url) !== req.siteHost);
  const cancelUrl = (() => {
    const url = new URL(req.returnUrl);
    url.searchParams.set("mykavo_error", "cancelled");
    url.searchParams.set("mykavo_state", req.state);
    return url.toString();
  })();
  const addUrl = `/dashboard/websites/new?url=${encodeURIComponent(req.siteUrl)}`;

  const hidden = (
    <>
      <input type="hidden" name="site" value={params.site ?? ""} />
      <input type="hidden" name="return" value={params.return ?? ""} />
      <input type="hidden" name="state" value={params.state ?? ""} />
      <input type="hidden" name="challenge" value={params.challenge ?? ""} />
      <input type="hidden" name="name" value={params.name ?? ""} />
      <input type="hidden" name="pv" value={params.pv ?? ""} />
      <input type="hidden" name="wpv" value={params.wpv ?? ""} />
    </>
  );

  return (
    <>
      <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
        WordPress plugin
      </p>
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Connect this site to MyKavo</h1>
      <div className="mt-3 flex items-center gap-2.5 rounded-field bg-surface px-3.5 py-2.5">
        <Globe className="size-4 shrink-0 text-ink-secondary" aria-hidden />
        <div className="min-w-0">
          {req.siteName && <p className="truncate text-sm font-medium text-ink">{req.siteName}</p>}
          <p className="truncate font-mono text-xs text-ink-secondary">{req.siteUrl}</p>
        </div>
      </div>

      {matches.length === 0 ? (
        <div className="mt-6">
          <p className="text-sm text-ink">
            <span className="font-semibold">{req.siteHost}</span> isn&apos;t monitored in{" "}
            <span className="font-semibold">{workspace.name}</span> yet.
          </p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Add it first - it takes a minute - then press Connect in WordPress again.
          </p>
          <Link
            href={addUrl}
            className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            <Plus className="size-4" aria-hidden /> Add {req.siteHost} to MyKavo
          </Link>
        </div>
      ) : null}

      {websites.length > 0 && (
        <form method="post" action="/api/wp/v1/connect/approve" className="mt-6">
          {hidden}
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">
              {matches.length > 0 ? "Which MyKavo website is this?" : "Or connect it to an existing website"}
            </legend>
            <div className="space-y-2">
              {[...matches, ...(matches.length > 0 ? [] : others)].map((w, i) => (
                <label
                  key={w.id}
                  className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 has-checked:border-ink has-checked:bg-surface"
                >
                  <input
                    type="radio"
                    name="websiteId"
                    value={w.id}
                    defaultChecked={i === 0 && matches.length > 0}
                    required
                    className="size-4 accent-[#151515]"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                    <span className="block truncate font-mono text-xs text-ink-faint">{w.url}</span>
                  </span>
                </label>
              ))}
            </div>
            {matches.length > 0 && others.length > 0 && (
              <details className="mt-2">
                <summary className="cursor-pointer text-[13px] text-ink-secondary hover:text-ink">
                  Another website
                </summary>
                <div className="mt-2 space-y-2">
                  {others.map((w) => (
                    <label
                      key={w.id}
                      className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 has-checked:border-ink has-checked:bg-surface"
                    >
                      <input type="radio" name="websiteId" value={w.id} className="size-4 accent-[#151515]" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                        <span className="block truncate font-mono text-xs text-ink-faint">{w.url}</span>
                      </span>
                    </label>
                  ))}
                </div>
              </details>
            )}
          </fieldset>

          <div className="mt-5 rounded-field bg-surface px-3.5 py-3">
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
              <Lock className="size-3.5" aria-hidden /> The plugin will be able to
            </p>
            <ul className="mt-2 space-y-1.5">
              {[
                "See this website's status, changes and screenshots",
                "Review, approve or ignore its changes, and run scans",
              ].map((t) => (
                <li key={t} className="flex items-start gap-2 text-[13px] text-ink-secondary">
                  <Check className="mt-0.5 size-3.5 shrink-0 text-success" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[12px] text-ink-faint">
              Nothing else - not your other websites, billing or team. Disconnect anytime.
            </p>
          </div>

          <button
            type="submit"
            className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            Connect
          </button>
        </form>
      )}

      <p className="mt-4 text-center text-[13px] text-ink-faint">
        Connecting to <span className="font-medium text-ink-secondary">{workspace.name}</span> ·{" "}
        {/* A full navigation back to wp-admin, which is a different site. */}
        <a href={cancelUrl} className="font-medium text-ink-secondary hover:text-ink">
          Cancel
        </a>
      </p>
    </>
  );
}
