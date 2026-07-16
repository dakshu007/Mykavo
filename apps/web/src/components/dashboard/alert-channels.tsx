"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Hash, MessagesSquare, Plus, Send, Trash2, Webhook } from "lucide-react";
import type { WebhookChannelType } from "@mykavo/shared";
import type { AlertChannelView } from "@/lib/notification-channels";
import { cn } from "@/lib/utils";

const TYPE_META: Record<
  WebhookChannelType,
  { label: string; hint: string; placeholder: string }
> = {
  SLACK: {
    label: "Slack",
    hint: "Create an incoming webhook in your Slack workspace and paste the URL.",
    placeholder: "https://hooks.slack.com/services/…",
  },
  DISCORD: {
    label: "Discord",
    hint: "Channel settings → Integrations → Webhooks → copy the webhook URL.",
    placeholder: "https://discord.com/api/webhooks/…",
  },
  WEBHOOK: {
    label: "Webhook",
    hint: "Any HTTPS endpoint - MyKavo POSTs JSON (optionally HMAC-signed).",
    placeholder: "https://example.com/hooks/mykavo",
  },
};

function TypeIcon({ type, className }: { type: WebhookChannelType; className?: string }) {
  if (type === "SLACK") return <Hash className={className} aria-hidden />;
  if (type === "DISCORD") return <MessagesSquare className={className} aria-hidden />;
  return <Webhook className={className} aria-hidden />;
}

export function AlertChannels({ initial }: { initial: AlertChannelView[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [type, setType] = useState<WebhookChannelType>("SLACK");
  const [url, setUrl] = useState("");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function call(path: string, init: RequestInit, okNotice?: string) {
    setError(null);
    setNotice(null);
    const res = await fetch(path, init);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      setError(body?.error ?? "Something went wrong. Try again.");
      return false;
    }
    if (okNotice) setNotice(okNotice);
    router.refresh();
    return true;
  }

  async function addChannel(e: React.FormEvent) {
    e.preventDefault();
    setBusy("add");
    const ok = await call(
      "/api/notifications/channels",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          type,
          url: url.trim(),
          ...(type === "WEBHOOK" && secret.trim() ? { secret: secret.trim() } : {}),
        }),
      },
      `${TYPE_META[type].label} channel added.`,
    );
    if (ok) {
      setUrl("");
      setSecret("");
      setAdding(false);
    }
    setBusy(null);
  }

  return (
    <div className="space-y-4">
      {initial.length === 0 && !adding && (
        <p className="text-sm text-ink-secondary">
          Get change summaries and failure alerts in Slack, Discord, or any webhook -
          instantly, alongside email.
        </p>
      )}

      {initial.length > 0 && (
        <ul className="divide-y divide-line rounded-field border border-line">
          {initial.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <TypeIcon type={c.type} className="size-4.5 shrink-0 text-ink-secondary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink">{TYPE_META[c.type].label}</p>
                <p className="truncate font-mono text-xs text-ink-faint">{c.maskedUrl}</p>
              </div>
              {!c.enabled && (
                <span className="rounded-full bg-surface px-2.5 py-1 text-[11px] font-semibold text-ink-faint">
                  Disabled
                </span>
              )}
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={async () => {
                    setBusy(`test:${c.id}`);
                    await call(
                      `/api/notifications/channels/${c.id}/test`,
                      { method: "POST" },
                      `Test message sent to ${TYPE_META[c.type].label}.`,
                    );
                    setBusy(null);
                  }}
                  disabled={busy !== null || !c.enabled}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
                >
                  <Send className="size-3" aria-hidden />
                  {busy === `test:${c.id}` ? "Sending…" : "Send test"}
                </button>
                <button
                  onClick={async () => {
                    setBusy(`toggle:${c.id}`);
                    await call(`/api/notifications/channels/${c.id}`, {
                      method: "PATCH",
                      headers: { "content-type": "application/json" },
                      body: JSON.stringify({ enabled: !c.enabled }),
                    });
                    setBusy(null);
                  }}
                  disabled={busy !== null}
                  className="inline-flex h-8 items-center rounded-full border border-line px-3 text-[12px] font-medium text-ink-secondary transition-colors hover:text-ink disabled:opacity-50"
                >
                  {c.enabled ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={async () => {
                    if (!confirm(`Remove this ${TYPE_META[c.type].label} channel?`)) return;
                    setBusy(`del:${c.id}`);
                    await call(`/api/notifications/channels/${c.id}`, { method: "DELETE" });
                    setBusy(null);
                  }}
                  disabled={busy !== null}
                  aria-label={`Delete ${TYPE_META[c.type].label} channel`}
                  className="inline-flex size-8 items-center justify-center rounded-full border border-line text-ink-faint transition-colors hover:text-critical disabled:opacity-50"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {adding ? (
        <form onSubmit={addChannel} className="space-y-3 rounded-field border border-line p-4">
          <div className="flex gap-2">
            {(Object.keys(TYPE_META) as WebhookChannelType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border px-4 text-[13px] font-medium transition-colors",
                  type === t
                    ? "border-primary bg-primary-soft text-primary"
                    : "border-line text-ink-secondary hover:text-ink",
                )}
              >
                <TypeIcon type={t} className="size-3.5" />
                {TYPE_META[t].label}
              </button>
            ))}
          </div>
          <div>
            <label htmlFor="channel-url" className="mb-1.5 block text-sm font-medium text-ink">
              Webhook URL
            </label>
            <input
              id="channel-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={TYPE_META[type].placeholder}
              className="w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
            />
            <p className="mt-1.5 text-[13px] text-ink-faint">{TYPE_META[type].hint}</p>
          </div>
          {type === "WEBHOOK" && (
            <div>
              <label htmlFor="channel-secret" className="mb-1.5 block text-sm font-medium text-ink">
                Signing secret <span className="font-normal text-ink-faint">(optional)</span>
              </label>
              <input
                id="channel-secret"
                type="text"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="Used for the X-MyKavo-Signature HMAC header"
                className="w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
              />
            </div>
          )}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={busy !== null}
              className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-[13px] font-medium text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50"
            >
              {busy === "add" ? "Adding…" : "Add channel"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError(null);
              }}
              className="text-[13px] font-medium text-ink-secondary hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-line px-5 text-[13px] font-medium text-ink-secondary transition-colors hover:text-ink"
        >
          <Plus className="size-4" aria-hidden /> Add channel
        </button>
      )}

      {error && <p className="text-sm text-critical">{error}</p>}
      {notice && <p className="text-sm text-success">{notice}</p>}
    </div>
  );
}
