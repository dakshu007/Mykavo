"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MessageSquarePlus, Trash2 } from "lucide-react";

/**
 * Client half of the change-notes thread: the composer and the per-note
 * delete button. The note list itself is server-rendered on the change
 * detail page.
 */

export function ChangeNoteForm({ changeId }: { changeId: string }) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = body.trim();
    if (busy || !trimmed) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/changes/${changeId}/notes`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not add the note.");
      }
      setBody("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the note.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-4 space-y-2">
      <label htmlFor={`note-${changeId}`} className="sr-only">
        Add a note
      </label>
      <textarea
        id={`note-${changeId}`}
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        placeholder="Leave a note for your team — context, root cause, next steps…"
        className="w-full rounded-field border border-line bg-card px-4 py-3 text-[15px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none"
      />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={busy || body.trim().length === 0}
          className="inline-flex h-10 items-center gap-1.5 rounded-full bg-ink px-4 text-[13px] font-medium text-white transition-colors hover:bg-ink/90 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            <MessageSquarePlus className="size-3.5" aria-hidden />
          )}
          Add note
        </button>
        {error && (
          <p className="text-[13px] text-red-700" role="alert">
            {error}
          </p>
        )}
      </div>
    </form>
  );
}

export function ChangeNoteDeleteButton({
  changeId,
  noteId,
}: {
  changeId: string;
  noteId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (busy) return;
    if (!window.confirm("Delete this note?")) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/changes/${changeId}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={remove}
      disabled={busy}
      aria-label="Delete note"
      title="Delete note"
      className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-ink-faint transition-colors hover:bg-surface hover:text-red-700 disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : (
        <Trash2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
