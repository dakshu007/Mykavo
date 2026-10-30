"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, Loader2, Plug, Plus, Sparkles, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ConnectionView {
  id: string;
  appName: string;
  connectedBy: string;
  mine: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface McpUsageView {
  today: number;
  last30: number;
  dailyCap: number | null;
}

type Client = "chatgpt" | "claude" | "claude-code" | "other";

const CLIENTS: Array<{ id: Client; label: string }> = [
  { id: "chatgpt", label: "ChatGPT" },
  { id: "claude", label: "Claude" },
  { id: "claude-code", label: "Claude Code" },
  { id: "other", label: "Cursor & others" },
];

const QUESTIONS = [
  "Is anything wrong with my websites right now?",
  "What changed on my sites this week?",
  "Show the critical changes on example.com and what caused them.",
  "Summarise the latest site audit for example.com - what should I fix first?",
  "Which AI crawlers read example.com this month?",
  "Is any site blocking ChatGPT or Claude in robots.txt?",
];

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setDone(true);
          setTimeout(() => setDone(false), 1500);
        } catch {
          // Clipboard blocked: the text is on screen to select by hand.
        }
      }}
      className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink"
    >
      {done ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
      {done ? "Copied" : label}
    </button>
  );
}

function CodeBlock({ code }: { code: string }) {
  return (
    <div className="relative mt-2">
      <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-field bg-[#0f1115] p-4 pr-24 font-mono text-[12px] leading-5 text-[#e8e6dc]">
        {code}
      </pre>
      <div className="absolute right-2 top-2 [&_button]:border-white/15 [&_button]:bg-white/5 [&_button]:text-white/80">
        <CopyButton text={code} />
      </div>
    </div>
  );
}

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="mt-3 space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2.5 text-[13px] leading-5 text-ink-secondary">
          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-surface text-[11px] font-semibold text-ink">
            {i + 1}
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ol>
  );
}

function SectionTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
      <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-contrast">
        {n}
      </span>
      {children}
    </h2>
  );
}

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

function AskExamples({ endpoint }: { endpoint: string }) {
  return (
    <>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">
        {QUESTIONS.map((q) => (
          <li key={q} className="rounded-tile bg-surface px-3.5 py-2.5 text-[13px] text-ink">
            &ldquo;{q}&rdquo;
          </li>
        ))}
      </ul>
      <p className="mt-4 text-[12px] text-ink-faint">
        Read-only: assistants can look, never change settings, approve changes or start scans. Server URL:{" "}
        <span className="font-mono">{endpoint}</span>
      </p>
    </>
  );
}

