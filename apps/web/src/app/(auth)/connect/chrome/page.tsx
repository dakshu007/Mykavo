import type { Metadata } from "next";
import Link from "next/link";
import { AlertCircle, ArrowRight, Check, Globe, Lock, Plus } from "lucide-react";
import { prisma } from "@mykavo/database";
import { googleEnabled } from "@/lib/auth";
import { getSession, getCurrentMembership } from "@/lib/session";
import { getEffectiveWebsiteLimit } from "@/lib/limits";
import { logActivityEvent } from "@/lib/activity/record";
import { recordExtensionMilestone } from "@/lib/extension-tracking";
import { bareHost } from "@/lib/integrations/site-connection";
import {
  connectErrorMessage,
  connectQuery,
  parseExtensionConnectRequest,
  type ExtensionConnectRequest,
} from "@/lib/integrations/extension-connect";
import { GoogleIcon } from "@/components/brand/integration-icons";

// Per request: it depends on the signed-in member and the extension's link.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Protect your website",
  description: "Connect a website to MyKavo from the Chrome extension.",
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

/** A recently created account: the extension flow is what signed them up. */
const NEW_ACCOUNT_MS = 60 * 60 * 1000;

function isNewAccount(createdAt: Date | string): boolean {
  return Date.now() - new Date(createdAt).getTime() < NEW_ACCOUNT_MS;
}

const primaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const secondaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-card text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Eyebrow() {
  return (
    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">
      Chrome extension
    </p>
  );
}

function SiteChip({ req }: { req: ExtensionConnectRequest }) {
  const path = req.pageUrl ? new URL(req.pageUrl).pathname : "/";
  return (
    <div className="mt-3 flex items-center gap-2.5 rounded-field bg-surface px-3.5 py-2.5">
      <Globe className="size-4 shrink-0 text-ink-secondary" aria-hidden />
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink">{req.siteHost}</p>
        {path !== "/" && <p className="truncate font-mono text-xs text-ink-secondary">{path}</p>}
      </div>
    </div>
  );
}

