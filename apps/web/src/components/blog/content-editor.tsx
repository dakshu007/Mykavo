"use client";

import { useState } from "react";
import { readingTimeMinutes } from "@/components/blog/blocks";
import { countWords } from "@/lib/blog-editor/markdown-roundtrip";
import { MarkdownEditor } from "@/components/blog/markdown-editor";
import { VisualEditor } from "@/components/blog/visual-editor";
import { cn } from "@/lib/utils";

/**
 * The post content card: WordPress-style Visual / Markdown tabs over the
 * same markdown value. Visual is the Tiptap editor; Markdown is the original
 * textarea + preview. Both edit the identical markdown string, so switching
 * tabs is lossless (the visual tab serializes to markdown on every edit).
 */

type ContentTab = "visual" | "markdown";

export function ContentEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const [tab, setTab] = useState<ContentTab>("visual");
  const words = countWords(value);
  const minutes = readingTimeMinutes(value);

  return (
    <div className="rounded-card bg-card p-6 shadow-card">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-ink">Content</p>
        <div
          role="tablist"
          aria-label="Content editor mode"
          className="flex rounded-full border border-line bg-surface p-0.5"
        >
          {(
            [
              ["visual", "Visual"],
              ["markdown", "Markdown"],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors",
                tab === key
                  ? "bg-card text-ink shadow-card"
                  : "text-ink-secondary hover:text-ink",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "visual" ? (
        <VisualEditor value={value} onChange={onChange} />
      ) : (
        <MarkdownEditor value={value} onChange={onChange} />
      )}

      <div className="mt-4 flex items-center gap-3 border-t border-line pt-3 text-[13px] text-ink-faint">
        <span>
          {words} {words === 1 ? "word" : "words"}
        </span>
        <span aria-hidden>·</span>
        <span>{minutes} min read</span>
      </div>
    </div>
  );
}
