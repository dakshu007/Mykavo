import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AlertCircle, Check, Eye, Lock, Sparkles } from "lucide-react";
import { getCurrentMembership, getSession } from "@/lib/session";
import { authorizeQuery, resolveAuthorize, workspaceChoices } from "@/lib/mcp/oauth-authorize";

// Per request: depends on the signed-in person and the app's link.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Connect an AI assistant",
  description: "Allow an AI assistant to read your MyKavo monitoring data.",
  robots: { index: false },
};

type Search = Record<string, string | string[] | undefined>;

const first = (v: string | string[] | undefined): string | null => (typeof v === "string" ? v : null);

const primaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-primary text-sm font-semibold text-primary-contrast transition-colors hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";
const secondaryButton =
  "inline-flex h-11 w-full items-center justify-center gap-2.5 rounded-full border border-line bg-card text-sm font-medium text-ink transition-colors hover:bg-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink";

function Eyebrow() {
  return (
    <p className="mb-2 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-ink-faint">AI assistant</p>
  );
}

function Fatal({ message }: { message: string }) {
  return (
    <>
      <Eyebrow />
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">This link can&apos;t be used</h1>
      <div className="mt-4 flex gap-2.5 rounded-field border border-line bg-surface px-3.5 py-3">
        <AlertCircle className="mt-0.5 size-4 shrink-0 text-ink-secondary" aria-hidden />
        <p className="text-[13px] text-ink-secondary">{message}</p>
      </div>
      <Link href="/dashboard/ai-assistants" className={`${secondaryButton} mt-5`}>
        AI assistant setup help
      </Link>
    </>
  );
}

export default async function AuthorizePage({ searchParams }: { searchParams: Promise<Search> }) {
  const sp = await searchParams;
  const params = Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, first(v)]));
  const state = await resolveAuthorize(params);
  if (state.kind === "fatal") return <Fatal message={state.message} />;
  if (state.kind === "error") redirect(state.redirectTo);

  const { req, clientName, destination } = state;
  const session = await getSession();
  if (!session) {
    redirect(`/login?next=${encodeURIComponent(`/oauth/authorize?${authorizeQuery(req)}`)}`);
  }

  const current = await getCurrentMembership(session.user.id, session.user.name);
  const choices = await workspaceChoices(session.user.id);
  const requested = first(sp.ws);
  const selected = choices.find((c) => c.id === requested) ?? choices.find((c) => c.id === current.workspace.id) ?? choices[0];
  if (!selected) return <Fatal message="Your account has no workspace yet. Open the MyKavo dashboard once, then try again." />;

  const appLabel = destination.knownApp ?? clientName;
  const others = choices.filter((c) => c.id !== selected.id);

  return (
    <>
      <Eyebrow />
      <h1 className="mb-1 text-xl font-semibold tracking-tight text-ink">Connect {appLabel} to MyKavo</h1>
      <p className="text-sm text-ink-secondary">
        {appLabel} will be able to answer questions about the websites in{" "}
        <span className="font-medium text-ink">{selected.name}</span>.
      </p>

      <div className="mt-4 rounded-field border border-line px-3.5 py-3">
        <p className="text-[13px] font-medium text-ink">{clientName}</p>
        <p className="mt-0.5 text-xs text-ink-faint">
          {destination.knownApp
            ? `Returns you to ${destination.label}`
            : destination.local
              ? `Returns you to ${destination.label}`
              : `Unverified app. Returns you to ${destination.label}. Only continue if you started this from that site.`}
        </p>
      </div>

      {selected.aiAssistants ? (
        <>
          <ul className="mt-4 space-y-2 text-[13px] text-ink-secondary">
            <li className="flex gap-2">
              <Eye className="mt-0.5 size-3.5 shrink-0 text-ink" aria-hidden />
              Read websites, detected changes, scans, site audits and AI crawler visits
            </li>
            <li className="flex gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-ink" aria-hidden />
              Read-only: it can&apos;t change settings, approve changes or start scans
            </li>
            <li className="flex gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-ink" aria-hidden />
              Disconnect any time in AI assistants in your dashboard
            </li>
          </ul>
          <form method="post" action="/api/oauth/approve" className="mt-5 space-y-2.5">
            <input type="hidden" name="query" value={authorizeQuery(req)} />
            <input type="hidden" name="workspaceId" value={selected.id} />
            <button type="submit" name="decision" value="allow" className={primaryButton}>
              <Check className="size-4" aria-hidden /> Allow
            </button>
            <button type="submit" name="decision" value="deny" className={secondaryButton}>
              Cancel
            </button>
          </form>
        </>
      ) : (
        <div className="mt-4 rounded-field border border-line px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
            <Sparkles className="size-4" aria-hidden /> AI assistants are part of Pro and Agency
          </p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            Upgrade {selected.name} to ask ChatGPT, Claude and other assistants about your websites.
          </p>
          <Link href="/dashboard/billing" className={`${primaryButton} mt-3`}>
            See plans
          </Link>
          <form method="post" action="/api/oauth/approve" className="mt-2">
            <input type="hidden" name="query" value={authorizeQuery(req)} />
            <input type="hidden" name="workspaceId" value={selected.id} />
            <button type="submit" name="decision" value="deny" className={secondaryButton}>
              Cancel
            </button>
          </form>
        </div>
      )}

      {others.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-[13px] text-ink-secondary hover:text-ink">Use another workspace</summary>
          <ul className="mt-2 space-y-1.5">
            {others.map((w) => (
              <li key={w.id}>
                <Link
                  href={`/oauth/authorize?${authorizeQuery(req, { ws: w.id })}`}
                  className="flex items-center justify-between rounded-field border border-line px-3.5 py-2.5 text-sm text-ink hover:bg-surface"
                >
                  <span className="truncate">{w.name}</span>
                  {!w.aiAssistants && <span className="text-xs text-ink-faint">Needs Pro</span>}
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}

      <p className="mt-4 text-center text-[13px] text-ink-faint">
        Signed in as <span className="font-medium text-ink-secondary">{session.user.email}</span>
      </p>
    </>
  );
}
