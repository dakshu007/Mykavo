"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { MAX_TAGS_PER_WEBSITE, validateNewTag } from "@/lib/tags";

/**
 * Inline tag editor for the website detail page: current tags as removable
 * chips plus an "Add tag" input (Enter to add). Client validation mirrors
 * the server rules (lowercase [a-z0-9-], ≤20 chars, max 5); each add/remove
 * persists immediately through the website PATCH route, which re-normalizes.
 */
export function TagEditor({
  websiteId,
  initialTags,
}: {
  websiteId: string;
  initialTags: string[];
}) {
  const router = useRouter();
  const [tags, setTags] = useState(initialTags);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function persist(next: string[]) {
    const previous = tags;
    setTags(next);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/websites/${websiteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tags: next }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setTags(previous);
      setError("Could not save tags. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function addDraft() {
    const result = validateNewTag(draft, tags);
    if (result.error !== undefined) {
      setError(result.error);
      return;
    }
    setDraft("");
    void persist([...tags, result.tag]);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-primary-soft py-0.5 pl-2.5 pr-1 text-[12px] font-medium text-primary"
          >
            {tag}
            <button
              type="button"
              onClick={() => void persist(tags.filter((t) => t !== tag))}
              disabled={busy}
              aria-label={`Remove tag ${tag}`}
              className="rounded-full p-0.5 transition-colors hover:bg-primary hover:text-primary-contrast disabled:opacity-60"
            >
              <X className="size-3" aria-hidden />
            </button>
          </span>
        ))}
        {tags.length < MAX_TAGS_PER_WEBSITE && (
          <input
            type="text"
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addDraft();
              }
            }}
            disabled={busy}
            placeholder={tags.length === 0 ? "Add tag — e.g. acme-corp" : "Add tag"}
            maxLength={40}
            aria-label="Add tag"
            className="h-7 w-44 rounded-full border border-line bg-card px-3 text-[12px] text-ink placeholder:text-ink-faint focus:border-primary focus:outline-none disabled:opacity-60"
          />
        )}
        {busy && <Loader2 className="size-3.5 animate-spin text-ink-faint" aria-hidden />}
      </div>
      {error ? (
        <p className="text-[13px] text-critical-strong" role="alert">
          {error}
        </p>
      ) : (
        <p className="text-[13px] text-ink-faint">
          Label this site by client or team, then filter the websites list.
          Press Enter to add — up to {MAX_TAGS_PER_WEBSITE} lowercase tags.
        </p>
      )}
    </div>
  );
}