export function McpPanel({
  endpoint,
  allowed,
  planName,
  initialKeys,
  initialConnections,
  usage,
  canManage,
  notReady,
}: {
  endpoint: string;
  allowed: boolean;
  planName: string;
  initialKeys: ApiKeyView[];
  initialConnections: ConnectionView[];
  usage: McpUsageView | null;
  canManage: boolean;
  notReady: string | null;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [connections, setConnections] = useState(initialConnections);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(notReady);
  const [secret, setSecret] = useState<string | null>(null);
  const [client, setClient] = useState<Client>("chatgpt");

  if (!allowed) {
    return (
      <div className="space-y-6">
        <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
          <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            <Sparkles className="size-4" aria-hidden /> AI assistants are part of Pro and Agency
          </p>
          <p className="mt-1 text-[13px] text-ink-secondary">
            This workspace is on {planName}. Upgrade to add MyKavo to ChatGPT, Claude, Cursor and other assistants, and ask
            about every website you monitor in plain words.
          </p>
          <Link
            href="/dashboard/billing"
            className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover"
          >
            See plans
          </Link>
        </section>
        <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
          <h2 className="text-[15px] font-semibold text-ink">What you can ask</h2>
          <AskExamples endpoint={endpoint} />
        </section>
      </div>
    );
  }

  const shownKey = secret ?? "mk_live_YOUR_API_KEY";

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy("create");
    setError(null);
    const res = await fetch("/api/api-keys", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() || "My AI assistant" }),
    });
    const data = (await res.json().catch(() => ({}))) as { key?: ApiKeyView; secret?: string; error?: string };
    setBusy(null);
    if (!res.ok || !data.key || !data.secret) {
      setError(data.error ?? "Could not create the key. Try again.");
      return;
    }
    setKeys((k) => [{ ...data.key!, createdAt: String(data.key!.createdAt) }, ...k]);
    setSecret(data.secret);
    setName("");
  }

  async function revoke(k: ApiKeyView) {
    if (!window.confirm(`Revoke "${k.name}"? Assistants using it stop working immediately. This cannot be undone.`)) return;
    setBusy(k.id);
    setError(null);
    const res = await fetch(`/api/api-keys/${k.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      setError("Could not revoke that key. Try again.");
      return;
    }
    setKeys((all) => all.filter((x) => x.id !== k.id));
  }

  async function disconnect(c: ConnectionView) {
    if (!window.confirm(`Disconnect ${c.appName}? It loses access immediately. You can connect it again any time.`)) return;
    setBusy(c.id);
    setError(null);
    const res = await fetch(`/api/oauth/grants/${c.id}`, { method: "DELETE" });
    setBusy(null);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Could not disconnect it. Try again.");
      return;
    }
    setConnections((all) => all.filter((x) => x.id !== c.id));
  }

  const urlRow = (
    <span className="mt-1.5 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-surface px-2.5 py-1.5 font-mono text-[12px] text-ink">{endpoint}</code>
      <CopyButton text={endpoint} label="Copy URL" />
    </span>
  );

  return (
    <div className="space-y-6">
      {/* 1. Add */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <SectionTitle n={1}>Add MyKavo to your assistant</SectionTitle>
        <p className="mt-1 text-[13px] text-ink-secondary">
          No key needed for ChatGPT and Claude: you sign in to MyKavo and click Allow.
        </p>
        <div className="mt-4 flex flex-wrap gap-1.5" role="tablist" aria-label="AI assistant">
          {CLIENTS.map((c) => (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={client === c.id}
              onClick={() => setClient(c.id)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[13px] font-medium transition-colors",
                client === c.id ? "bg-ink text-ink-inverse" : "border border-line text-ink-secondary hover:text-ink",
              )}
            >
              {c.label}
            </button>
          ))}
        </div>

        {client === "chatgpt" && (
          <Steps
            items={[
              <>
                On the web, open{" "}
                <a href="https://chatgpt.com/plugins" target="_blank" rel="noreferrer" className="font-medium text-ink underline">
                  chatgpt.com/plugins
                </a>
                , select <span className="font-medium text-ink">+</span>, then{" "}
                <span className="font-medium text-ink">Add custom MCP server</span>.
              </>,
              <>
                Name it <span className="font-medium text-ink">MyKavo</span> and paste this as the Server URL:
                {urlRow}
              </>,
              <>
                Choose <span className="font-medium text-ink">OAuth</span> for authentication, accept the notice, then select{" "}
                <span className="font-medium text-ink">Create as a plugin</span>.
              </>,
              <>Sign in to MyKavo when asked and click Allow.</>,
              <>
                In any chat, type <span className="font-mono text-ink">@MyKavo</span> and ask a question.
              </>,
            ]}
          />
        )}

        {client === "claude" && (
          <>
            <Steps
              items={[
                <>
                  Open{" "}
                  <a href="https://claude.ai/customize/connectors" target="_blank" rel="noreferrer" className="font-medium text-ink underline">
                    Customize &gt; Connectors
                  </a>
                  , select <span className="font-medium text-ink">+ Add</span>, then{" "}
                  <span className="font-medium text-ink">Add custom connector</span>.
                </>,
                <>
                  Name it <span className="font-medium text-ink">MyKavo</span> and paste this URL, then Continue:
                  {urlRow}
                </>,
                <>Keep the sign-in settings Claude detects and click Add.</>,
                <>Click Connect, sign in to MyKavo and click Allow.</>,
              ]}
            />
            <p className="mt-3 text-[12px] text-ink-faint">
              On Claude Team or Enterprise, an owner adds it once in Organization settings &gt; Connectors (Add, Custom, Web);
              everyone then connects from Customize &gt; Connectors. It works in Claude on the web, desktop and mobile.
            </p>
          </>
        )}

        {client === "claude-code" && (
          <>
            <p className="mt-4 text-[13px] text-ink-secondary">Run in your terminal, then type /mcp in Claude Code to sign in:</p>
            <CodeBlock code={`claude mcp add --transport http mykavo ${endpoint}`} />
          </>
        )}

        {client === "other" && (
          <>
            <p className="mt-4 text-[13px] text-ink-secondary">
              Cursor, VS Code and most other MCP clients can sign in with OAuth from the URL alone. If yours can&apos;t, create
              an API key below and add it as a header, for example in ~/.cursor/mcp.json:
            </p>
            <CodeBlock
              code={JSON.stringify({ mcpServers: { mykavo: { url: endpoint, headers: { Authorization: `Bearer ${shownKey}` } } } }, null, 2)}
            />
          </>
        )}
      </section>

      {/* 2. Connected */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <SectionTitle n={2}>Connected assistants</SectionTitle>
        {usage && (
          <p className="mt-1 text-[13px] text-ink-secondary">
            {usage.today.toLocaleString("en-US")}
            {usage.dailyCap !== null ? ` of ${usage.dailyCap.toLocaleString("en-US")}` : ""} lookups today ·{" "}
            {usage.last30.toLocaleString("en-US")} in the last 30 days
          </p>
        )}
        {error && (
          <p className="mt-3 text-[13px] text-critical" role="alert">
            {error}
          </p>
        )}
        {connections.length === 0 ? (
          <p className="mt-3 text-[13px] text-ink-secondary">Nothing connected yet. Assistants you approve appear here.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line rounded-field border border-line">
            {connections.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <Plug className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.appName}</p>
                  <p className="text-xs text-ink-faint">
                    {c.mine ? "Connected by you" : `Connected by ${c.connectedBy}`} · {dateFmt.format(new Date(c.createdAt))} ·{" "}
                    {c.lastUsedAt ? `last used ${dateFmt.format(new Date(c.lastUsedAt))}` : "not used yet"}
                  </p>
                </div>
                {(c.mine || canManage) && (
                  <button
                    type="button"
                    onClick={() => disconnect(c)}
                    disabled={busy !== null}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-critical disabled:opacity-50"
                  >
                    {busy === c.id ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                    Disconnect
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 3. Ask */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <SectionTitle n={3}>Ask about your websites</SectionTitle>
        <AskExamples endpoint={endpoint} />
      </section>

      {/* API keys */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <KeyRound className="size-4" aria-hidden /> API keys
        </h2>
        <p className="mt-1 text-[13px] text-ink-secondary">
          Only for tools that can&apos;t sign in with OAuth, and for scripts. A key gives read-only access to this
          workspace. Keep it private, like a password.
        </p>

        {canManage ? (
          <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="key-name">
              Key name
            </label>
            <input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Name it, e.g. Cursor on my laptop"
              className="h-10 min-w-0 flex-1 basis-60 rounded-full border border-line bg-surface px-4 text-sm text-ink outline-none placeholder:text-ink-faint focus:border-accent"
            />
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex h-10 items-center gap-1.5 rounded-full bg-primary px-5 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-60"
            >
              {busy === "create" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Plus className="size-4" aria-hidden />}
              Create key
            </button>
          </form>
        ) : (
          <p className="mt-4 text-[13px] text-ink-secondary">Ask a workspace owner or admin to create a key.</p>
        )}

        {secret && (
          <div className="mt-4 rounded-field border border-success/40 bg-success-soft p-4">
            <p className="text-[13px] font-semibold text-success-strong">Copy your key now - it will not be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-card px-3 py-2 font-mono text-[12px] text-ink">{secret}</code>
              <CopyButton text={secret} />
            </div>
            <p className="mt-2 text-[12px] text-ink-secondary">It is already filled into the Cursor &amp; others setup above.</p>
          </div>
        )}

        {keys.length > 0 && (
          <ul className="mt-5 divide-y divide-line rounded-field border border-line">
            {keys.map((k) => (
              <li key={k.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <KeyRound className="size-4 shrink-0 text-ink-faint" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{k.name}</p>
                  <p className="text-xs text-ink-faint">
                    <span className="font-mono">{k.keyPrefix}…</span> · created {dateFmt.format(new Date(k.createdAt))} ·{" "}
                    {k.lastUsedAt ? `last used ${dateFmt.format(new Date(k.lastUsedAt))}` : "never used"}
                  </p>
                </div>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => revoke(k)}
                    disabled={busy !== null}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-critical disabled:opacity-50"
                  >
                    {busy === k.id ? <Loader2 className="size-3 animate-spin" aria-hidden /> : <Trash2 className="size-3.5" aria-hidden />}
                    Revoke
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
