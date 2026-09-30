"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

/** Version (and, for the app, what's new) + Send, for one product. */
export function UpdateSendForm({
  product,
  defaultVersion,
  waiting,
  withNotes,
  disabled,
}: {
  product: "wordpress-plugin" | "android-app";
  defaultVersion: string;
  waiting: number;
  withNotes: boolean;
  disabled: boolean;
}) {
  const router = useRouter();
  const [version, setVersion] = useState(defaultVersion);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!window.confirm(`Email everyone on an older version that ${version} is out? Each person gets it once.`)) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/product-updates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ product, version: version.trim(), notes: withNotes ? notes : undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setMessage({ ok: false, text: data.error ?? "Could not queue the emails." });
        return;
      }
      setMessage({ ok: true, text: "Queued. The worker sends them within 10 minutes." });
      router.refresh();
    } catch {
      setMessage({ ok: false, text: "Network error - try again." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={send} className="mt-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="sr-only" htmlFor={`v-${product}`}>
          Version
        </label>
        <input
          id={`v-${product}`}
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          pattern="\d{1,3}(\.\d{1,4}){1,3}"
          required
          className="h-9 w-28 rounded-full border border-line bg-surface px-3.5 font-mono text-[13px] text-ink outline-none focus:border-accent"
        />
        <button
          type="submit"
          disabled={busy || disabled}
          className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-4 text-[13px] font-semibold text-primary-contrast transition-colors hover:bg-primary-hover disabled:opacity-50"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : <Send className="size-3.5" aria-hidden />}
          {waiting > 0 ? `Send to ${waiting} ${waiting === 1 ? "person" : "people"}` : "Send"}
        </button>
      </div>
      {withNotes && (
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={1600}
          placeholder={"What's new, one line each (optional)"}
          className="w-full rounded-field border border-line bg-surface px-3.5 py-2 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-accent"
        />
      )}
      {message && (
        <p className={`text-[12px] ${message.ok ? "text-success-strong" : "text-critical-strong"}`} role="status">
          {message.text}
        </p>
      )}
    </form>
  );
}