function Problem({ message }: { message: string }) {
  return (
    <>
      <Eyebrow />
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Can&apos;t connect this page</h1>
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

function ErrorNote({ message }: { message: string }) {
  return (
    <div role="alert" className="mt-4 flex gap-2.5 rounded-field bg-critical-soft px-3.5 py-3 text-[13px] text-critical-strong">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p>{message}</p>
        <p className="mt-1 opacity-80">Nothing was changed on your website.</p>
      </div>
    </div>
  );
}

function Hidden({ req }: { req: ExtensionConnectRequest }) {
  return (
    <>
      <input type="hidden" name="site" value={req.siteUrl} />
      <input type="hidden" name="page" value={req.pageUrl ?? ""} />
      <input type="hidden" name="state" value={req.state} />
      <input type="hidden" name="challenge" value={req.challenge} />
      <input type="hidden" name="v" value={req.extensionVersion ?? ""} />
      <input type="hidden" name="install" value={req.installId ?? ""} />
    </>
  );
}

function Permissions() {
  return (
    <div className="mt-5 rounded-field bg-surface px-3.5 py-3">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-ink">
        <Lock className="size-3.5" aria-hidden /> The extension will be able to
      </p>
      <ul className="mt-2 space-y-1.5">
        {["Show this website's monitoring status", "Start a scan when you ask it to"].map((t) => (
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
  );
}

/**
 * Where "Protect this website" in the Chrome extension lands. Signed out:
 * create an account (or sign in) without losing the website. Signed in: one
 * click adds the site (if it's new) and connects the extension to it. The
 * form posts to /api/extension/connect/approve, which re-validates all of it.
 */
export default async function ConnectChromePage({ searchParams }: { searchParams: Promise<Search> }) {
  const raw = await searchParams;
  const check = parseExtensionConnectRequest({
    site: first(raw.site),
    page: first(raw.page),
    state: first(raw.state),
    challenge: first(raw.challenge),
    v: first(raw.v),
    install: first(raw.install),
  });
  if (!check.ok) return <Problem message={check.error} />;
  const req = check.value;
  const error = connectErrorMessage(first(raw.error));
  const via = first(raw.via);
  const here = `/connect/chrome?${connectQuery(req)}`;

  const session = await getSession();
  if (!session) {
    void recordExtensionMilestone(req.installId, { kind: "connect_started", signedIn: false });
    const signupNext = encodeURIComponent(`${here}&via=signup`);
    const loginNext = encodeURIComponent(`${here}&via=login`);
    return (
      <>
        <Eyebrow />
        <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Protect {req.siteHost}</h1>
        <p className="text-sm text-ink-secondary">
          Create your free MyKavo account. Your website comes with you - no copying or pasting.
        </p>
        <SiteChip req={req} />
        <div className="mt-6 space-y-2.5">
          {googleEnabled && (
            <Link href={`/signup?provider=google&next=${signupNext}`} className={secondaryButton}>
              <GoogleIcon className="size-4" /> Continue with Google
            </Link>
          )}
          <Link href={`/signup?next=${signupNext}`} className={primaryButton}>
            Sign up with email <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
        <p className="mt-3 text-center text-[12px] text-ink-faint">Free plan · no credit card</p>
        <p className="mt-5 border-t border-line pt-4 text-center text-[13px] text-ink-secondary">
          Already have an account?{" "}
          <Link href={`/login?next=${loginNext}`} className="font-semibold text-ink underline-offset-2 hover:underline">
            Sign in
          </Link>
        </p>
      </>
    );
  }

  const { workspace, role } = await getCurrentMembership(session.user.id, session.user.name);
  const newAccount = isNewAccount(session.user.createdAt);
  void recordExtensionMilestone(req.installId, { kind: "connect_started", signedIn: !via, userId: session.user.id });
  if (via === "signup" && newAccount) {
    void recordExtensionMilestone(req.installId, { kind: "signed_up", userId: session.user.id });
  }
  if (!error) {
    void logActivityEvent({
      userId: session.user.id,
      workspaceId: workspace.id,
      channel: "chrome",
      type: via ? "extension_auth_completed" : "extension_connect_started",
      label: req.siteHost,
      meta: { version: req.extensionVersion, via, newAccount },
    });
    if (via) {
      // Returning from sign-in still counts as pressing Protect.
      void logActivityEvent({
        userId: session.user.id,
        workspaceId: workspace.id,
        channel: "chrome",
        type: "extension_connect_started",
        label: req.siteHost,
        meta: { version: req.extensionVersion },
      });
    }
  }
  if (role === "VIEWER") {
    return <Problem message="Viewers can't connect websites. Ask an owner or admin of this workspace to connect it." />;
  }

  const [websites, websiteLimit] = await Promise.all([
    prisma.website.findMany({
      where: { workspaceId: workspace.id },
      select: { id: true, name: true, url: true },
      orderBy: { createdAt: "asc" },
    }),
    getEffectiveWebsiteLimit(workspace.id),
  ]);
  const matches = websites.filter((w) => hostOf(w.url) === req.siteHost);
  const others = websites.filter((w) => hostOf(w.url) !== req.siteHost);
  const atLimit = websites.length >= websiteLimit;

  return (
    <>
      <Eyebrow />
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">
        {matches.length > 0 ? `Connect ${req.siteHost}` : `Protect ${req.siteHost}`}
      </h1>
      <p className="text-sm text-ink-secondary">
        {matches.length > 0
          ? "This website is already monitored. Connect it to the extension to see its status anywhere you browse."
          : "MyKavo will monitor it around the clock for SEO, content, visual, link, performance and uptime changes."}
      </p>
      <SiteChip req={req} />
      {error && <ErrorNote message={error} />}

      <form method="post" action="/api/extension/connect/approve" className="mt-6">
        <Hidden req={req} />
        {matches.length === 1 ? (
          <input type="hidden" name="websiteId" value={matches[0].id} />
        ) : matches.length > 1 ? (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-ink">Which MyKavo website is this?</legend>
            <div className="space-y-2">
              {matches.map((w, i) => (
                <label
                  key={w.id}
                  className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 has-checked:border-ink has-checked:bg-surface"
                >
                  <input
                    type="radio"
                    name="websiteId"
                    value={w.id}
                    defaultChecked={i === 0}
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
          </fieldset>
        ) : atLimit ? null : (
          <input type="hidden" name="create" value="1" />
        )}

        {matches.length === 0 && atLimit ? (
          <div className="rounded-field border border-line px-3.5 py-3">
            <p className="text-sm font-medium text-ink">Your plan&apos;s website limit is reached</p>
            <p className="mt-1 text-[13px] text-ink-secondary">
              Upgrade to add {req.siteHost}, or connect the extension to one of your existing websites.
            </p>
            <Link href="/dashboard/billing" className={`${primaryButton} mt-3`}>
              See plans
            </Link>
          </div>
        ) : (
          <>
            <Permissions />
            <button type="submit" className={`${primaryButton} mt-5`}>
              {matches.length > 0 ? (
                <>
                  <Check className="size-4" aria-hidden /> Connect {req.siteHost}
                </>
              ) : (
                <>
                  <Plus className="size-4" aria-hidden /> Add &amp; protect {req.siteHost}
                </>
              )}
            </button>
          </>
        )}
      </form>

      {matches.length === 0 && others.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] text-ink-secondary hover:text-ink">
            It&apos;s one of my existing websites
          </summary>
          <form method="post" action="/api/extension/connect/approve" className="mt-2 space-y-2">
            <Hidden req={req} />
            {others.map((w) => (
              <label
                key={w.id}
                className="flex cursor-pointer items-center gap-3 rounded-field border border-line px-3.5 py-3 has-checked:border-ink has-checked:bg-surface"
              >
                <input type="radio" name="websiteId" value={w.id} required className="size-4 accent-[#151515]" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{w.name}</span>
                  <span className="block truncate font-mono text-xs text-ink-faint">{w.url}</span>
                </span>
              </label>
            ))}
            <button type="submit" className={secondaryButton}>
              Connect selected website
            </button>
          </form>
        </details>
      )}

      <p className="mt-4 text-center text-[13px] text-ink-faint">
        Signed in to <span className="font-medium text-ink-secondary">{workspace.name}</span> ·{" "}
        <Link href="/dashboard" className="font-medium text-ink-secondary hover:text-ink">
          Cancel
        </Link>
      </p>
    </>
  );
}
