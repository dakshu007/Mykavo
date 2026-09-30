"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, Loader2, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ApiKeyView {
  id: string;
  name: string;
  keyPrefix: string;
  createdAt: string;
  lastUsedAt: string | null;
}

type Client = "claude-code" | "claude-desktop" | "cursor" | "other";

const CLIENTS: Array<{ id: Client; label: string; where: string }> = [
  { id: "claude-code", label: "Claude Code", where: "Run in your terminal:" },
  { id: "claude-desktop", label: "Claude Desktop", where: "Settings → Developer → Edit Config, add to claude_desktop_config.json, then restart Claude:" },
  { id: "cursor", label: "Cursor", where: "Add to ~/.cursor/mcp.json (or Settings → MCP → Add server):" },
  { id: "other", label: "Other", where: "Any MCP client that speaks Streamable HTTP:" },
];

function snippet(client: Client, endpoint: string, key: string): string {
  switch (client) {
    case "claude-code":
      return `claude mcp add --transport http mykavo ${endpoint} --header "Authorization: Bearer ${key}"`;
    case "claude-desktop":
      return JSON.stringify(
        { mcpServers: { mykavo: { command: "npx", args: ["-y", "mcp-remote", endpoint, "--header", `Authorization: Bearer ${key}`] } } },
        null,
        2,
      );
    case "cursor":
      return JSON.stringify({ mcpServers: { mykavo: { url: endpoint, headers: { Authorization: `Bearer ${key}` } } } }, null, 2);
    default:
      return `URL:     ${endpoint}\nHeader:  Authorization: Bearer ${key}\nTransport: Streamable HTTP (POST, JSON-RPC)`;
  }
}

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

const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });

export function McpPanel({
  endpoint,
  initialKeys,
  canManage,
  notReady,
}: {
  endpoint: string;
  initialKeys: ApiKeyView[];
  canManage: boolean;
  notReady: string | null;
}) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(notReady);
  const [secret, setSecret] = useState<string | null>(null);
  const [client, setClient] = useState<Client>("claude-code");

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

  const active = CLIENTS.find((c) => c.id === client)!;
  const code = snippet(client, endpoint, shownKey);

  return (
    <div className="space-y-6">
      {/* 1. Key */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-contrast">1</span>
          Create an API key
        </h2>
        <p className="mt-1 text-[13px] text-ink-secondary">
          The key gives read-only access to this workspace&apos;s websites, changes, scans and audits. Keep it private, like a password.
        </p>

        {canManage ? (
          <form onSubmit={create} className="mt-4 flex flex-wrap gap-2">
            <label className="sr-only" htmlFor="key-name">Key name</label>
            <input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              placeholder="Name it, e.g. Claude on my laptop"
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

        {error && <p className="mt-3 text-[13px] text-critical" role="alert">{error}</p>}

        {secret && (
          <div className="mt-4 rounded-field border border-success/40 bg-success-soft p-4">
            <p className="text-[13px] font-semibold text-success-strong">Copy your key now - it will not be shown again.</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md bg-card px-3 py-2 font-mono text-[12px] text-ink">{secret}</code>
              <CopyButton text={secret} />
            </div>
            <p className="mt-2 text-[12px] text-ink-secondary">It is already filled into the setup below.</p>
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

      {/* 2. Connect */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-contrast">2</span>
          Connect your assistant
        </h2>
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
        <p className="mt-4 text-[13px] text-ink-secondary">{active.where}</p>
        <div className="relative mt-2">
          <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all rounded-field bg-[#0f1115] p-4 pr-24 font-mono text-[12px] leading-5 text-[#e8e6dc]">
            {code}
          </pre>
          <div className="absolute right-2 top-2 [&_button]:border-white/15 [&_button]:bg-white/5 [&_button]:text-white/80">
            <CopyButton text={code} />
          </div>
        </div>
        {!secret && (
          <p className="mt-2 text-[12px] text-ink-faint">Replace mk_live_YOUR_API_KEY with your key - or create one above and it is filled in for you.</p>
        )}
      </section>

      {/* 3. Ask */}
      <section className="rounded-card bg-card p-5 shadow-card sm:p-6">
        <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span className="inline-flex size-6 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-contrast">3</span>
          Ask about your websites
        </h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            "Is anything wrong with my websites right now?",
            "What changed on my sites this week?",
            "Show the critical changes on example.com and what caused them.",
            "Summarise the latest site audit for example.com - what should I fix first?",
            "Which AI crawlers read example.com this month?",
            "Is any site blocking ChatGPT or Claude in robots.txt?",
          ].map((q) => (
            <li key={q} className="rounded-tile bg-surface px-3.5 py-2.5 text-[13px] text-ink">
              &ldquo;{q}&rdquo;
            </li>
          ))}
        </ul>
        <p className="mt-4 text-[12px] text-ink-faint">
          Read-only: assistants can look, never change settings, approve changes or start scans. Endpoint: <span className="font-mono">{endpoint}</span>
        </p>
      </section>
    </div>
  );
}
